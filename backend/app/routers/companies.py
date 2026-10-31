from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import Company
from app.services.synthetic_data import seed_synthetic_dataset
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/companies", tags=["Companies & Workspaces"])

@router.get("")
def list_companies(db: Session = Depends(get_db)):
    client = get_supabase_client()
    if client:
        try:
            res = client.table("companies").select("*").execute()
            if res.data and len(res.data) > 0:
                return res.data
        except Exception as e:
            print(f"[Supabase] companies fetch notice: {e}")

    comps = db.query(Company).all()
    if not comps:
        seed_synthetic_dataset(db)
        comps = db.query(Company).all()
    return comps

@router.get("/{company_id}")
def get_company(company_id: str, db: Session = Depends(get_db)):
    client = get_supabase_client()
    if client:
        try:
            res = client.table("companies").select("*").eq("id", company_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"[Supabase] company fetch notice: {e}")

    comp = db.query(Company).filter(Company.id == company_id).first()
    return comp

@router.post("/reset-dataset")
def reset_dataset(db: Session = Depends(get_db)):
    return seed_synthetic_dataset(db, force=True)

