from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import CXIncident, RootCauseHypothesis, DetectedSignal, Customer
from app.services.correlation_engine import CrossChannelCorrelationEngine
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/incidents", tags=["CX Incidents"])

@router.get("")
def list_incidents(company_id: str, db: Session = Depends(get_db)):
    client = get_supabase_client()
    if client:
        try:
            res = client.table("cx_incidents").select("*").eq("company_id", company_id).order("created_at", desc=True).execute()
            if res.data and len(res.data) > 0:
                return res.data
        except Exception as e:
            print(f"[Supabase] incidents fetch notice: {e}")

    return db.query(CXIncident).filter(
        CXIncident.company_id == company_id
    ).order_by(CXIncident.created_at.desc()).all()

@router.get("/{incident_id}")
def get_incident_details(incident_id: str, db: Session = Depends(get_db)):
    client = get_supabase_client()
    if client:
        try:
            inc_res = client.table("cx_incidents").select("*").eq("id", incident_id).execute()
            hyp_res = client.table("root_cause_hypotheses").select("*").eq("incident_id", incident_id).order("confidence_score", desc=True).execute()
            if inc_res.data and len(inc_res.data) > 0:
                return {
                    "incident": inc_res.data[0],
                    "hypotheses": hyp_res.data or []
                }
        except Exception as e:
            print(f"[Supabase] incident details notice: {e}")

    incident = db.query(CXIncident).filter(CXIncident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    hypotheses = db.query(RootCauseHypothesis).filter(
        RootCauseHypothesis.incident_id == incident_id
    ).order_by(RootCauseHypothesis.confidence_score.desc()).all()

    return {
        "incident": incident,
        "hypotheses": hypotheses
    }

@router.get("/{incident_id}/graph")
def get_incident_graph(incident_id: str, db: Session = Depends(get_db)):
    correlation_engine = CrossChannelCorrelationEngine(db)
    return correlation_engine.generate_incident_evidence_graph(incident_id)

@router.get("/{incident_id}/affected-customers")
def get_affected_customers(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(CXIncident).filter(CXIncident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    customers = db.query(Customer).filter(
        Customer.company_id == incident.company_id
    ).limit(30).all()

    return {
        "incident_id": incident_id,
        "total_affected_count": incident.affected_customers_count,
        "transaction_value_at_risk": incident.transaction_value_at_risk,
        "sample_customers": customers
    }

