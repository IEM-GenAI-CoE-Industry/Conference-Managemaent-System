from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Local SQLite database file
SQLALCHEMY_DATABASE_URL = "sqlite:///./conference_local.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Dependency to get DB session in endpoints
def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()