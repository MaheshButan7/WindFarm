from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
engine = create_engine(f"sqlite:///{DATA / 'wind_asset.db'}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()
