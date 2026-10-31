from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.hypothesis_engine import RootCauseHypothesisEngine
from app.services.nlp_clustering import NLPComplaintClustering

router = APIRouter(prefix="/ai", tags=["AI Investigation"])

@router.get("/hypotheses/{incident_id}")
def get_hypotheses(incident_id: str, db: Session = Depends(get_db)):
    engine = RootCauseHypothesisEngine(db)
    return engine.get_hypotheses_for_incident(incident_id)

@router.get("/clustering/{company_id}")
def get_complaint_clusters(company_id: str, db: Session = Depends(get_db)):
    clustering = NLPComplaintClustering(db)
    return clustering.cluster_feedback(company_id)

