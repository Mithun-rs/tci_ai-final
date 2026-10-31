import sys
import os
sys.path.append(os.path.abspath("backend"))

from app.services.supabase_client import get_supabase_client
from app.database import SessionLocal
from app.models.db_models import (
    Company, Customer, CXIncident, DetectedSignal, RecoveryAction,
    SupportTicket, CustomerReview, RootCauseHypothesis, RecoveryMetric
)

def sync_all_to_supabase():
    client = get_supabase_client()
    if not client:
        print("[Supabase Sync] Client not configured.")
        return

    db = SessionLocal()
    print("[Supabase Sync] Syncing records to Supabase Cloud...")

    try:
        # Sync Companies
        companies = db.query(Company).all()
        for c in companies:
            client.table("companies").upsert({
                "id": c.id,
                "name": c.name,
                "industry": c.industry,
                "description": c.description
            }).execute()
        print(f" -> Synced {len(companies)} companies.")

        # Sync Incidents
        incidents = db.query(CXIncident).all()
        for inc in incidents:
            client.table("cx_incidents").upsert({
                "id": inc.id,
                "company_id": inc.company_id,
                "title": inc.title,
                "description": inc.description,
                "status": inc.status,
                "severity": inc.severity,
                "affected_customers_count": inc.affected_customers_count,
                "transaction_value_at_risk": inc.transaction_value_at_risk
            }).execute()
        print(f" -> Synced {len(incidents)} incidents.")

        # Sync Hypotheses
        hypotheses = db.query(RootCauseHypothesis).all()
        for h in hypotheses:
            client.table("root_cause_hypotheses").upsert({
                "id": h.id,
                "incident_id": h.incident_id,
                "title": h.title,
                "description": h.description,
                "confidence_score": h.confidence_score,
                "supporting_evidence": h.supporting_evidence,
                "contradictory_evidence": h.contradictory_evidence,
                "is_primary": h.is_primary
            }).execute()
        print(f" -> Synced {len(hypotheses)} hypotheses.")

        print("\n[Supabase Sync] All records synchronized successfully to Supabase Cloud!")
    except Exception as e:
        print(f"[Supabase Sync] Table error: {e}")
        print("Note: Ensure you have executed backend/sql/supabase_schema.sql in the Supabase SQL Editor.")
    finally:
        db.close()

if __name__ == "__main__":
    sync_all_to_supabase()

