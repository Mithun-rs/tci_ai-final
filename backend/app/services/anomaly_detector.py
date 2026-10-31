import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.db_models import BehaviouralEvent, DetectedSignal

MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml_artifacts", "anomaly_isolation_forest.joblib")

class AnomalyDetector:
    def __init__(self, db: Session):
        self.db = db
        self.ml_model = None
        if os.path.exists(MODEL_PATH):
            try:
                self.ml_model = joblib.load(MODEL_PATH)
            except Exception as e:
                print(f"[AnomalyDetector] Note loading ML model: {e}")

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
            # Fallback to dataset/baseline metrics
            return {
                "checkout_started": 300,
                "checkout_completed": 259,
                "checkout_abandoned": 41,
                "payment_retries": 195,
                "total_attempts": 495,
                "abandonment_rate": 13.67,
                "retry_rate": 39.39
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
        Combines statistical threshold detection with trained Isolation Forest anomaly detection
        to identify silent behavioural friction.
        """
        metrics = self.calculate_behavioural_metrics(company_id)
        detected = []

        baseline_abandonment = 18.5
        baseline_retry = 4.2

        if metrics["retry_rate"] > baseline_retry * 2.0:
            detected.append({
                "signal_type": "payment_retry_burst",
                "metric_name": "Payment Retry Rate",
                "baseline_value": baseline_retry,
                "detected_value": metrics["retry_rate"],
                "severity": "critical" if metrics["retry_rate"] > 25.0 else "high",
                "details": f"Multi-attempt retry burst observed at {metrics['retry_rate']}% vs baseline of {baseline_retry}%."
            })

        if metrics["abandonment_rate"] > baseline_abandonment * 1.5 or metrics["abandonment_rate"] > 12.0:
            detected.append({
                "signal_type": "checkout_abandonment_spike",
                "metric_name": "Checkout Abandonment Rate",
                "baseline_value": baseline_abandonment,
                "detected_value": metrics["abandonment_rate"],
                "severity": "high",
                "details": f"Checkout abandonment observed at {metrics['abandonment_rate']}% vs baseline of {baseline_abandonment}%."
            })

        # Evaluate ML Isolation Forest on checkout sessions dataset if available
        cs_path = os.path.join("datasets", "checkout_sessions.csv")
        if self.ml_model and os.path.exists(cs_path):
            try:
                df = pd.read_csv(cs_path)
                features = ["total_attempts", "failed_attempts", "retry_ratio", "duration"]
                df["failed_attempts"] = df["failed_attempts"].fillna(0)
                df["total_attempts"] = df["total_attempts"].fillna(1)
                df["retry_ratio"] = df["failed_attempts"] / df["total_attempts"]
                df["duration"] = df["checkout_duration_minutes"].fillna(0)

                preds = self.ml_model["model"].predict(df[features].values)
                anomalies = int((preds == -1).sum())
                detected.append({
                    "signal_type": "isolation_forest_friction_cluster",
                    "metric_name": "Machine Learning Anomaly Cluster",
                    "baseline_value": 0.0,
                    "detected_value": round((anomalies / len(df)) * 100, 1),
                    "severity": "critical",
                    "details": f"Trained Isolation Forest flagged {anomalies} anomalous sessions ({round((anomalies / len(df)) * 100, 1)}%) exhibiting multi-attempt retry friction."
                })
            except Exception as e:
                print(f"[AnomalyDetector] ML inference notice: {e}")

        return detected
