import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.db_models import BehaviouralEvent, Transaction, DetectedSignal, CXIncident

class AnomalyDetector:
    def __init__(self, db: Session):
        self.db = db

    def calculate_behavioural_metrics(self, company_id: str, window_minutes: int = 120) -> Dict[str, Any]:
        """
        Calculates checkout abandonment rate, payment retry rate, and failure spikes
        from behavioural events over the given time window.
        """
        cutoff = datetime.utcnow() - timedelta(minutes=window_minutes)
        events = self.db.query(BehaviouralEvent).filter(
            BehaviouralEvent.company_id == company_id,
            BehaviouralEvent.created_at >= cutoff
        ).all()

        if not events:
            return {
                "checkout_started": 0,
                "checkout_completed": 0,
                "checkout_abandoned": 0,
                "payment_retries": 0,
                "abandonment_rate": 0.0,
                "retry_rate": 0.0
            }

        df = pd.DataFrame([{
            "session_id": e.session_id,
            "event_type": e.event_type,
            "version": e.application_version,
            "timestamp": e.created_at
        } for e in events])

        started = len(df[df["event_type"] == "checkout_started"])
        completed = len(df[df["event_type"] == "transaction_completed"])
        abandoned = len(df[df["event_type"] == "checkout_abandoned"])
        retries = len(df[df["event_type"] == "payment_retry"])
        attempts = len(df[df["event_type"] == "payment_attempted"]) + retries

        # Deterministic formula calculations
        abandonment_rate = round(((started - completed) / max(started, 1)) * 100, 2)
        retry_rate = round((retries / max(attempts, 1)) * 100, 2)

        return {
            "checkout_started": started,
            "checkout_completed": completed,
            "checkout_abandoned": abandoned,
            "payment_retries": retries,
            "total_attempts": attempts,
            "abandonment_rate": max(0.0, min(100.0, abandonment_rate)),
            "retry_rate": max(0.0, min(100.0, retry_rate))
        }

    def detect_silent_signals(self, company_id: str) -> List[Dict[str, Any]]:
        """
        Applies statistical thresholds (Z-score inspired deviation) to identify anomalies
        even before customers submit complaints.
        """
        metrics = self.calculate_behavioural_metrics(company_id)
        detected = []

        # Baseline thresholds for retail e-commerce
        baseline_abandonment = 18.5
        baseline_retry = 4.2

        if metrics["abandonment_rate"] > baseline_abandonment * 1.5:
            detected.append({
                "signal_type": "checkout_abandonment_spike",
                "metric_name": "Checkout Abandonment Rate",
                "baseline_value": baseline_abandonment,
                "detected_value": metrics["abandonment_rate"],
                "severity": "critical" if metrics["abandonment_rate"] > 50.0 else "high",
                "details": f"Abandonment rate spiked to {metrics['abandonment_rate']}% vs baseline of {baseline_abandonment}%."
            })

        if metrics["retry_rate"] > baseline_retry * 2.0:
            detected.append({
                "signal_type": "payment_retry_burst",
                "metric_name": "Payment Retry Rate",
                "baseline_value": baseline_retry,
                "detected_value": metrics["retry_rate"],
                "severity": "critical" if metrics["retry_rate"] > 25.0 else "high",
                "details": f"Customers re-attempting payments at {metrics['retry_rate']}% vs baseline of {baseline_retry}%."
            })

        return detected

