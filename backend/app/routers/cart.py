from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import CartItem, Product, User
from app.schemas import CartItemCreate, CartItemOut, CartItemUpdate

router = APIRouter(prefix="/api/cart", tags=["cart"])


@router.get("/{user_id}", response_model=List[CartItemOut])
def get_cart(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(CartItem)
        .options(joinedload(CartItem.product))
        .filter(CartItem.user_id == user_id)
        .order_by(CartItem.id.asc())
        .all()
    )


@router.post("/{user_id}/items", response_model=CartItemOut)
def add_item_to_cart(user_id: int, payload: CartItemCreate, db: Session = Depends(get_db)):
    # 1. Fetch product with authoritative stock check in a single query
    product = db.query(Product).filter(
        Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # 2. Check existing item in user's cart
    existing = (
        db.query(CartItem)
        .options(joinedload(CartItem.product))
        .filter(CartItem.user_id == user_id, CartItem.product_id == payload.product_id)
        .first()
    )
    target_qty = (existing.quantity if existing else 0) + payload.quantity

    if product.stock < target_qty:
        raise HTTPException(
            status_code=400,
            detail=f"Only {product.stock} unit(s) of '{product.name}' available in stock.",
        )

    if existing:
        existing.quantity = target_qty
        item = existing
    else:
        item = CartItem(
            user_id=user_id,
            product_id=payload.product_id,
            quantity=payload.quantity,
        )
        db.add(item)

    db.commit()

    # Eagerly load item with joined product in single round-trip
    item = (
        db.query(CartItem)
        .options(joinedload(CartItem.product))
        .filter(CartItem.id == item.id)
        .first()
    )
    return item


@router.patch("/{user_id}/items/{item_id}", response_model=Optional[CartItemOut])
def update_cart_item_quantity(
    user_id: int,
    item_id: int,
    payload: CartItemUpdate,
    db: Session = Depends(get_db),
):
    item = (
        db.query(CartItem)
        .options(joinedload(CartItem.product))
        .filter(CartItem.id == item_id, CartItem.user_id == user_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if payload.quantity <= 0:
        db.delete(item)
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    if item.product and item.product.stock < payload.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot set quantity to {payload.quantity}. Only {item.product.stock} in stock.",
        )

    item.quantity = payload.quantity
    db.commit()
    return item


@router.delete("/{user_id}/items/{item_id}")
def remove_cart_item(user_id: int, item_id: int, db: Session = Depends(get_db)):
    deleted_count = (
        db.query(CartItem)
        .filter(CartItem.id == item_id, CartItem.user_id == user_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    if not deleted_count:
        raise HTTPException(status_code=404, detail="Cart item not found")
    return {"status": "deleted", "item_id": item_id}
