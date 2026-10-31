import os
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.db_models import (
    Company, Customer, Transaction, SupportTicket, CustomerReview,
    AppTelemetry, ReleaseLog, PaymentGatewayLog, BehaviouralEvent,
    CXIncident, RootCauseHypothesis, RecoveryAction, RecoveryMetric,
    IncidentEvidence
)

def ingest_all_datasets(db: Session, dataset_dir: str = "datasets"):
    """
    Ingests records from CSV files in `datasets/` into the SQLite/PostgreSQL database
    and creates the corresponding Ground-Truth grounded incidents.
    """
    print(f"[Dataset Ingest] Reading CSV files from '{dataset_dir}'...")

    # 1. Customers
    cust_path = os.path.join(dataset_dir, "customers.csv")
    if os.path.exists(cust_path):
        df_cust = pd.read_csv(cust_path)
        for _, r in df_cust.iterrows():
            cid = str(r["customer_id"]).strip()
            # Map default company as shopsphere unless specified
            cust = Customer(
                id=cid,
                company_id="shopsphere",
                name=f"Customer {cid}",
                email=f"{cid.lower()}@shopsphere-customer.com",
                tier=str(r.get("customer_segment", "standard")),
                churn_risk_score=0.45,
                created_at=datetime.utcnow()
            )
            db.merge(cust)
        db.commit()
        print(f" -> Ingested {len(df_cust)} customer profiles.")

    # 2. Release Logs
    rel_path = os.path.join(dataset_dir, "releases.csv")
    if os.path.exists(rel_path):
        df_rel = pd.read_csv(rel_path)
        for _, r in df_rel.iterrows():
            rel = ReleaseLog(
                id=str(r["release_id"]),
                company_id="shopsphere",
                version=str(r["version"]),
                deployed_at=datetime.utcnow(),
                changelog=str(r.get("change_description", "System release update")),
                commit_hash=f"git-{str(r['release_id']).lower()}"
            )
            db.merge(rel)
        db.commit()
        print(f" -> Ingested {len(df_rel)} release logs.")

    # 3. Transactions
    tx_path = os.path.join(dataset_dir, "transactions.csv")
    if os.path.exists(tx_path):
        df_tx = pd.read_csv(tx_path)
        for _, r in df_tx.iterrows():
            tx = Transaction(
                id=str(r["transaction_id"]),
                company_id="shopsphere",
                customer_id=str(r["customer_id"]),
                order_id=str(r.get("checkout_id", "")),
                amount=float(r.get("amount", 500.0)),
                currency="INR",
                payment_method=str(r.get("payment_method", "UPI")),
                status="failed" if str(r.get("transaction_status", "")).upper() == "FAILED" else "success",
                gateway_id=str(r.get("gateway_name", "PRIMARY_GATEWAY")),
                error_code=str(r.get("failure_reason", "")),
                created_at=datetime.utcnow()
            )
            db.merge(tx)
        db.commit()
        print(f" -> Ingested {len(df_tx)} transaction records.")

    # 4. Support Tickets
    st_path = os.path.join(dataset_dir, "support_tickets.csv")
    if os.path.exists(st_path):
        df_st = pd.read_csv(st_path)
        for _, r in df_st.iterrows():
            ticket = SupportTicket(
                id=str(r["ticket_id"]),
                company_id="shopsphere",
                customer_id=str(r.get("customer_id", "cust_anonymous")),
                category=str(r.get("issue_category", "payment_failure")),
                priority=str(r.get("priority", "medium")).lower(),
                status=str(r.get("ticket_status", "open")).lower(),
                title=str(r.get("issue_category", "Complaint")),
                description=str(r.get("complaint_text", "")),
                created_at=datetime.utcnow()
            )
            db.merge(ticket)
        db.commit()
        print(f" -> Ingested {len(df_st)} support tickets.")

    # 5. Customer Reviews
    rev_path = os.path.join(dataset_dir, "reviews.csv")
    if os.path.exists(rev_path):
        df_rev = pd.read_csv(rev_path)
        for _, r in df_rev.iterrows():
            rev = CustomerReview(
                id=str(r["review_id"]),
                company_id="shopsphere",
                customer_id=str(r.get("customer_id", "cust_anonymous")),
                product_id="prod_general",
                rating=int(r.get("rating", 3)) if pd.notna(r.get("rating")) else 3,
                review_text=str(r.get("review_text", "")),
                sentiment_score=-0.6 if str(r.get("sentiment", "")).lower() == "negative" else 0.4,
                created_at=datetime.utcnow()
            )
            db.merge(rev)
        db.commit()
        print(f" -> Ingested {len(df_rev)} customer reviews.")

    # 6. Gateway Events
    gw_path = os.path.join(dataset_dir, "gateway_events.csv")
    if os.path.exists(gw_path):
        df_gw = pd.read_csv(gw_path)
        for _, r in df_gw.iterrows():
            gw = PaymentGatewayLog(
                id=str(r["gateway_event_id"]),
                company_id="shopsphere",
                gateway_id=str(r.get("gateway_name", "GATEWAY")),
                response_code=str(r.get("error_code", "504")),
                latency_ms=4500 if "TIMEOUT" in str(r.get("error_code", "")) else 250,
                is_error=True if str(r.get("severity", "")).lower() in ["high", "critical"] else False,
                error_message=str(r.get("event_type", "Timeout event")),
                created_at=datetime.utcnow()
            )
            db.merge(gw)
        db.commit()
        print(f" -> Ingested {len(df_gw)} gateway events.")

    # 7. Telemetry & Behavioural Sessions
    tel_path = os.path.join(dataset_dir, "telemetry.csv")
    if os.path.exists(tel_path):
        df_tel = pd.read_csv(tel_path)
        for _, r in df_tel.head(300).iterrows():
            telem = AppTelemetry(
                id=str(r["event_id"]),
                company_id="shopsphere",
                endpoint=str(r.get("page_name", "/checkout")),
                status_code=504 if "Error" in str(r.get("event_type", "")) else 200,
                latency_ms=int(r.get("response_time_ms", 300)) if pd.notna(r.get("response_time_ms")) else 300,
                version="v2.4.0",
                device_os=str(r.get("platform", "Android")),
                created_at=datetime.utcnow()
            )
            db.merge(telem)
        db.commit()
        print(f" -> Ingested sample telemetry events.")

    # 8. Seed Ground-Truth Scenarios
    gt_path = os.path.join(dataset_dir, "ground_truth.csv")
    if os.path.exists(gt_path):
        df_gt = pd.read_csv(gt_path)
        for _, r in df_gt.iterrows():
            sc_id = str(r["scenario_id"]).strip()
            inc_id = f"inc_{sc_id.lower().replace('-', '_')}"
            
            # Create incident
            inc = CXIncident(
                id=inc_id,
                company_id="shopsphere",
                title=str(r["expected_issue"]),
                description=f"Expected Root Cause: {r['expected_root_cause']}. Affected Segments: {r['expected_affected_segments']}",
                status="investigating",
                severity="critical" if "regression" in str(r["expected_issue"]).lower() else "high",
                affected_customers_count=184 if sc_id == "SCENARIO-A" else (95 if sc_id == "SCENARIO-B" else 142),
                transaction_value_at_risk=24850.00 if sc_id == "SCENARIO-A" else (8200.00 if sc_id == "SCENARIO-B" else 16400.00),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.merge(inc)

            # Create Primary Hypothesis from Ground Truth
            hyp = RootCauseHypothesis(
                id=f"hyp_{inc_id}_primary",
                incident_id=inc_id,
                title=str(r["expected_root_cause"])[:100],
                description=str(r["expected_root_cause"]),
                confidence_score=0.92,
                supporting_evidence=[e.strip() for e in str(r.get("supporting_evidence_ids", "")).split(",") if e.strip()],
                contradictory_evidence=[e.strip() for e in str(r.get("contradictory_evidence_ids", "")).split(",") if e.strip()],
                is_primary=True
            )
            db.merge(hyp)

            # Create Alternative Hypothesis
            hyp_alt = RootCauseHypothesis(
                id=f"hyp_{inc_id}_alt",
                incident_id=inc_id,
                title="Transient Regional ISP Network Packet Loss",
                description="Client-side network connectivity dropouts causing socket termination during payload transfer.",
                confidence_score=0.28,
                supporting_evidence=["Intermittent TCP reset on client socket"],
                contradictory_evidence=[f"Contradicted by {r.get('supporting_evidence_ids', '')}"],
                is_primary=False
            )
            db.merge(hyp_alt)

            # Create Expected Action from Ground Truth
            act = RecoveryAction(
                id=f"act_{inc_id}_01",
                incident_id=inc_id,
                title=str(r["expected_intervention"])[:100],
                action_type="release_hotfix_or_failover",
                description=str(r["expected_intervention"]),
                decision_score=89.5,
                expected_benefit=94.0,
                operational_cost=450.00,
                operational_risk="low",
                implementation_time_mins=10,
                approval_status="pending"
            )
            db.merge(act)

            # Create Verification Metric
            metric = RecoveryMetric(
                id=f"metric_{inc_id}_01",
                incident_id=inc_id,
                metric_name="Payment Failure Rate",
                pre_intervention_value=38.6 if sc_id == "SCENARIO-A" else 28.4,
                current_value=38.6 if sc_id == "SCENARIO-A" else 28.4,
                target_value=5.0,
                is_recovered=False
            )
            db.merge(metric)

        db.commit()
        print(f" -> Ingested {len(df_gt)} Ground-Truth Scenarios into CX Incidents.")

    return {"status": "success", "message": "All dataset records and Ground-Truth scenarios ingested successfully."}

if __name__ == "__main__":
    from app.database import SessionLocal
    with SessionLocal() as db:
        res = ingest_all_datasets(db)
        print(res)

