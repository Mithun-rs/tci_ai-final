from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from app.config import settings

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Optional[Client]:
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
    if settings.SUPABASE_URL and key:
        try:
            _supabase_client = create_client(settings.SUPABASE_URL, key)
            return _supabase_client
        except Exception as e:
            print(f"[Supabase] Initialization error: {e}")
            return None
    return None

def check_supabase_health() -> Dict[str, Any]:
    client = get_supabase_client()
    if not client:
        return {
            "connected": False,
            "url": settings.SUPABASE_URL,
            "message": "Supabase credentials not configured or client initialization failed."
        }
    
    try:
        # Attempt to inspect schema cache
        client.table("companies").select("id").limit(1).execute()
        return {
            "connected": True,
            "schema_ready": True,
            "url": settings.SUPABASE_URL,
            "message": "Connected to Supabase and tables are initialized."
        }
    except Exception as e:
        err_msg = str(e)
        if "PGRST205" in err_msg or "Could not find the table" in err_msg:
            return {
                "connected": True,
                "schema_ready": False,
                "url": settings.SUPABASE_URL,
                "message": "Connected to Supabase project, but tables are pending. Run backend/sql/supabase_schema.sql in Supabase SQL Editor."
            }
        return {
            "connected": True,
            "schema_ready": False,
            "url": settings.SUPABASE_URL,
            "message": f"Connected to Supabase. Detail: {err_msg}"
        }

