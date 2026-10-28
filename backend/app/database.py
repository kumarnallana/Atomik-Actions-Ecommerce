import threading
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=not is_sqlite,
    connect_args={"check_same_thread": False, "timeout": 30} if is_sqlite else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Application-level mutex fallback for SQLite dialect where SELECT FOR UPDATE is a no-op;
# On PostgreSQL/MySQL, database row locks (.with_for_update()) handle cross-process concurrency natively.
checkout_lock = threading.Lock()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
