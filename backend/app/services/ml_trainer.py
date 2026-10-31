import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml_artifacts")
os.makedirs(MODEL_DIR, exist_ok=True)

class MLTrainer:
    def __init__(self, dataset_dir: str = "datasets"):
        self.dataset_dir = dataset_dir

    def train_silent_anomaly_model(self) -> Dict[str, Any]:
        """
        Trains an Isolation Forest anomaly detection model on checkout sessions
        to identify silent behavioural friction, retry storms, and unexpected session dropouts.
        """
        path = os.path.join(self.dataset_dir, "checkout_sessions.csv")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Missing {path}")

        df = pd.read_csv(path)

        # Feature engineering
        df["failed_attempts"] = df["failed_attempts"].fillna(0)
        df["total_attempts"] = df["total_attempts"].fillna(1)
        df["retry_ratio"] = df["failed_attempts"] / df["total_attempts"]
        df["duration"] = df["checkout_duration_minutes"].fillna(0)
        
        feature_cols = ["total_attempts", "failed_attempts", "retry_ratio", "duration"]
        X = df[feature_cols].values

        # Isolation Forest with 10% expected anomaly contamination
        model = IsolationForest(
            n_estimators=100,
            contamination=0.15,
            random_state=42
        )
        model.fit(X)

        # Evaluate model scores
        scores = model.decision_function(X)
        preds = model.predict(X) # -1 is anomaly, 1 is normal
        anomalies_detected = int((preds == -1).sum())

        model_path = os.path.join(MODEL_DIR, "anomaly_isolation_forest.joblib")
        joblib.dump({"model": model, "feature_cols": feature_cols}, model_path)

        return {
            "model_type": "IsolationForest",
            "samples_trained": len(df),
            "features": feature_cols,
            "anomalies_detected": anomalies_detected,
            "anomaly_rate": round(anomalies_detected / len(df) * 100, 2),
            "mean_anomaly_score": round(float(np.mean(scores)), 4),
            "model_path": model_path
        }

    def train_nlp_complaint_classifier(self) -> Dict[str, Any]:
        """
        Trains a TF-IDF + Logistic Regression pipeline on labelled customer support tickets
        and reviews to automatically classify incoming complaints into operational issue categories.
        """
        tickets_path = os.path.join(self.dataset_dir, "support_tickets.csv")
        reviews_path = os.path.join(self.dataset_dir, "reviews.csv")

        docs = []
        labels = []

        if os.path.exists(tickets_path):
            t_df = pd.read_csv(tickets_path)
            for _, r in t_df.iterrows():
                text = str(r["complaint_text"]).strip()
                cat = str(r["issue_category"]).strip()
                if text and cat:
                    docs.append(text)
                    labels.append(cat)

        if os.path.exists(reviews_path):
            r_df = pd.read_csv(reviews_path)
            for _, r in r_df.iterrows():
                text = str(r["review_text"]).strip()
                cat = str(r["issue_category"]).strip()
                if text and cat:
                    docs.append(text)
                    labels.append(cat)

        if len(docs) < 10:
            raise ValueError("Insufficient labelled records for NLP training")

        X_train, X_test, y_train, y_test = train_test_split(
            docs, labels, test_size=0.25, random_state=42, stratify=labels
        )

        pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(max_features=1200, ngram_range=(1, 2), stop_words="english")),
            ("clf", LogisticRegression(max_iter=1000, random_state=42, C=1.5))
        ])

        pipeline.fit(X_train, y_train)

        # Performance evaluation
        y_pred = pipeline.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="weighted", zero_division=0)

        model_path = os.path.join(MODEL_DIR, "nlp_complaint_classifier.joblib")
        joblib.dump(pipeline, model_path)

        return {
            "model_type": "TF-IDF + LogisticRegression",
            "total_corpus_size": len(docs),
            "classes": sorted(list(set(labels))),
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "model_path": model_path
        }

    def train_abandonment_predictor(self) -> Dict[str, Any]:
        """
        Trains a Random Forest classifier predicting whether a customer session
        will abandon checkout based on attempt counts and duration.
        """
        path = os.path.join(self.dataset_dir, "checkout_sessions.csv")
        df = pd.read_csv(path)

        df["failed_attempts"] = df["failed_attempts"].fillna(0)
        df["total_attempts"] = df["total_attempts"].fillna(1)
        df["retry_ratio"] = df["failed_attempts"] / df["total_attempts"]
        df["duration"] = df["checkout_duration_minutes"].fillna(0)
        df["y"] = df["abandonment_flag"].astype(int)

        features = ["total_attempts", "failed_attempts", "retry_ratio", "duration"]
        X = df[features].values
        y = df["y"].values

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

        clf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
        clf.fit(X_train, y_train)

        y_pred = clf.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="binary", zero_division=0)

        model_path = os.path.join(MODEL_DIR, "abandonment_random_forest.joblib")
        joblib.dump({"model": clf, "features": features}, model_path)

        return {
            "model_type": "RandomForestClassifier",
            "samples": len(df),
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "model_path": model_path
        }

    def train_all(self) -> Dict[str, Any]:
        print("[ML Training] Training models on dataset files...")
        anomaly_res = self.train_silent_anomaly_model()
        nlp_res = self.train_nlp_complaint_classifier()
        abandon_res = self.train_abandonment_predictor()

        return {
            "status": "success",
            "silent_anomaly_detector": anomaly_res,
            "nlp_complaint_classifier": nlp_res,
            "abandonment_predictor": abandon_res
        }

if __name__ == "__main__":
    trainer = MLTrainer()
    results = trainer.train_all()
    print("\n--- Training Results ---")
    for k, v in results.items():
        print(f"{k}: {v}")
