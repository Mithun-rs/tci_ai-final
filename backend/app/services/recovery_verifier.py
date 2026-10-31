from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.db_models import CXIncident, RecoveryMetric, RecoveryAction

class RecoveryVerifier:
    def __init__(self, db: Session):
        self.db = db

    def execute_and_verify(self, incident_id: str, action_id: str) -> Dict[str, Any]:
        """
        Executes approved action simulation and simulates post-intervention telemetry recovery.
        """
        action = self.db.query(RecoveryAction).filter(RecoveryAction.id == action_id).first()
        incident = self.db.query(CXIncident).filter(CXIncident.id == incident_id).first()

        if not action or not incident:
            return {"error": "Action or incident not found"}

        # Simulate execution result
        action.approval_status = "executed"
        action.approved_at = datetime.utcnow()
        action.execution_result = {
            "status": "success",
            "message": f"Successfully executed {action.title}",
            "execution_time_seconds": 1.45,
            "routing_updated": True
        }

        # Update recovery metrics to post-intervention levels
        metrics = self.db.query(RecoveryMetric).filter(
            RecoveryMetric.incident_id == incident_id
        ).all()

        updated_metrics = []
        all_recovered = True

        for m in metrics:
            if "Retry" in m.metric_name:
                m.current_value = 3.8 # recovered below 5.0% target
                m.is_recovered = True
            elif "Abandonment" in m.metric_name:
                m.current_value = 17.2 # recovered below 20.0% target
                m.is_recovered = True
            elif "Failure" in m.metric_name or "Timeout" in m.metric_name:
                m.current_value = 2.4 # recovered below target
                m.is_recovered = True
            else:
                m.current_value = round(m.target_value * 0.8, 1)
                m.is_recovered = True

            m.last_verified_at = datetime.utcnow()
            updated_metrics.append({
                "metric_name": m.metric_name,
                "pre_intervention": m.pre_intervention_value,
                "current_value": m.current_value,
                "target_value": m.target_value,
                "is_recovered": m.is_recovered
            })

        incident.status = "resolved"
        incident.updated_at = datetime.utcnow()
        self.db.commit()

        return {
            "incident_id": incident_id,
            "action_executed": action.title,
            "overall_recovered": all_recovered,
            "recovery_progress_pct": 100.0 if all_recovered else 60.0,
            "metrics": updated_metrics,
            "verification_timestamp": datetime.utcnow()
        }

    def get_verification_status(self, incident_id: str) -> Dict[str, Any]:
        metrics = self.db.query(RecoveryMetric).filter(
            RecoveryMetric.incident_id == incident_id
        ).all()

        results = []
        recovered_count = 0
        for m in metrics:
            if m.is_recovered:
                recovered_count += 1
            results.append({
                "metric_name": m.metric_name,
                "pre_intervention": m.pre_intervention_value,
                "current_value": m.current_value,
                "target_value": m.target_value,
                "is_recovered": m.is_recovered,
                "last_verified_at": m.last_verified_at
            })

        total = len(metrics) if metrics else 1
        pct = round((recovered_count / total) * 100, 1) if metrics else 0.0

        return {
            "incident_id": incident_id,
            "overall_recovered": (recovered_count == len(metrics) and len(metrics) > 0),
            "recovery_progress_pct": pct,
            "metrics": results,
            "verification_timestamp": datetime.utcnow()
        }

