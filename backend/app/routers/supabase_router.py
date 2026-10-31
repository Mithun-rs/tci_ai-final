from fastapi import APIRouter
from app.services.supabase_client import check_supabase_health

router = APIRouter(prefix="/supabase", tags=["Supabase Cloud Synchronization"])

@router.get("/status")
def get_status():
    return check_supabase_health()

@router.get("/schema-sql")
def get_schema_sql():
    try:
        with open("backend/sql/supabase_schema.sql", "r", encoding="utf-8") as f:
            return {"sql": f.read()}
    except Exception as e:
        return {"error": str(e)}

