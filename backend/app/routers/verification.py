from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.recovery_verifier import RecoveryVerifier

router = APIRouter(prefix="/verification", tags=["Outcome Verification"])

@router.get("/{incident_id}")
def get_verification_status(incident_id: str, db: Session = Depends(get_db)):
    verifier = RecoveryVerifier(db)
    return verifier.get_verification_status(incident_id)

@router.post("/{incident_id}/verify")
def trigger_verification(incident_id: str, db: Session = Depends(get_db)):
    verifier = RecoveryVerifier(db)
    return verifier.get_verification_status(incident_id)

