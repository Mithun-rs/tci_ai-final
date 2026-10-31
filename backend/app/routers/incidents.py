from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import CXIncident, RootCauseHypothesis, DetectedSignal, Customer
from app.services.correlation_engine import CrossChannelCorrelationEngine

router = APIRouter(prefix="/incidents", tags=["CX Incidents"])

@router.get("")
def list_incidents(company_id: str, db: Session = Depends(get_db)):
    return db.query(CXIncident).filter(
        CXIncident.company_id == company_id
    ).order_by(CXIncident.created_at.desc()).all()

@router.get("/{incident_id}")
def get_incident_details(incident_id: str, db: Session = Depends(get_db)):
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

