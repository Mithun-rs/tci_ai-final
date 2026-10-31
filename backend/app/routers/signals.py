from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import DetectedSignal, CXIncident
from app.services.anomaly_detector import AnomalyDetector
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/signals", tags=["Silent Problem Detection & Real-Time Telemetry"])

@router.get("")
def get_detected_signals(company_id: str, db: Session = Depends(get_db)):
    client = get_supabase_client()
    if client:
        try:
            res = client.table("detected_signals").select("*").eq("company_id", company_id).order("detected_at", desc=True).execute()
            if res.data and len(res.data) > 0:
                return res.data
        except Exception as e:
            print(f"[Supabase] signals fetch notice: {e}")

    signals = db.query(DetectedSignal).filter(
        DetectedSignal.company_id == company_id
    ).order_by(DetectedSignal.detected_at.desc()).all()
    return signals

@router.get("/telemetry-stream")
def get_telemetry_stream(
    company_id: str = Query("shopsphere"),
    incident_id: Optional[str] = Query(None),
    time_range: str = Query("6h"),
    points_count: int = Query(10, ge=5, le=30),
    db: Session = Depends(get_db)
):
    """
    Returns real-time sliding-window telemetry points computed dynamically.
    Reflects live operational health (degraded during active incidents, recovered post-execution).
    """
    detector = AnomalyDetector(db)
    return detector.get_realtime_telemetry(
        company_id=company_id,
        incident_id=incident_id,
        time_range=time_range,
        count=points_count
    )

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

@router.post("/simulate-burst")
def simulate_retry_burst(company_id: str, db: Session = Depends(get_db)):
    """
    Simulates a sudden real-time retry storm & checkout dropout burst.
    """
    incident = db.query(CXIncident).filter(
        CXIncident.company_id == company_id
    ).order_by(CXIncident.updated_at.desc()).first()

    if incident:
        incident.status = "investigating"
        incident.affected_customers_count += 18
        incident.transaction_value_at_risk += 34500.00
        db.commit()

    detector = AnomalyDetector(db)
    return detector.get_realtime_telemetry(company_id=company_id, count=10)
