from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from app.models import Coupon, DiscountType, Product, User

def test_1_concurrency_last_item_race_condition(test_db_setup):
    """
    CRITICAL REQUIREMENT 1:
    When two customers simultaneously attempt to buy the very last unit in stock (stock=1),
    exactly ONE order succeeds (HTTP 200), ONE fails gracefully (HTTP 400),
    and product stock becomes strictly 0 (never negative).
    """
    client, db, SessionFactory = test_db_setup

    u1 = User(id=10, email="buyer1@krono.io", name="Buyer One", role="customer")
    u2 = User(id=20, email="buyer2@krono.io", name="Buyer Two", role="customer")
    scarce_item = Product(
        id=99,
        name="Limited Edition Synthesizer",
        description="Only 1 unit left",
        category="Audio",
        price=500.00,
        stock=1,
        image_url="https://example.com/synth.jpg",
    )
    db.add_all([u1, u2, scarce_item])
    db.commit()

    def attempt_buy(uid: int):
        return client.post(
            "/api/orders/checkout",
            json={
                "user_id": uid,
                "items": [{"product_id": 99, "quantity": 1}],
                "shipping_address": "100 Concurrency Lane",
            },
        )

    with ThreadPoolExecutor(max_workers=2) as pool:
        f1 = pool.submit(attempt_buy, 10)
        f2 = pool.submit(attempt_buy, 20)
        responses = [f1.result(), f2.result()]

    codes = sorted([r.status_code for r in responses])
    assert codes == [200, 400], f"Expected one 200 and one 400, got {codes}"

    verify_session = SessionFactory()
    try:
        updated_product = verify_session.query(Product).filter(Product.id == 99).first()
        assert updated_product.stock == 0, f"Stock went negative or invalid: {updated_product.stock}"
    finally:
        verify_session.close()


def test_2_zero_or_insufficient_stock_rejected(test_db_setup):
    """Attempting to purchase an out-of-stock item fails gracefully with HTTP 400."""
    client, db, _ = test_db_setup

    user = User(id=1, email="alex@krono.io", name="Alex", role="customer")
    sold_out = Product(
        id=50,
        name="Sold Out Dock",
        description="Zero stock",
        category="Workspace",
        price=45.00,
        stock=0,
        image_url="https://example.com/dock.jpg",
    )
    db.add_all([user, sold_out])
    db.commit()

    res = client.post(
        "/api/orders/checkout",
        json={"user_id": 1, "items": [{"product_id": 50, "quantity": 1}]},
    )
    assert res.status_code == 400
    assert "Insufficient stock" in res.json()["detail"]


def test_3_server_authoritative_pricing_and_percentage_discount(test_db_setup):
    """
    CRITICAL REQUIREMENT 2:
    Totals and discounts are calculated strictly on the server from DB product prices.
    """
    client, db, _ = test_db_setup

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    user = User(id=1, email="alex@krono.io", name="Alex", role="customer")
    p1 = Product(id=1, name="Keyboard", description="Desc", category="Keyboards", price=200.00, stock=5, image_url="https://example.com/1.jpg")
    p2 = Product(id=2, name="Mouse", description="Desc", category="Accessories", price=100.00, stock=5, image_url="https://example.com/2.jpg")
    coupon = Coupon(
        code="SAVE15",
        discount_type=DiscountType.PERCENTAGE,
        discount_value=15.0,
        min_order_value=250.00,
        expires_at=now + timedelta(days=10),
        is_active=1,
    )
    db.add_all([user, p1, p2, coupon])
    db.commit()

    res = client.post(
        "/api/orders/checkout",
        json={
            "user_id": 1,
            "items": [
                {"product_id": 1, "quantity": 1},
                {"product_id": 2, "quantity": 1},
            ],
            "coupon_code": "save15",  # Case-insensitive handling check
        },
    )
    assert res.status_code == 200
    order = res.json()
    assert order["subtotal"] == 300.00
    assert order["discount"] == 45.00
    assert order["total"] == 255.00
    assert order["coupon_code"] == "SAVE15"


