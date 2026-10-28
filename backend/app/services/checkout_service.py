from typing import Dict, List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.database import checkout_lock
from app.models import CartItem, Order, OrderItem, Product, User
from app.services.pricing_service import calculate_order_totals

def process_checkout(
    db: Session,
    user_id: int,
    explicit_items: Optional[List[dict]],
    coupon_code: Optional[str],
    shipping_address: str = "742 Evergreen Terrace, Suite 200"
) -> Order:
    """
    Concurrency-safe order execution:
    1. Acquires row-level lock (.with_for_update()) on requested Product rows sorted by ID.
    2. Verifies stock sufficiency; raises 400 immediately if stock < requested quantity.
    3. Deducts stock atomically and computes authoritative server-side totals & coupon discounts.
    4. Creates Order + OrderItems and clears the user's persistent cart in a single commit.
    """
    with checkout_lock:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User account not found.")

        # Determine items from explicit payload or fallback to user's saved database cart
        if explicit_items is not None and len(explicit_items) > 0:
            raw_items = explicit_items
        else:
            cart_rows = db.query(CartItem).filter(CartItem.user_id == user_id).all()
            if not cart_rows:
                raise HTTPException(status_code=400, detail="Your cart is empty.")
            raw_items = [{"product_id": c.product_id, "quantity": c.quantity} for c in cart_rows]

        # Consolidate duplicate product_ids if present
        merged_quantities: Dict[int, int] = {}
        for entry in raw_items:
            pid = int(entry["product_id"])
            qty = int(entry["quantity"])
            if qty <= 0:
                raise HTTPException(status_code=400, detail="Quantity must be at least 1.")
            merged_quantities[pid] = merged_quantities.get(pid, 0) + qty

        normalized_items = [
            {"product_id": pid, "quantity": qty}
            for pid, qty in sorted(merged_quantities.items(), key=lambda x: x[0])
        ]

        try:
            locked_products: Dict[int, Product] = {}
            for item in normalized_items:
                product = (
                    db.query(Product)
                    .filter(Product.id == item["product_id"])
                    .with_for_update()
                    .first()
                )
                if not product:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Product ID {item['product_id']} was not found."
                    )
                if product.stock < item["quantity"]:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Insufficient stock for '{product.name}'. "
                            f"Available: {product.stock}, Requested: {item['quantity']}."
                        ),
                    )
                locked_products[product.id] = product

            # Server-authoritative subtotal, coupon verification, and final total calculation
            subtotal, discount, total, validated_coupon = calculate_order_totals(
                db, normalized_items, coupon_code
            )

            # Deduct inventory strictly while holding locks
            for item in normalized_items:
                prod = locked_products[item["product_id"]]
                prod.stock -= item["quantity"]

            new_order = Order(
                user_id=user_id,
                subtotal=subtotal,
                discount=discount,
                total=total,
                coupon_code=validated_coupon,
                shipping_address=shipping_address.strip() if shipping_address else "742 Evergreen Terrace, Suite 200",
            )
            db.add(new_order)
            db.flush()

            for item in normalized_items:
                prod = locked_products[item["product_id"]]
                db.add(
                    OrderItem(
                        order_id=new_order.id,
                        product_id=prod.id,
                        quantity=item["quantity"],
                        unit_price=prod.price,
                    )
                )

            # Clear persistent cart for user
            db.query(CartItem).filter(CartItem.user_id == user_id).delete()

            db.commit()
            db.refresh(new_order)
            return new_order

        except HTTPException:
            db.rollback()
            raise
        except Exception as exc:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Checkout transaction failed: {str(exc)}")
