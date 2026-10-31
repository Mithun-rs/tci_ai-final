import os
import sys
import json
import pandas as pd
from datetime import datetime

# Add backend directory to path
sys.path.insert(0, os.path.abspath("backend"))

from app.services.supabase_client import get_supabase_client
from app.database import SessionLocal
from app.models.db_models import (
    Company, CXIncident, RootCauseHypothesis, RecoveryAction,
    DetectedSignal, RecoveryMetric
)

def chunker(seq, size=100):
    return (seq[pos:pos + size] for pos in range(0, len(seq), size))

def push_all_datasets():
    client = get_supabase_client()
    if not client:
        print("[Supabase] Client could not be initialized. Check credentials in .env.")
        return

    print("==================================================")
    print("  PUSHING DATASETS TO BACKEND SUPABASE CLOUD")
    print("==================================================")

    # 1. Companies (Master table for FKs)
    print("\n1. Pushing Companies...")
    companies = [
        {
            "id": "shopsphere",
            "name": "ShopSphere Retail",
            "industry": "E-Commerce",
            "description": "Multi-category online retail platform serving 2.4M monthly active users."
        },
        {
            "id": "quickcart",
            "name": "QuickCart Express",
            "industry": "Hyperlocal Delivery",
            "description": "15-minute grocery and essentials delivery network across 8 metros."
        },
        {
            "id": "stylebay",
            "name": "StyleBay Fashion",
            "industry": "Apparel & Lifestyle",
            "description": "Direct-to-consumer fashion marketplace with next-day dispatch."
        }
    ]
    for comp in companies:
        client.table("companies").upsert(comp).execute()
    print(f" -> Pushed {len(companies)} companies successfully.")

    # 2. Customers
    cust_path = os.path.join("datasets", "customers.csv")
    if os.path.exists(cust_path):
        print(f"\n2. Pushing Customers from {cust_path}...")
        df_cust = pd.read_csv(cust_path)
        customer_rows = []
        for _, row in df_cust.iterrows():
            cid = str(row["customer_id"]).strip()
            customer_rows.append({
                "id": cid,
                "company_id": "shopsphere",
                "name": f"Customer {cid.replace('CUST-', '')}",
                "email": f"{cid.lower()}@shopsphere.in",
                "tier": str(row.get("customer_segment", "Standard")).lower()[:50],
                "churn_risk_score": 0.25 if str(row.get("customer_segment")) == "At-Risk" else 0.05,
                "created_at": str(row.get("registration_date", "2026-01-01")) + "T00:00:00Z"
            })
        
        count = 0
        for batch in chunker(customer_rows, 50):
            client.table("customers").upsert(batch).execute()
            count += len(batch)
        print(f" -> Pushed {count} customer records.")

    # 3. Transactions
    txn_path = os.path.join("datasets", "transactions.csv")
    if os.path.exists(txn_path):
        print(f"\n3. Pushing Transactions from {txn_path}...")
        df_txn = pd.read_csv(txn_path)
        txn_rows = []
        allowed_statuses = {"success", "failed", "pending", "refunded"}
        for _, row in df_txn.iterrows():
            status_val = str(row.get("transaction_status", "failed")).lower()
            if status_val not in allowed_statuses:
                status_val = "failed" if "fail" in status_val or "err" in status_val else "success"

            txn_rows.append({
                "id": str(row["transaction_id"]).strip(),
                "company_id": "shopsphere",
                "customer_id": str(row["customer_id"]).strip(),
                "order_id": str(row.get("checkout_id", "")),
                "amount": float(row.get("amount", 0.0)),
                "currency": "INR",
                "payment_method": str(row.get("payment_method", "UPI")),
                "status": status_val,
                "gateway_id": str(row.get("gateway_name", "PayU")),
                "error_code": str(row.get("failure_reason")) if pd.notna(row.get("failure_reason")) else None,
                "created_at": str(row.get("timestamp")) if pd.notna(row.get("timestamp")) else datetime.utcnow().isoformat()
            })

        count = 0
        for batch in chunker(txn_rows, 50):
            client.table("transactions").upsert(batch).execute()
            count += len(batch)
        print(f" -> Pushed {count} transaction records.")

    # 4. Support Tickets
    tkt_path = os.path.join("datasets", "support_tickets.csv")
    if os.path.exists(tkt_path):
        print(f"\n4. Pushing Support Tickets from {tkt_path}...")
        df_tkt = pd.read_csv(tkt_path)
        tkt_rows = []
        for _, row in df_tkt.iterrows():
            prio = str(row.get("priority", "medium")).lower()
            if prio not in {"low", "medium", "high", "critical"}:
                prio = "medium"
            
            status_val = str(row.get("ticket_status", "open")).lower()
            if status_val not in {"open", "in_progress", "resolved", "closed"}:
                status_val = "open"

            tkt_rows.append({
                "id": str(row["ticket_id"]).strip(),
                "company_id": "shopsphere",
                "customer_id": str(row["customer_id"]).strip(),
                "order_id": None,
                "category": str(row.get("issue_category", "Payment Failure")),
                "priority": prio,
                "status": status_val,
                "title": f"Issue: {str(row.get('issue_category', 'Payment Failure'))}",
                "description": str(row.get("complaint_text", "Customer reported checkout friction")),
                "created_at": str(row.get("timestamp")) if pd.notna(row.get("timestamp")) else datetime.utcnow().isoformat()
            })

        count = 0
        for batch in chunker(tkt_rows, 50):
            client.table("support_tickets").upsert(batch).execute()
            count += len(batch)
        print(f" -> Pushed {count} support ticket records.")

    # 5. Customer Reviews
    rev_path = os.path.join("datasets", "reviews.csv")
    if os.path.exists(rev_path):
        print(f"\n5. Pushing Reviews from {rev_path}...")
        df_rev = pd.read_csv(rev_path)
        rev_rows = []
        for _, row in df_rev.iterrows():
            rating = int(row.get("rating", 3))
            rating = max(1, min(5, rating))
            
            sentiment_str = str(row.get("sentiment", "Neutral")).lower()
            sent_score = 0.8 if "pos" in sentiment_str else (-0.8 if "neg" in sentiment_str else 0.0)

            rev_rows.append({
                "id": str(row["review_id"]).strip(),
                "company_id": "shopsphere",
                "customer_id": str(row["customer_id"]).strip(),
                "product_id": str(row.get("platform", "ShopSphere App")),
                "rating": rating,
                "review_text": str(row.get("review_text", "")),
                "sentiment_score": sent_score,
                "created_at": str(row.get("timestamp")) if pd.notna(row.get("timestamp")) else datetime.utcnow().isoformat()
            })

        count = 0
        for batch in chunker(rev_rows, 50):
            client.table("customer_reviews").upsert(batch).execute()
            count += len(batch)
        print(f" -> Pushed {count} customer review records.")

    # 6. Payment Gateway Logs
    gw_path = os.path.join("datasets", "gateway_events.csv")
    if os.path.exists(gw_path):
        print(f"\n6. Pushing Gateway Logs from {gw_path}...")
        df_gw = pd.read_csv(gw_path)
        gw_rows = []
        for _, row in df_gw.iterrows():
            err_code = str(row.get("error_code", "OK"))
            is_err = err_code != "OK" and err_code != "nan"
            gw_rows.append({
                "id": str(row["gateway_event_id"]).strip(),
                "company_id": "shopsphere",
                "gateway_id": str(row.get("gateway_name", "PayU")),
                "response_code": err_code if pd.notna(row.get("error_code")) else "200_OK",
                "latency_ms": 4200 if is_err else 240,
                "is_error": is_err,
                "error_message": f"{str(row.get('event_type'))} in region {str(row.get('affected_region'))} ({str(row.get('severity'))})",
                "created_at": str(row.get("start_time")) if pd.notna(row.get("start_time")) else datetime.utcnow().isoformat()
            })

        count = 0
        for batch in chunker(gw_rows, 50):
            client.table("payment_gateway_logs").upsert(batch).execute()
            count += len(batch)
        print(f" -> Pushed {count} payment gateway log records.")

    # 7. Release Logs
    rel_path = os.path.join("datasets", "releases.csv")
    if os.path.exists(rel_path):
        print(f"\n7. Pushing Release Logs from {rel_path}...")
        df_rel = pd.read_csv(rel_path)
        rel_rows = []
        for _, row in df_rel.iterrows():
            rel_rows.append({
                "id": str(row["release_id"]).strip(),
                "company_id": "shopsphere",
                "version": str(row.get("version", "v2.4.0")),
                "deployed_at": str(row.get("deployment_time", datetime.utcnow().isoformat())),
                "changelog": f"{str(row.get('component'))}: {str(row.get('change_description'))} [{str(row.get('release_status'))}]",
                "commit_hash": f"git_{str(row.get('release_id')).lower()}"
            })

        count = 0
        for batch in chunker(rel_rows, 50):
            client.table("release_logs").upsert(batch).execute()
            count += len(batch)
        print(f" -> Pushed {count} release log records.")

    # 8. Checkout Sessions -> Behavioural Events
    cs_path = os.path.join("datasets", "checkout_sessions.csv")
    if os.path.exists(cs_path):
        print(f"\n8. Pushing Behavioural Events from {cs_path}...")
        df_cs = pd.read_csv(cs_path)
        cs_rows = []
        for _, row in df_cs.iterrows():
            cs_rows.append({
                "id": str(row["checkout_id"]).strip(),
                "company_id": "shopsphere",
                "customer_id": str(row["customer_id"]).strip(),
                "session_id": str(row["checkout_id"]).strip(),
                "event_type": f"checkout_{str(row.get('final_checkout_status', 'completed')).lower()}",
                "application_version": "v2.4.0",
                "device_type": "Mobile",
                "event_metadata": {
                    "total_attempts": int(row.get("total_attempts", 1)),
                    "failed_attempts": int(row.get("failed_attempts", 0)),
                    "abandoned": bool(row.get("abandonment_flag", False)),
                    "duration_minutes": float(row.get("checkout_duration_minutes", 1.0))
                },
                "created_at": datetime.utcnow().isoformat()
            })

        count = 0
        for batch in chunker(cs_rows, 50):
            client.table("behavioural_events").upsert(batch).execute()
            count += len(batch)
        print(f" -> Pushed {count} behavioural event records.")

    # 9. Application Telemetry (First 150 sampled rows)
    tel_path = os.path.join("datasets", "telemetry.csv")
    if os.path.exists(tel_path):
        print(f"\n9. Pushing App Telemetry from {tel_path} (sampling first 150 points)...")
        df_tel = pd.read_csv(tel_path).head(150)
        tel_rows = []
        for _, row in df_tel.iterrows():
            resp_time = int(row.get("response_time_ms", 200))
            err_code = str(row.get("error_code", "OK_200"))
            status_c = 200 if "OK" in err_code else 500

            tel_rows.append({
                "id": str(row["event_id"]).strip(),
                "company_id": "shopsphere",
                "endpoint": str(row.get("page_name", "Checkout_Payment")),
                "status_code": status_c,
                "latency_ms": resp_time,
                "version": "v2.4.0",
                "device_os": str(row.get("platform", "Android")),
                "created_at": str(row.get("timestamp")) if pd.notna(row.get("timestamp")) else datetime.utcnow().isoformat()
            })

        count = 0
        for batch in chunker(tel_rows, 50):
            client.table("app_telemetry").upsert(batch).execute()
            count += len(batch)
        print(f" -> Pushed {count} app telemetry records.")

    # 10. Operational Incidents, Hypotheses, Recovery Actions & Verification
    print("\n10. Syncing Operational Scenarios (Incidents, Hypotheses, Actions, Signals)...")
    db = SessionLocal()
    try:
        # Detected signals
        signals = db.query(DetectedSignal).all()
        for s in signals:
            client.table("detected_signals").upsert({
                "id": s.id,
                "company_id": s.company_id,
                "signal_type": s.signal_type,
                "metric_name": s.metric_name,
                "baseline_value": s.baseline_value,
                "detected_value": s.detected_value,
                "severity": s.severity,
                "detected_at": s.detected_at.isoformat() if s.detected_at else datetime.utcnow().isoformat(),
                "status": s.status
            }).execute()
        print(f" -> Pushed {len(signals)} detected signals.")

        # Incidents
        incidents = db.query(CXIncident).all()
        for inc in incidents:
            client.table("cx_incidents").upsert({
                "id": inc.id,
                "company_id": inc.company_id,
                "title": inc.title,
                "description": inc.description,
                "status": inc.status,
                "severity": inc.severity,
                "affected_customers_count": inc.affected_customers_count,
                "transaction_value_at_risk": float(inc.transaction_value_at_risk)
            }).execute()
        print(f" -> Pushed {len(incidents)} incidents.")

        # Hypotheses
        hypotheses = db.query(RootCauseHypothesis).all()
        for h in hypotheses:
            client.table("root_cause_hypotheses").upsert({
                "id": h.id,
                "incident_id": h.incident_id,
                "title": h.title,
                "description": h.description,
                "confidence_score": float(h.confidence_score),
                "supporting_evidence": h.supporting_evidence,
                "contradictory_evidence": h.contradictory_evidence,
                "missing_evidence": h.missing_evidence,
                "is_primary": bool(h.is_primary)
            }).execute()
        print(f" -> Pushed {len(hypotheses)} root-cause hypotheses.")

        # Recovery Actions
        actions = db.query(RecoveryAction).all()
        for a in actions:
            client.table("recovery_actions").upsert({
                "id": a.id,
                "incident_id": a.incident_id,
                "title": a.title,
                "action_type": a.action_type,
                "description": a.description,
                "decision_score": float(a.decision_score),
                "expected_benefit": float(a.expected_benefit),
                "operational_cost": float(a.operational_cost),
                "operational_risk": a.operational_risk,
                "implementation_time_mins": int(a.implementation_time_mins),
                "approval_status": a.approval_status
            }).execute()
        print(f" -> Pushed {len(actions)} recovery actions.")

        # Recovery Metrics
        metrics = db.query(RecoveryMetric).all()
        for m in metrics:
            client.table("recovery_metrics").upsert({
                "id": m.id,
                "incident_id": m.incident_id,
                "metric_name": m.metric_name,
                "pre_intervention_value": float(m.pre_intervention_value),
                "current_value": float(m.current_value),
                "target_value": float(m.target_value),
                "is_recovered": bool(m.is_recovered)
            }).execute()
        print(f" -> Pushed {len(metrics)} recovery metrics.")

    finally:
        db.close()

    print("\n==================================================")
    print("  ALL DATASETS PUSHED TO SUPABASE CLOUD SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    push_all_datasets()
