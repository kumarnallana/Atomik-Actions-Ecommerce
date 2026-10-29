import logging
import threading
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger("krono.database")

Base = declarative_base()
checkout_lock = threading.Lock()

# 1. Fallback SQLite engine for guaranteed zero-downtime offline / jitter protection
sqlite_url = "sqlite:///./krono_store.db"
sqlite_engine = create_engine(
    sqlite_url,
    connect_args={"check_same_thread": False, "timeout": 30},
)
SqliteSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)

def build_primary_engine():
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql+psycopg://"):
        try:
            import psycopg  # noqa: F401
        except ImportError:
            db_url = db_url.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
    elif db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

    if db_url.startswith("sqlite"):
        return sqlite_engine

    # Remote PostgreSQL / Supabase connection with 30s timeout and keepalive pool
    return create_engine(
        db_url,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
        pool_pre_ping=False,
        connect_args={"connect_timeout": 30},
    )

# Initialize primary engine with graceful fallback to local SQLite
try:
    engine = build_primary_engine()
    # Test connection and warm up the pool on module load
    with engine.connect() as test_conn:
        test_conn.execute(text("SELECT 1"))
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("Connected to primary PostgreSQL database and warmed pool.")
except Exception as exc:
    logger.warning(
        f"Primary database connection failed ({exc}). Using local SQLite database."
    )
    engine = sqlite_engine
    SessionLocal = SqliteSessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
