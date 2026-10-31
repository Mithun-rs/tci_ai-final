from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.schemas import JuryEvidenceInjection
from app.models.db_models import InvestigationHistory
from app.services.hypothesis_engine import RootCauseHypothesisEngine

router = APIRouter(prefix="/jury", tags=["Dynamic Adaptation Lab"])

@router.post("/inject-evidence")
def inject_evidence(payload: JuryEvidenceInjection, db: Session = Depends(get_db)):
    engine = RootCauseHypothesisEngine(db)
    result = engine.adapt_with_new_evidence(
        incident_id=payload.incident_id,
        evidence_type=payload.evidence_type,
        source_id=payload.source_id,
        title=payload.title,
        log_content=payload.log_content,
        latency_ms=payload.latency_ms or 4200,
        is_error=payload.is_error if payload.is_error is not None else True
    )
    return result

@router.get("/history/{incident_id}")
def get_investigation_history(incident_id: str, db: Session = Depends(get_db)):
    history = db.query(InvestigationHistory).filter(
        InvestigationHistory.incident_id == incident_id
    ).order_by(InvestigationHistory.version.desc()).all()
    return history

