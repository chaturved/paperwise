from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from ..config import settings

engine = create_engine(settings.DATABASE_URL)
metadata = MetaData()
Base = declarative_base()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
