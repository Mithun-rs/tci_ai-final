from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.db_models import CXIncident, RecoveryAction

class DecisionSimulator:
    def __init__(self, db: Session):
        self.db = db

    def simulate_interventions(
        self,
        incident_id: str,
        w_impact: float = 0.25,
        w_urgency: float = 0.20,
        w_benefit: float = 0.30,
        w_cost: float = 0.15,
        w_risk: float = 0.10
    ) -> List[Dict[str, Any]]:
        """
        Calculates normalized decision scores for each proposed recovery action.
        """
        actions = self.db.query(RecoveryAction).filter(
            RecoveryAction.incident_id == incident_id
        ).all()

        incident = self.db.query(CXIncident).filter(
            CXIncident.id == incident_id
        ).first()

        results = []
        risk_penalty = {"low": 10.0, "medium": 30.0, "high": 70.0}

        for action in actions:
            # Baseline metrics
            impact_score = min(100.0, (incident.affected_customers_count / 200.0) * 100.0) if incident else 80.0
            urgency_score = 90.0 if incident and incident.severity == "critical" else 70.0
            benefit_score = action.expected_benefit

            # Normalize cost (assuming $5000 max demo cost ceiling)
            cost_normalized = min(100.0, (action.operational_cost / 5000.0) * 100.0)
            risk_normalized = risk_penalty.get(action.operational_risk, 30.0)

            # Deterministic weighted formula
            raw_score = (
                (w_impact * impact_score) +
                (w_urgency * urgency_score) +
                (w_benefit * benefit_score) -
                (w_cost * cost_normalized) -
                (w_risk * risk_normalized)
            )

            final_score = round(max(5.0, min(99.0, raw_score)), 1)
            action.decision_score = final_score

            results.append({
                "id": action.id,
                "incident_id": action.incident_id,
                "title": action.title,
                "action_type": action.action_type,
                "description": action.description,
                "decision_score": final_score,
                "expected_benefit": action.expected_benefit,
                "operational_cost": action.operational_cost,
                "operational_risk": action.operational_risk,
                "implementation_time_mins": action.implementation_time_mins,
                "approval_status": action.approval_status,
                "breakdown": {
                    "impact_component": round(w_impact * impact_score, 1),
                    "urgency_component": round(w_urgency * urgency_score, 1),
                    "benefit_component": round(w_benefit * benefit_score, 1),
                    "cost_penalty": round(w_cost * cost_normalized, 1),
                    "risk_penalty": round(w_risk * risk_normalized, 1)
                }
            })

        self.db.commit()
        return sorted(results, key=lambda x: x["decision_score"], reverse=True)