def test_4_coupon_expiry_and_minimum_order_value_enforcement(test_db_setup):
    """Rejects expired coupons and orders below the coupon's minimum order value."""
    client, db, _ = test_db_setup

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    user = User(id=1, email="alex@krono.io", name="Alex", role="customer")
    prod = Product(id=1, name="Desk Mat", description="Desc", category="Workspace", price=50.00, stock=10, image_url="https://example.com/mat.jpg")
    expired = Coupon(
        code="OLD50",
        discount_type=DiscountType.FLAT,
        discount_value=10.0,
        min_order_value=20.0,
        expires_at=now - timedelta(days=1),
        is_active=1,
    )
    high_min = Coupon(
        code="VIP100",
        discount_type=DiscountType.FLAT,
        discount_value=30.0,
        min_order_value=200.0,
        expires_at=now + timedelta(days=5),
        is_active=1,
    )
    db.add_all([user, prod, expired, high_min])
    db.commit()

    res_exp = client.post(
        "/api/orders/checkout",
        json={"user_id": 1, "items": [{"product_id": 1, "quantity": 1}], "coupon_code": "OLD50"},
    )
    assert res_exp.status_code == 400
    assert "expired" in res_exp.json()["detail"].lower()

    res_min = client.post(
        "/api/orders/checkout",
        json={"user_id": 1, "items": [{"product_id": 1, "quantity": 1}], "coupon_code": "VIP100"},
    )
    assert res_min.status_code == 400
    assert "minimum subtotal" in res_min.json()["detail"].lower()


def test_5_admin_order_status_lifecycle_transitions(test_db_setup):
    """Verifies Placed -> Shipped -> Delivered state transitions and blocks illegal jumps."""
    client, db, _ = test_db_setup

    user = User(id=1, email="alex@krono.io", name="Alex", role="customer")
    prod = Product(id=1, name="Cable", description="Desc", category="Workspace", price=30.00, stock=5, image_url="https://example.com/c.jpg")
    db.add_all([user, prod])
    db.commit()

    order_res = client.post(
        "/api/orders/checkout",
        json={"user_id": 1, "items": [{"product_id": 1, "quantity": 1}]},
    )
    order_id = order_res.json()["id"]
    assert order_res.json()["status"] == "Placed"

    # Illegal direct jump Placed -> Delivered must fail
    bad_jump = client.patch(f"/api/admin/orders/{order_id}/status", json={"status": "Delivered"})
    assert bad_jump.status_code == 400

    # Valid transition Placed -> Shipped
    ship_res = client.patch(f"/api/admin/orders/{order_id}/status", json={"status": "Shipped"})
    assert ship_res.status_code == 200
    assert ship_res.json()["status"] == "Shipped"

    # Valid transition Shipped -> Delivered
    deliv_res = client.patch(f"/api/admin/orders/{order_id}/status", json={"status": "Delivered"})
    assert deliv_res.status_code == 200
    assert deliv_res.json()["status"] == "Delivered"


def test_6_verified_buyer_review_protection(test_db_setup):
    """Stretch Goal Test: Only customers who purchased the product can submit a review."""
    client, db, _ = test_db_setup

    buyer = User(id=1, email="buyer@krono.io", name="Buyer", role="customer")
    non_buyer = User(id=2, email="random@krono.io", name="Random", role="customer")
    prod = Product(id=1, name="DAC", description="Desc", category="Audio", price=150.00, stock=5, image_url="https://example.com/dac.jpg")
    db.add_all([buyer, non_buyer, prod])
    db.commit()

    # Non-buyer attempt -> 403 Forbidden
    unverified_res = client.post(
        "/api/products/1/reviews",
        json={"user_id": 2, "rating": 5, "comment": "I never bought this!"},
    )
    assert unverified_res.status_code == 403

    # Buyer completes checkout then posts review -> 200 OK
    client.post("/api/orders/checkout", json={"user_id": 1, "items": [{"product_id": 1, "quantity": 1}]})
    verified_res = client.post(
        "/api/products/1/reviews",
        json={"user_id": 1, "rating": 5, "comment": "Crystal clear soundstage."},
    )
    assert verified_res.status_code == 200
    assert verified_res.json()["rating"] == 5
