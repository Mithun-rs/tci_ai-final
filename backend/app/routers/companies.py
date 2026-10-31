from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import Company
from app.services.synthetic_data import seed_synthetic_dataset

router = APIRouter(prefix="/companies", tags=["Companies & Workspaces"])

@router.get("")
def list_companies(db: Session = Depends(get_db)):
    comps = db.query(Company).all()
    if not comps:
        seed_synthetic_dataset(db)
        comps = db.query(Company).all()
    return comps

@router.get("/{company_id}")
def get_company(company_id: str, db: Session = Depends(get_db)):
    comp = db.query(Company).filter(Company.id == company_id).first()
    return comp

@router.post("/reset-dataset")
def reset_dataset(db: Session = Depends(get_db)):
    return seed_synthetic_dataset(db, force=True)

