from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import Coupon, DiscountType, Product

def validate_and_compute_discount(
    db: Session,
    subtotal: float,
    coupon_code: Optional[str]
) -> Tuple[float, Optional[str], Optional[Coupon]]:
    """
    Validates coupon existence, active status, expiration timestamp, and minimum order value.
    Returns (discount_amount, normalized_code, coupon_obj).
    """
    if not coupon_code or not coupon_code.strip():
        return 0.0, None, None

    clean_code = coupon_code.strip().upper()
    coupon = (
        db.query(Coupon)
        .filter(Coupon.code == clean_code, Coupon.is_active == 1)
        .first()
    )
    if not coupon:
        raise HTTPException(status_code=400, detail=f"Coupon '{clean_code}' is invalid.")

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    if coupon.expires_at < now_utc:
        raise HTTPException(status_code=400, detail=f"Coupon '{clean_code}' has expired.")

    if subtotal < coupon.min_order_value:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Coupon '{clean_code}' requires a minimum subtotal of "
                f"${coupon.min_order_value:.2f} (current subtotal: ${subtotal:.2f})."
            ),
        )

    if coupon.discount_type == DiscountType.PERCENTAGE:
        discount = round(subtotal * (coupon.discount_value / 100.0), 2)
    else:
        discount = round(min(coupon.discount_value, subtotal), 2)

    return discount, clean_code, coupon

def calculate_order_totals(
    db: Session,
    items: List[dict],
    coupon_code: Optional[str]
) -> Tuple[float, float, float, Optional[str]]:
    """
    Re-queries product prices strictly from the database.
    Never trusts prices or totals supplied by the client browser.
    """
    if not items:
        raise HTTPException(status_code=400, detail="Cannot calculate totals for an empty item list.")

    product_ids = [item["product_id"] for item in items]
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    product_map: Dict[int, Product] = {p.id: p for p in products}

    subtotal = 0.0
    for item in items:
        pid = item["product_id"]
        qty = item["quantity"]
        if qty <= 0:
            raise HTTPException(status_code=400, detail="Item quantity must be greater than zero.")
        product = product_map.get(pid)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product ID {pid} does not exist.")
        subtotal += product.price * qty

    subtotal = round(subtotal, 2)
    discount, validated_code, _ = validate_and_compute_discount(db, subtotal, coupon_code)
    total = max(0.0, round(subtotal - discount, 2))

    return subtotal, discount, total, validated_code
