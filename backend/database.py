from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker


BASE_DIR = Path(__file__).resolve().parent


# Local SQLite database file
SQLALCHEMY_DATABASE_URL = "sqlite:///./conference_local.db"

DATABASE_URL = f"sqlite:///{BASE_DIR / 'conference.db'}"


engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


Base = declarative_base()


def upgrade_sqlite_schema() -> None:
    """Apply additive compatibility updates for the prototype SQLite database."""
    if engine.dialect.name != "sqlite":
        return

    required_columns = {
        "submissions": {
            "camera_ready_file_url": "VARCHAR(500)",
            "notes": "TEXT",
        },

        "reviews": {
            "deadline": "DATETIME",
            "originality_score": "INTEGER",
            "methodology_score": "INTEGER",
            "clarity_score": "INTEGER",
            "significance_score": "INTEGER",
            "confidence_score": "INTEGER",
            "confidential_comments": "TEXT",
        },
        "payments": {
            "currency": "VARCHAR(3) NOT NULL DEFAULT 'INR'",
            "provider": "VARCHAR(40) NOT NULL DEFAULT 'college_demo_gateway'",
            "gateway_order_id": "VARCHAR(80)",
            "gateway_payment_id": "VARCHAR(80)",
            "failure_reason": "VARCHAR(250)",
            "refunded_at": "DATETIME",
        },

    }

    with engine.begin() as connection:
        inspector = inspect(connection)
        for table_name, columns in required_columns.items():
            if table_name not in inspector.get_table_names():
                continue
            existing_columns = {
                column["name"] for column in inspector.get_columns(table_name)
            }
            for column_name, column_type in columns.items():
                if column_name not in existing_columns:
                    connection.execute(
                        text(
                            f"ALTER TABLE {table_name} "
                            f"ADD COLUMN {column_name} {column_type}"
                        )
                    )


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
