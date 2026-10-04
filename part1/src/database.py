"""
Database Connection & Engine Initialization for Email Forensics.
================================================================
Configures SQLAlchemy engine, session maker, and schema initialization.
Supports SQLite (with foreign key enforcement) and PostgreSQL.
"""

import os
from pathlib import Path
from contextlib import contextmanager
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.engine import Engine

from db_models import Base

# Default database location in part1/database/email_forensics.db
DEFAULT_DB_DIR = Path(__file__).parent.parent / "database"
DEFAULT_DB_PATH = DEFAULT_DB_DIR / "email_forensics.db"
DEFAULT_DB_URL = f"sqlite:///{DEFAULT_DB_PATH.resolve()}"


@event.listens_for(Engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    """Enforce foreign key constraints on SQLite connections."""
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON;")
    except Exception:
        pass
    finally:
        cursor.close()


class DatabaseManager:
    """Manages database lifecycle, engines, sessions, and table creation."""

    def __init__(self, db_url=None):
        if db_url is None:
            DEFAULT_DB_DIR.mkdir(parents=True, exist_ok=True)
            self.db_url = os.environ.get("EMAIL_FORENSICS_DB_URL", DEFAULT_DB_URL)
        else:
            self.db_url = db_url

        self.engine = create_engine(
            self.db_url,
            echo=False,
            future=True,
            connect_args={"check_same_thread": False} if self.db_url.startswith("sqlite") else {},
        )
        self.SessionFactory = sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
        )
        self.ScopedSession = scoped_session(self.SessionFactory)

    def init_db(self, drop_existing=False):
        """Initializes database schema by creating all registered tables."""
        if drop_existing:
            Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

    def get_session(self):
        """Returns a new SQLAlchemy Session instance."""
        return self.SessionFactory()

    @contextmanager
    def session_scope(self):
        """Provide a transactional scope around a series of operations."""
        session = self.get_session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


# Module-level default manager instance
_default_db_manager = None


def get_db_manager(db_url=None):
    """Returns singleton default database manager or a new instance for custom URL."""
    global _default_db_manager
    if db_url is not None:
        return DatabaseManager(db_url)
    if _default_db_manager is None:
        _default_db_manager = DatabaseManager()
    return _default_db_manager


def init_db(db_url=None, drop_existing=False):
    """Initializes tables using default or specified database URL."""
    mgr = get_db_manager(db_url)
    mgr.init_db(drop_existing=drop_existing)
    return mgr
