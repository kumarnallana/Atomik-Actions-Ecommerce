from datetime import datetime, timedelta, timezone
from app.database import Base, SessionLocal, SqliteSessionLocal, engine, sqlite_engine
from app.models import (
    Coupon,
    DiscountType,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    Review,
    User,
)

def _seed_session(db, force_reset: bool = False):
    try:
        if not force_reset and db.query(Product).count() > 0:
            return

        # 1. Seed Demo Users
        u_customer1 = User(id=1, email="alex.rivera@krono.io", name="Alex Rivera", role="customer")
        u_customer2 = User(id=2, email="maya.lin@krono.io", name="Maya Lin", role="customer")
        u_admin = User(id=3, email="admin@krono.io", name="Sasi Kumar (Admin)", role="admin")
        db.add_all([u_customer1, u_customer2, u_admin])
        db.flush()

        # 2. Seed Curated Hardware & Workspace Products
        products = [
            Product(
                id=1,
                name="Krono K1 Machined Aluminum Keyboard",
                description="CNC-milled 6063 aluminum chassis, gasket mount, hot-swappable tactile switches, and QMK/VIA wireless firmware.",
                category="Keyboards",
                price=240.00,
                stock=8,
                image_url="https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=900&q=80",
            ),
            Product(
                id=2,
                name="Aether Carbon Ultralight Mouse",
                description="49g magnesium-carbon shell with 26,000 DPI optical sensor, optical microswitches, and 4KHz wireless polling dongle.",
                category="Accessories",
                price=135.00,
                stock=14,
                image_url="https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=900&q=80",
            ),
            Product(
                id=3,
                name="Studio Reference Planar Headphones",
                description="Open-back planar magnetic drivers with lambskin memory foam earpads and detachable balanced braided cable.",
                category="Audio",
                price=320.00,
                stock=2,  # Triggers Low-Stock Alert (<= 3)
                image_url="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
            ),
            Product(
                id=4,
                name="Monolith Matte Wool Desk Mat",
                description="4mm dense Australian merino wool felt with anti-fray stitched edges and natural latex non-slip base.",
                category="Workspace",
                price=48.00,
                stock=22,
                image_url="https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=900&q=80",
            ),
            Product(
                id=5,
                name="Lumen CRI-98 Cantilever Lightbar",
                description="Asymmetric optical glass projection eliminates screen glare while illuminating your desk with stepless rotary dimming.",
                category="Lighting",
                price=110.00,
                stock=1,  # Triggers Low-Stock Alert & great for testing last-item concurrency
                image_url="https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80",
            ),
            Product(
                id=6,
                name="DAC-01 Balanced Desktop Amplifier",
                description="Dual ESS Sabre DAC architecture with discrete Class-A headphone amplification and CNC knurled volume attenuator.",
                category="Audio",
                price=195.00,
                stock=6,
                image_url="https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80",
            ),
            Product(
                id=7,
                name="Orbit Modular Magnetic Cable Dock",
                description="Weighted anodized steel anchor with three magnetic Neodymium collars to keep USB-C and Thunderbolt cables organized.",
                category="Workspace",
                price=34.00,
                stock=0,  # Out-of-stock item for immediate UI state verification
                image_url="https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80",
            ),
            Product(
                id=8,
                name="Keycap Set: Industrial PBT Dolch",
                description="1.6mm thick dye-sublimated PBT keycaps in classic charcoal and slate legends. Cherry profile, 142 keys included.",
                category="Keyboards",
                price=75.00,
                stock=11,
                image_url="https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80",
            ),
        ]
        db.add_all(products)
        db.flush()

        # 3. Seed Coupons (Percentage, Flat, and Expired for validation testing)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        coupons = [
            Coupon(
                code="KRONO10",
                discount_type=DiscountType.PERCENTAGE,
                discount_value=10.0,
                min_order_value=50.0,
                expires_at=now + timedelta(days=60),
                is_active=1,
            ),
            Coupon(
                code="STUDIO40",
                discount_type=DiscountType.FLAT,
                discount_value=40.0,
                min_order_value=200.0,
                expires_at=now + timedelta(days=30),
                is_active=1,
            ),
            Coupon(
                code="EXPIRED25",
                discount_type=DiscountType.PERCENTAGE,
                discount_value=25.0,
                min_order_value=20.0,
                expires_at=now - timedelta(days=5),
                is_active=1,
            ),
        ]
        db.add_all(coupons)
        db.flush()

        # 4. Seed 1 Sample Historical Order & Verified Buyer Review for Alex Rivera
        sample_order = Order(
            user_id=u_customer1.id,
            subtotal=240.00,
            discount=24.00,
            total=216.00,
            coupon_code="KRONO10",
            shipping_address="420 Tech Park Avenue, Suite 12B",
            status=OrderStatus.DELIVERED,
            created_at=now - timedelta(days=3),
        )
        db.add(sample_order)
        db.flush()

        db.add(
            OrderItem(
                order_id=sample_order.id,
                product_id=1,
                quantity=1,
                unit_price=240.00,
            )
        )

        db.add(
            Review(
                product_id=1,
                user_id=u_customer1.id,
                rating=5,
                comment="The CNC machining tolerance and acoustic profile on the K1 are unmatched. Zero case ping right out of the box.",
            )
        )

        db.commit()
    except Exception as exc:
        db.rollback()
        raise exc
    finally:
        db.close()

def seed_database(force_reset: bool = False):
    # 1. Seed primary database
    try:
        if force_reset:
            Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        _seed_session(SessionLocal(), force_reset=force_reset)
        print("Primary database seeded successfully.")
    except Exception as exc:
        print(f"Could not seed primary database ({exc}).")

    # 2. Seed fallback SQLite database
    try:
        Base.metadata.create_all(bind=sqlite_engine)
        _seed_session(SqliteSessionLocal(), force_reset=force_reset)
        print("Fallback SQLite database seeded and verified.")
    except Exception as exc:
        print(f"Could not seed SQLite fallback database ({exc}).")

if __name__ == "__main__":
    seed_database(force_reset=False)
