# KRONO — High-Concurrency Modular Commerce Engine

> High-concurrency modular commerce engine & minimalist hardware storefront built with Next.js (App Router), FastAPI, Pydantic v2, and SQLAlchemy. Features row-level inventory locking, server-authoritative pricing, and real-time order fulfillment.

---

## 1. Quick Start & Local Setup

### Backend Setup
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate | macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Seed demo catalog, users, coupons & verified reviews (also runs automatically on startup)
python -m app.seed

# Run the 6 automated backend Pytest checks
pytest -v

# Start FastAPI server on http://localhost:8000
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 2. Demo Logins & Instant Session Switcher
Use the **Session Switcher** in the top navigation bar to switch accounts instantaneously without typing passwords:
- **Customer 1:** `alex.rivera@krono.io` *(Has a delivered order and can post verified reviews immediately)*
- **Customer 2:** `maya.lin@krono.io` *(Fresh customer session for testing simultaneous cart/checkout)*
- **Admin:** `admin@krono.io` *(Full access to `/admin` for order status transitions and stock control)*

### Active Promo Codes
- `KRONO10` — **10% OFF** orders above **$50.00**
- `STUDIO40` — **$40.00 FLAT OFF** orders above **$200.00**
- `EXPIRED25` — Expired promo code included to test server-side rejection.

---

## 3. Data Model & Key Architectural Decisions

- **Concurrency-Safe Stock Deduction (`SELECT ... FOR UPDATE`):** Inside `backend/app/services/checkout_service.py`, requested products are sorted by ID (preventing deadlocks) and locked via SQLAlchemy's `.with_for_update()` inside an atomic transaction alongside an application-level mutex guard for SQLite local testing. If two users buy the last unit (`stock = 1`) simultaneously, the first transaction decrements stock to `0` and commits; the second reads `0` and raises HTTP 400 (`Insufficient stock`). Stock never goes negative.
- **Server-Authoritative Pricing Engine:** In `backend/app/services/pricing_service.py`, the server ignores client-side totals. It queries current unit prices from the database, validates coupon expiry and minimum subtotal thresholds, and computes the exact final charge.
- **Persistent Database Cart:** User carts are stored in the database (`/api/cart/{user_id}`) and cleared atomically during the checkout transaction.
- **Strict State Machine:** Orders progress strictly along `Placed → Shipped → Delivered`. Backwards or skipped transitions are rejected with HTTP 400.
- **Stretch Goal 1: Verified Buyer Product Reviews:** Reviews are restricted on the backend to customers who have an existing order containing the product.
- **Stretch Goal 2: Low-Stock Admin Alerts:** Products with `stock <= 3` trigger visual warning banners and filtered monitoring in the Admin Studio.

---

## 4. Automated Testing
Run the 6 comprehensive Pytest checks:
```bash
cd backend
pytest -v
```
Test suite coverage:
1. Concurrency race condition on the last in-stock item (`ThreadPoolExecutor`).
2. Zero or insufficient stock rejection with HTTP 400.
3. Server-authoritative pricing and percentage coupon discount calculation.
4. Coupon expiry and minimum order value threshold enforcement.
5. Strict `Placed -> Shipped -> Delivered` status transitions (rejection of illegal transitions).
6. Verified buyer review authorization (403 for non-buyers, 200 for buyers).

---

## 5. AI Tools Disclosure
- **Antigravity & Gemini:** Used for scaffolding boilerplate schemas, structuring the unified monorepo architecture, and designing the multi-threaded `ThreadPoolExecutor` concurrency test cases. All business logic, SQLAlchemy locking semantics, and pricing validations were reviewed and verified.
