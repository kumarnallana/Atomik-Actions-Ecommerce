from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Order
from app.schemas import CheckoutRequest, OrderOut
from app.services.checkout_service import process_checkout

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.post("/checkout", response_model=OrderOut)
def checkout_order(payload: CheckoutRequest, db: Session = Depends(get_db)):
    explicit_items = (
        [item.model_dump() for item in payload.items]
        if payload.items is not None
        else None
    )
    return process_checkout(
        db=db,
        user_id=payload.user_id,
        explicit_items=explicit_items,
        coupon_code=payload.coupon_code,
        shipping_address=payload.shipping_address,
    )

@router.get("/user/{user_id}", response_model=List[OrderOut])
def get_customer_orders(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Order)
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .all()
    )
