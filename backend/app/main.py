from contextlib import asynccontextmanager
import re
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

# Parse configured origins and append common local development addresses & ports
configured_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
all_origins = list(dict.fromkeys(configured_origins + default_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=all_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
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
