from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import DetectedSignal
from app.services.anomaly_detector import AnomalyDetector

router = APIRouter(prefix="/signals", tags=["Silent Problem Detection"])

@router.get("")
def get_detected_signals(company_id: str, db: Session = Depends(get_db)):
    signals = db.query(DetectedSignal).filter(
        DetectedSignal.company_id == company_id
    ).order_by(DetectedSignal.detected_at.desc()).all()
    return signals

@router.post("/detect")
def trigger_detection(company_id: str, db: Session = Depends(get_db)):
    detector = AnomalyDetector(db)
    detected = detector.detect_silent_signals(company_id)
    return {
        "company_id": company_id,
        "anomalies_detected": len(detected),
        "signals": detected,
        "metrics_summary": detector.calculate_behavioural_metrics(company_id)
    }

