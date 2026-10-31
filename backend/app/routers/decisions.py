from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.schemas import WhatIfSimulationRequest
from app.services.decision_simulator import DecisionSimulator

router = APIRouter(prefix="/decisions", tags=["What-If Decision Simulator"])

@router.post("/simulate")
def simulate_decision(payload: WhatIfSimulationRequest, db: Session = Depends(get_db)):
    simulator = DecisionSimulator(db)
    results = simulator.simulate_interventions(
        incident_id=payload.incident_id,
        w_impact=payload.weight_customer_impact,
        w_urgency=payload.weight_urgency,
        w_benefit=payload.weight_benefit,
        w_cost=payload.weight_cost,
        w_risk=payload.weight_risk
    )
    return {
        "incident_id": payload.incident_id,
        "simulated_actions": results
    }

@router.get("/{incident_id}")
def get_actions_for_incident(incident_id: str, db: Session = Depends(get_db)):
    simulator = DecisionSimulator(db)
    return simulator.simulate_interventions(incident_id=incident_id)

