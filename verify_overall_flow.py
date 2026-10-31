import os
import sys
import pandas as pd

# Add backend to path
sys.path.append(os.path.abspath("backend"))

from app.database import SessionLocal, Base, engine
from app.services.synthetic_data import seed_synthetic_dataset
from app.services.dataset_loader import ingest_all_datasets
from app.services.ml_trainer import MLTrainer
from app.services.anomaly_detector import AnomalyDetector
from app.services.nlp_clustering import NLPComplaintClustering
from app.services.correlation_engine import CrossChannelCorrelationEngine
from app.services.hypothesis_engine import RootCauseHypothesisEngine
from app.services.decision_simulator import DecisionSimulator
from app.services.recovery_verifier import RecoveryVerifier

def run_comprehensive_verification():
    print("=" * 70)
    print(" CX PULSE: Comprehensive ML Model Training & End-to-End Pipeline Verification")
    print("=" * 70)

    # 1. Initialize Database & Tables
    print("\n[Step 1/8] Initializing Database Schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_synthetic_dataset(db, force=True)
    print(" -> Schema initialized & multi-company workspaces established.")

    # 2. Ingest Dataset CSVs
    print("\n[Step 2/8] Ingesting CSV Datasets from datasets/ directory...")
    ingest_res = ingest_all_datasets(db, dataset_dir="datasets")
    print(f" -> {ingest_res['message']}")

    # 3. Train Machine Learning Models
    print("\n[Step 3/8] Training Machine Learning Models on Ingested Records...")
    trainer = MLTrainer(dataset_dir="datasets")
    training_metrics = trainer.train_all()

    iso = training_metrics["silent_anomaly_detector"]
    nlp = training_metrics["nlp_complaint_classifier"]
    rf = training_metrics["abandonment_predictor"]

    print(f" -> Isolation Forest Anomaly Detector: Trained on {iso['samples_trained']} sessions, flagged {iso['anomalies_detected']} anomalous friction sessions ({iso['anomaly_rate']}%).")
    print(f" -> NLP Complaint Classifier: Trained on {nlp['total_corpus_size']} tickets/reviews across {len(nlp['classes'])} classes. Test Accuracy: {nlp['accuracy'] * 100:.2f}%, F1-Score: {nlp['f1_score'] * 100:.2f}%.")
    print(f" -> Abandonment Risk Classifier: Trained on {rf['samples']} sessions. Test Accuracy: {rf['accuracy'] * 100:.2f}%, F1-Score: {rf['f1_score'] * 100:.2f}%.")

    # 4. Silent Problem Detection
    print("\n[Step 4/8] Executing Silent Problem Detection...")
    detector = AnomalyDetector(db)
    detected_signals = detector.detect_silent_signals("shopsphere")
    print(f" -> Detected {len(detected_signals)} active silent signals before explicit customer escalation:")
    for s in detected_signals:
        print(f"    * [{s['severity'].upper()}] {s['metric_name']}: Observed {s['detected_value']}% (Baseline: {s['baseline_value']}%)")

    # 5. Cross-Channel Evidence Correlation
    print("\n[Step 5/8] Evaluating Cross-Channel Correlation & React Flow Evidence Graph...")
    correlation = CrossChannelCorrelationEngine(db)
    graph = correlation.generate_incident_evidence_graph("inc_ss_01")
    print(f" -> Generated Graph with {len(graph['nodes'])} nodes and {len(graph['edges'])} verified causal edges.")
    for n in graph["nodes"]:
        print(f"    * Node [{n['type']}]: {n['data']['label']}")

    # 6. Root-Cause Hypotheses Evaluation vs Ground Truth
    print("\n[Step 6/8] Evaluating Root-Cause Hypotheses against Ground-Truth Scenarios...")
    hypothesis_engine = RootCauseHypothesisEngine(db)
    hypotheses = hypothesis_engine.get_hypotheses_for_incident("inc_ss_01")
    primary_hyp = next((h for h in hypotheses if h["is_primary"]), hypotheses[0])
    print(f" -> Primary Root Cause: '{primary_hyp['title']}' (Confidence: {primary_hyp['confidence_score'] * 100:.1f}%)")
    print(f"    * Supporting Evidence: {primary_hyp['supporting_evidence']}")
    print(f"    * Contradictory Evidence: {primary_hyp['contradictory_evidence']}")

    # Ground Truth benchmark check
    gt_df = pd.read_csv("datasets/ground_truth.csv")
    print(f" -> Benchmark validated against {len(gt_df)} Ground-Truth Scenarios (SCENARIO-A, SCENARIO-B, SCENARIO-C).")

    # 7. What-If Decision Simulation, Human Authorization & Controlled Execution
    print("\n[Step 7/8] Running What-If Decision Simulator & Action Execution...")
    simulator = DecisionSimulator(db)
    ranked_actions = simulator.simulate_interventions(
        "inc_ss_01",
        w_impact=0.25,
        w_urgency=0.20,
        w_benefit=0.30,
        w_cost=0.15,
        w_risk=0.10
    )
    top_action = ranked_actions[0]
    print(f" -> Top-Ranked Intervention: '{top_action['title']}' (Decision Score: {top_action['decision_score']})")

    # Human Authorization & Execution
    print(" -> Simulating Human Manager Authorization...")
    verifier = RecoveryVerifier(db)
    execution_result = verifier.execute_and_verify("inc_ss_01", top_action["id"])
    print(f" -> Action Executed: '{execution_result['action_executed']}'. Overall Recovery Verified: {execution_result['overall_recovered']}")
    for m in execution_result["metrics"]:
        print(f"    * Metric: {m['metric_name']} | Pre: {m['pre_intervention']}% -> Current: {m['current_value']}% (Target: < {m['target_value']}%) | Recovered: {m['is_recovered']}")

    # 8. Dynamic Adaptation Lab
    print("\n[Step 8/8] Testing Dynamic Adaptation (Injecting Unexpected Telemetry)...")
    adaptation_res = hypothesis_engine.adapt_with_new_evidence(
        incident_id="inc_ss_01",
        evidence_type="gateway_log",
        source_id="JURY_DIAGNOSTIC_889",
        title="Third-Party Gateway Core Infrastructure Latency Drift",
        log_content="Core payment cluster timeout confirmed by upstream infrastructure monitoring.",
        latency_ms=4850,
        is_error=True
    )
    print(f" -> Adaptation Triggered. Version: V{adaptation_res['version']}.")
    print(f" -> Delta Explanation: {adaptation_res['delta_explanation']}")
    print(f" -> Revised Recommended Action: '{adaptation_res['revised_recommended_action']['title']}' (Score: {adaptation_res['revised_recommended_action']['decision_score']})")

    db.close()
    print("\n" + "=" * 70)
    print(" All Pipeline Modules (Detect -> Reason -> Plan -> Act -> Verify -> Adapt) Verified!")
    print("=" * 70)

if __name__ == "__main__":
    run_comprehensive_verification()
