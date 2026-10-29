# AGENTS.md — Antigravity Engineering Guidelines & Operational Directives

## 1. MANDATORY AGENT BEHAVIORAL DIRECTIVES
- **ALWAYS PROVIDE THE EXACT 3-STEP GIT WORKFLOW AT THE END OF EVERY RESPONSE:**
  Whenever any file is created, updated, or fixed, or when a task milestone is reached, the agent MUST conclude the response with the exact 3-step sequence:
  1. `git add .`
  2. `git commit -m "<type>(<scope>): <summary>"`
  3. `git push origin main`
- **Documentation & Invariant Integrity:** Maintain all architectural rules, row-level concurrency locks, and server-side pricing guarantees.

---

## 2. REPOSITORY & ARCHITECTURAL INVARIANTS

### Concurrency-Safe Inventory Locking
- All checkout transactions in `backend/app/services/checkout_service.py` MUST sort product IDs (to prevent deadlocks) and lock rows using SQLAlchemy `.with_for_update()`.
- Coupled with thread-level mutex protection for SQLite and native row locks in PostgreSQL.
- Stock must never drop below 0.

### Server-Authoritative Pricing & Coupon Engine
- The frontend never transmits unit prices, subtotal calculations, or discount values.
- `pricing_service.py` queries unit prices from the database, enforces coupon validity, active status, expiration timestamp, and minimum order values strictly on the server.

### Resilient Dual-Database Architecture
- **Primary:** Supabase PostgreSQL (`postgresql+psycopg2://...`) with direct IPv4 `hostaddr` resolution to prevent Windows DNS timeouts/exhaustion.
- **Fallback:** Local SQLite (`sqlite:///./krono_store.db`) auto-fallback if remote pooler is unreachable, ensuring zero 500 errors and full offline capability.
- Both databases are kept synchronized and seeded via `backend/app/seed.py`.

### Strict Order Fulfillment State Machine
- Orders progress strictly: `Placed → Shipped → Delivered`.
- Invalid or backwards transitions must be rejected with HTTP 400.

### Stretch Goals Implemented
1. **Verified Buyer Reviews:** Reviews in `POST /api/products/{product_id}/reviews` require a past delivered order containing the product (HTTP 403 for non-buyers).
2. **Low-Stock Admin Alerts:** Products with `stock <= 3` are highlighted in a dedicated warning banner in `/admin` with stock replenishment controls.

---

## 3. COMMON OPERATIONAL COMMANDS

### Automated Test Suite
```bash
$env:PYTHONPATH="backend"
pytest -v backend/tests
```

### Run FastAPI Backend
```bash
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --reload --port 8000
```

### Run Next.js Frontend
```bash
cd frontend
npm run dev
```

---

## 4. STANDARD GIT COMMIT WORKFLOW TEMPLATE
Always format the end of every reply strictly following this exact 3-step order:
```bash
git add .
git commit -m "<type>(<scope>): <summary>"
git push origin main
```
