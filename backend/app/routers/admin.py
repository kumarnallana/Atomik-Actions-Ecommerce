from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Order, OrderStatus, Product
from app.schemas import (
    OrderOut,
    OrderStatusUpdate,
    ProductCreate,
    ProductOut,
    ProductUpdate,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/orders", response_model=List[OrderOut])
def list_all_orders(db: Session = Depends(get_db)):
    return db.query(Order).order_by(Order.created_at.desc()).all()

@router.patch("/orders/{order_id}/status", response_model=OrderOut)
def advance_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    allowed_next = {
        OrderStatus.PLACED: [OrderStatus.SHIPPED],
        OrderStatus.SHIPPED: [OrderStatus.DELIVERED],
        OrderStatus.DELIVERED: [],
    }

    if payload.status == order.status:
        return order

    if payload.status not in allowed_next.get(order.status, []):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid status transition from '{order.status.value}' to '{payload.status.value}'. "
                f"Orders must progress strictly: Placed -> Shipped -> Delivered."
            ),
        )

    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order

@router.get("/low-stock", response_model=List[ProductOut])
def get_low_stock_products(
    threshold: int = Query(3, ge=0),
    db: Session = Depends(get_db)
):
    """Stretch Goal: Low-stock alerts in the admin panel."""
    return (
        db.query(Product)
        .filter(Product.stock <= threshold)
        .order_by(Product.stock.asc())
        .all()
    )

@router.post("/products", response_model=ProductOut)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    product = Product(
        name=payload.name.strip(),
        description=payload.description.strip(),
        category=payload.category.strip(),
        price=round(payload.price, 2),
        stock=payload.stock,
        image_url=payload.image_url.strip(),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product_inventory_or_price(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    if payload.stock is not None:
        product.stock = payload.stock
    if payload.price is not None:
        product.price = round(payload.price, 2)

    db.commit()
    db.refresh(product)
    return product
