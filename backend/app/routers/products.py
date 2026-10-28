from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Order, OrderItem, Product, Review, User
from app.schemas import ProductOut, ReviewCreate, ReviewOut

router = APIRouter(prefix="/api/products", tags=["products"])

@router.get("", response_model=List[ProductOut])
def list_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    sort_by: Optional[str] = Query(None, pattern="^(price_asc|price_desc|name_asc|stock_desc)$"),
    db: Session = Depends(get_db),
):
    query = db.query(Product)

    if category and category.lower() != "all":
        query = query.filter(Product.category == category)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(Product.name.ilike(term) | Product.description.ilike(term))
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    if sort_by == "price_asc":
        query = query.order_by(Product.price.asc())
    elif sort_by == "price_desc":
        query = query.order_by(Product.price.desc())
    elif sort_by == "name_asc":
        query = query.order_by(Product.name.asc())
    elif sort_by == "stock_desc":
        query = query.order_by(Product.stock.desc())
    else:
        query = query.order_by(Product.id.asc())

    return query.all()

@router.get("/categories", response_model=List[str])
def list_categories(db: Session = Depends(get_db)):
    rows = db.query(Product.category).distinct().all()
    return sorted([r[0] for r in rows if r[0]])

@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/{product_id}/reviews", response_model=ReviewOut)
def create_product_review(
    product_id: int,
    payload: ReviewCreate,
    db: Session = Depends(get_db)
):
    """
    Stretch Goal: Verified Buyer Product Reviews.
    Only customers who have actually ordered this product can submit a review.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    has_purchased = (
        db.query(OrderItem)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.user_id == payload.user_id, OrderItem.product_id == product_id)
        .first()
    )
    if not has_purchased:
        raise HTTPException(
            status_code=403,
            detail="Only verified buyers who have purchased this item can leave a review."
        )

    review = Review(
        product_id=product_id,
        user_id=payload.user_id,
        rating=payload.rating,
        comment=payload.comment.strip(),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
