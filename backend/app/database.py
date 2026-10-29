import logging
import socket
import threading
from urllib.parse import urlparse
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger("krono.database")

Base = declarative_base()
checkout_lock = threading.Lock()

# Fallback SQLite engine for zero-downtime offline / DNS jitter protection
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
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    is_sqlite = db_url.startswith("sqlite")
    if is_sqlite:
        return sqlite_engine

    # For PostgreSQL / Supabase, resolve hostaddr to bypass Windows getaddrinfo DNS latency/exhaustion
    connect_args = {"connect_timeout": 5, "sslmode": "require"}
    try:
        parsed = urlparse(db_url)
        if parsed.hostname and not parsed.hostname.startswith("127.") and parsed.hostname != "localhost":
            try:
                addr_info = socket.getaddrinfo(parsed.hostname, parsed.port or 5432, socket.AF_INET)
                if addr_info:
                    resolved_ip = addr_info[0][4][0]
                    connect_args["hostaddr"] = resolved_ip
                    logger.info(f"Resolved {parsed.hostname} to IPv4 {resolved_ip}")
            except Exception as e:
                logger.warning(f"Could not resolve hostaddr for {parsed.hostname}: {e}")
    except Exception:
        pass

    return create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=300,
        connect_args=connect_args,
    )

# Initialize engine with graceful fallback
try:
    engine = build_primary_engine()
    with engine.connect() as test_conn:
        pass
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("Connected to primary database successfully.")
except Exception as exc:
    logger.warning(f"Primary database connection failed ({exc}). Falling back to local SQLite database.")
    engine = sqlite_engine
    SessionLocal = SqliteSessionLocal

def get_db():
    try:
        db = SessionLocal()
        yield db
    except Exception as exc:
        logger.warning(f"Database session error ({exc}). Serving from local fallback database.")
        db = SqliteSessionLocal()
        try:
            yield db
        finally:
            db.close()
    finally:
        try:
            db.close()
        except Exception:
            pass
