from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import CartItem, Coupon
from app.schemas import CouponInfoOut, CouponOut, CouponValidateRequest
from app.services.pricing_service import validate_and_compute_discount

router = APIRouter(prefix="/api/coupons", tags=["coupons"])

@router.get("", response_model=List[CouponInfoOut])
def list_active_coupons(db: Session = Depends(get_db)):
    """Returns currently active promotional codes for storefront banner discovery."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    return (
        db.query(Coupon)
        .filter(Coupon.is_active == 1, Coupon.expires_at > now)
        .order_by(Coupon.min_order_value.asc())
        .all()
    )

@router.post("/validate", response_model=CouponOut)
def validate_coupon_code(payload: CouponValidateRequest, db: Session = Depends(get_db)):
    """
    Validates a coupon against either the user's server-side cart subtotal or a provided subtotal.
    All math happens strictly on the server.
    """
    computed_subtotal = 0.0
    if payload.user_id is not None:
        cart_items = db.query(CartItem).filter(CartItem.user_id == payload.user_id).all()
        if not cart_items and payload.subtotal is None:
            raise HTTPException(status_code=400, detail="Cart is empty.")
        if cart_items:
            computed_subtotal = round(
                sum(ci.product.price * ci.quantity for ci in cart_items), 2
            )
        elif payload.subtotal is not None:
            computed_subtotal = round(payload.subtotal, 2)
    elif payload.subtotal is not None:
        computed_subtotal = round(payload.subtotal, 2)
    else:
        raise HTTPException(status_code=400, detail="Provide user_id or subtotal for coupon validation.")

    discount_amount, clean_code, coupon = validate_and_compute_discount(
        db, computed_subtotal, payload.code
    )
    final_total = max(0.0, round(computed_subtotal - discount_amount, 2))

    return CouponOut(
        code=clean_code,
        discount_type=coupon.discount_type,
        discount_value=coupon.discount_value,
        min_order_value=coupon.min_order_value,
        discount_amount=discount_amount,
        subtotal=computed_subtotal,
        final_total=final_total,
    )
