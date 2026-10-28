from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import admin, cart, coupons, orders, products, users
from app.seed import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically initialize tables & seed demo catalog if database is empty
    seed_database(force_reset=False)
    yield

app = FastAPI(
    title="KRONO Commerce Engine API",
    description="High-concurrency hardware storefront API with row-level inventory locking & server-authoritative pricing.",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(coupons.router)
app.include_router(orders.router)
app.include_router(admin.router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "krono-commerce-api"}
