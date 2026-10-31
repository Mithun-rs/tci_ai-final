from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import RecoveryAction, CXIncident
from app.models.schemas import ActionApprovalRequest
from app.services.recovery_verifier import RecoveryVerifier

router = APIRouter(prefix="/recovery", tags=["Recovery Actions & Human Control"])

@router.post("/actions/{action_id}/approve")
def approve_action(action_id: str, payload: ActionApprovalRequest, db: Session = Depends(get_db)):
    action = db.query(RecoveryAction).filter(RecoveryAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    action.approval_status = "approved" if payload.action == "approve" else "rejected"
    action.approved_by = payload.user_id
    action.approved_at = datetime.utcnow()

    # Update incident state to approved
    incident = db.query(CXIncident).filter(CXIncident.id == action.incident_id).first()
    if incident:
        incident.status = "approved" if payload.action == "approve" else "action_simulated"
        incident.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(action)
    return action

@router.post("/actions/{action_id}/execute")
def execute_action(action_id: str, db: Session = Depends(get_db)):
    action = db.query(RecoveryAction).filter(RecoveryAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    
    if action.approval_status != "approved":
        raise HTTPException(status_code=400, detail="Action requires human manager approval before execution.")

    verifier = RecoveryVerifier(db)
    result = verifier.execute_and_verify(incident_id=action.incident_id, action_id=action_id)
    return result

