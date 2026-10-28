from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models import OrderStatus, DiscountType

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: str

    model_config = ConfigDict(from_attributes=True)

class ReviewCreate(BaseModel):
    user_id: int
    rating: int = Field(..., ge=1, le=5, description="Rating between 1 and 5 stars")
    comment: str = Field(..., min_length=3, max_length=1000)

class ReviewOut(BaseModel):
    id: int
    product_id: int
    user_id: int
    rating: int
    comment: str
    created_at: datetime
    user: UserOut

    model_config = ConfigDict(from_attributes=True)

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: str = Field(..., min_length=5, max_length=2000)
    category: str = Field(..., min_length=2, max_length=100)
    price: float = Field(..., gt=0)
    stock: int = Field(..., ge=0)
    image_url: str = Field(..., min_length=5)

class ProductUpdate(BaseModel):
    price: Optional[float] = Field(None, gt=0)
    stock: Optional[int] = Field(None, ge=0)

class ProductOut(BaseModel):
    id: int
    name: str
    description: str
    category: str
    price: float
    stock: int
    image_url: str
    reviews: List[ReviewOut] = []

    model_config = ConfigDict(from_attributes=True)

class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=0)

class CartItemOut(BaseModel):
    id: int
    user_id: int
    product_id: int
    quantity: int
    product: ProductOut

    model_config = ConfigDict(from_attributes=True)

class CouponValidateRequest(BaseModel):
    code: str = Field(..., min_length=1)
    user_id: Optional[int] = None
    subtotal: Optional[float] = Field(None, ge=0)

class CouponOut(BaseModel):
    code: str
    discount_type: DiscountType
    discount_value: float
    min_order_value: float
    discount_amount: float
    subtotal: float
    final_total: float

class CouponInfoOut(BaseModel):
    code: str
    discount_type: DiscountType
    discount_value: float
    min_order_value: float
    expires_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CheckoutItemInput(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class CheckoutRequest(BaseModel):
    user_id: int
    items: Optional[List[CheckoutItemInput]] = None
    coupon_code: Optional[str] = None
    shipping_address: str = Field(
        default="742 Evergreen Terrace, Suite 200",
        min_length=5,
        max_length=500
    )

class OrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    product: ProductOut

    model_config = ConfigDict(from_attributes=True)

class OrderOut(BaseModel):
    id: int
    user_id: int
    subtotal: float
    discount: float
    total: float
    coupon_code: Optional[str]
    shipping_address: str
    status: OrderStatus
    created_at: datetime
    items: List[OrderItemOut]
    user: Optional[UserOut] = None

    model_config = ConfigDict(from_attributes=True)

class OrderStatusUpdate(BaseModel):
    status: OrderStatus
