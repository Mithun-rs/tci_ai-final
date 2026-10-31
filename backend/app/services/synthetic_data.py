import uuid
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.db_models import (
    Company, Customer, BehaviouralEvent, Transaction, Order,
    CustomerReview, SupportTicket, AppTelemetry, ReleaseLog,
    PaymentGatewayLog, DetectedSignal, CXIncident, IncidentEvidence,
    RootCauseHypothesis, RecoveryAction, RecoveryMetric, InvestigationHistory
)

COMPANIES = [
    {
        "id": "shopsphere",
        "name": "ShopSphere Retail",
        "industry": "General E-Commerce",
        "description": "Multi-category online retail platform serving 2.4M monthly active users."
    },
    {
        "id": "quickcart",
        "name": "QuickCart Express",
        "industry": "Instant Grocery Delivery",
        "description": "15-minute hyperlocal grocery delivery network across metropolitan hubs."
    },
    {
        "id": "stylebay",
        "name": "StyleBay Fashion",
        "industry": "Apparel & Lifestyle",
        "description": "Direct-to-consumer fashion marketplace featuring designer apparel and footwear."
    }
]

def seed_synthetic_dataset(db: Session, force: bool = False):
    # Check if companies already seeded
    existing_company = db.query(Company).first()
    if existing_company and not force:
        return {"status": "already_seeded", "message": "Synthetic datasets already loaded."}

    # 1. Seed Companies
    for c in COMPANIES:
        comp = db.query(Company).filter(Company.id == c["id"]).first()
        if not comp:
            comp = Company(**c)
            db.add(comp)
    db.commit()

    # 2. Seed ShopSphere Primary Scenario: "Hidden Payment Gateway Crisis"
    seed_shopsphere_scenario(db)
    # 3. Seed QuickCart Scenario: "Hyperlocal Fulfilment & Delivery Disruption"
    seed_quickcart_scenario(db)
    # 4. Seed StyleBay Scenario: "Reverse Logistics & Refund Pipeline Bottleneck"
    seed_stylebay_scenario(db)

    return {"status": "success", "message": "Multi-company synthetic datasets seeded successfully."}

def seed_shopsphere_scenario(db: Session):
    company_id = "shopsphere"
    base_time = datetime.utcnow() - timedelta(hours=6)

    # A. Customers (50 realistic enterprise profiles)
    customers = []
    tiers = ["standard", "silver", "gold", "vip_platinum"]
    for i in range(1, 61):
        c_id = f"cust_ss_{i:03d}"
        cust = Customer(
            id=c_id,
            company_id=company_id,
            name=f"Customer {i}",
            email=f"user_{i}@shopsphere-customer.com",
            tier=random.choice(tiers),
            churn_risk_score=round(random.uniform(0.12, 0.78), 2),
            created_at=base_time - timedelta(days=random.randint(10, 180))
        )
        db.merge(cust)
        customers.append(cust)
    db.commit()

    # B. Software Release Log (Triggering context: v2.4.0 checkout deployment)
    release = ReleaseLog(
        id="rel_ss_240",
        company_id=company_id,
        version="v2.4.0",
        deployed_at=base_time - timedelta(hours=4),
        changelog="Optimized one-click checkout workflow and upgraded payment gateway SDK integrations.",
        commit_hash="c4f89d2"
    )
    db.merge(release)

    # C. Payment Gateway Logs: Gateway-A degraded latency and timeouts
    gateways = ["GATEWAY_ALPHA", "GATEWAY_BETA"]
    for i in range(1, 101):
        is_alpha = (i % 2 == 0)
        gw = "GATEWAY_ALPHA" if is_alpha else "GATEWAY_BETA"
        # Alpha experiences severe degradation after release
        is_err = is_alpha and (i > 20)
        latency = random.randint(3400, 5200) if is_err else random.randint(180, 420)
        err_msg = "GATEWAY_HTTP_504_GATEWAY_TIMEOUT" if is_err else None
        
        gw_log = PaymentGatewayLog(
            id=f"gw_ss_{i:04d}",
            company_id=company_id,
            gateway_id=gw,
            response_code="504" if is_err else "200",
            latency_ms=latency,
            is_error=is_err,
            error_message=err_msg,
            created_at=base_time + timedelta(minutes=i * 3)
        )
        db.merge(gw_log)

    # D. Behavioural Events (Silent Signals: high checkout abandons & payment retries)
    for i in range(1, 301):
        cust = random.choice(customers)
        sess = f"sess_ss_{random.randint(100, 999)}"
        # Normal vs degraded event distribution
        if i < 100:
            etype = random.choice(["checkout_started", "payment_attempted", "transaction_completed"])
        else:
            # Anomaly period: repeated retries and abandonment
            etype = random.choice(["checkout_started", "payment_attempted", "payment_retry", "payment_retry", "checkout_abandoned"])

        ev = BehaviouralEvent(
            id=f"bev_ss_{i:04d}",
            company_id=company_id,
            customer_id=cust.id,
            session_id=sess,
            event_type=etype,
            application_version="v2.4.0" if i > 80 else "v2.3.9",
            device_type=random.choice(["mobile_ios", "mobile_android", "desktop_chrome"]),
            event_metadata={"step": "payment_sheet", "retry_count": random.randint(2, 5) if "retry" in etype else 0},
            created_at=base_time + timedelta(minutes=i)
        )
        db.merge(ev)

    # E. Transactions
    for i in range(1, 121):
        cust = random.choice(customers)
        is_failed = (i > 35 and i % 3 != 0)
        amt = round(random.uniform(45.0, 380.0), 2)
        tx = Transaction(
            id=f"tx_ss_{i:04d}",
            company_id=company_id,
            customer_id=cust.id,
            order_id=f"ord_ss_{i:04d}",
            amount=amt,
            currency="USD",
            payment_method="GATEWAY_ALPHA" if i % 2 == 0 else "GATEWAY_BETA",
            status="failed" if is_failed else "success",
            gateway_id="GATEWAY_ALPHA" if i % 2 == 0 else "GATEWAY_BETA",
            error_code="ERR_PG_TIMEOUT" if is_failed else None,
            created_at=base_time + timedelta(minutes=i * 2)
        )
        db.merge(tx)

    # F. Support Tickets (Explicit complaints arrive later)
    complaints = [
        ("Payment Deducted but Order Not Confirmed", "I attempted payment twice for my cart ($185.00). Amount was debited but the screen kept loading with a gateway error."),
        ("Checkout Fails Repeatedly on v2.4", "Every time I tap confirm order, the page hangs at 99% and returns to checkout without order confirmation."),
        ("Double Charge on Credit Card", "Card debited twice due to retry button freezing during checkout."),
        ("Checkout Page Stalling", "Tried three times with Alpha Gateway, transaction failed with 504 timeout.")
    ]
    for idx, (title, desc) in enumerate(complaints, start=1):
        ticket = SupportTicket(
            id=f"tkt_ss_{idx:03d}",
            company_id=company_id,
            customer_id=customers[idx].id,
            order_id=f"ord_ss_{idx:04d}",
            category="payment_failure",
            priority="high",
            status="open",
            title=title,
            description=desc,
            created_at=base_time + timedelta(hours=3, minutes=idx * 15)
        )
        db.merge(ticket)

    # G. App Telemetry
    for i in range(1, 51):
        telem = AppTelemetry(
            id=f"tel_ss_{i:03d}",
            company_id=company_id,
            endpoint="/api/v1/checkout/process-payment",
            status_code=504 if i > 15 else 200,
            latency_ms=random.randint(4100, 5800) if i > 15 else random.randint(220, 380),
            version="v2.4.0",
            device_os="iOS/Android",
            created_at=base_time + timedelta(minutes=i * 5)
        )
        db.merge(telem)

    # H. Initial Detected Silent Signal
    sig = DetectedSignal(
        id="sig_ss_001",
        company_id=company_id,
        signal_type="payment_retry_burst",
        metric_name="Payment Retry Rate",
        baseline_value=4.2,
        detected_value=38.6,
        severity="critical",
        detected_at=base_time + timedelta(hours=2),
        status="active"
    )
    sig2 = DetectedSignal(
        id="sig_ss_002",
        company_id=company_id,
        signal_type="checkout_abandonment_spike",
        metric_name="Checkout Abandonment Rate",
        baseline_value=18.5,
        detected_value=64.1,
        severity="high",
        detected_at=base_time + timedelta(hours=2, minutes=15),
        status="active"
    )
    db.merge(sig)
    db.merge(sig2)

    # I. Seed Initial Primary Incident
    inc = CXIncident(
        id="inc_ss_01",
        company_id=company_id,
        title="Elevated Checkout Dropouts & Payment Gateway Latency Spike",
        description="Silent behavioural anomaly detected: 38.6% retry rate accompanied by 504 gateway timeouts on primary payment processor.",
        status="investigating",
        severity="critical",
        affected_customers_count=184,
        transaction_value_at_risk=24850.00,
        created_at=base_time + timedelta(hours=2, minutes=30),
        updated_at=base_time + timedelta(hours=2, minutes=30)
    )
    db.merge(inc)

    # J. Initial Hypotheses for Incident
    hyp1 = RootCauseHypothesis(
        id="hyp_ss_01",
        incident_id="inc_ss_01",
        title="Primary Gateway (ALPHA) Latency Spike & Cascading 504 Timeouts",
        description="Gateway Alpha upstream response times exceeded 4,000ms threshold post-14:00 UTC, causing checkout microservice timeouts.",
        confidence_score=0.88,
        supporting_evidence=["gw_ss_0022 (504 timeout)", "tel_ss_016 (endpoint latency 4850ms)", "bev_ss_0120 (payment_retry burst)"],
        contradictory_evidence=["Gateway Beta operational with 210ms latency"],
        missing_evidence=["Third-party provider status dashboard confirmation"],
        is_primary=True
    )
    hyp2 = RootCauseHypothesis(
        id="hyp_ss_02",
        incident_id="inc_ss_01",
        title="Application Release v2.4.0 Checkout SDK Regression",
        description="New SDK payload format introduced in v2.4.0 causing intermittent handshake serialization delays.",
        confidence_score=0.45,
        supporting_evidence=["rel_ss_240 deployed 4 hours ago"],
        contradictory_evidence=["Failures isolate specifically to Alpha Gateway; Beta transactions complete successfully on v2.4.0"],
        missing_evidence=["Client-side stack traces for unhandled exceptions"],
        is_primary=False
    )
    db.merge(hyp1)
    db.merge(hyp2)

    # K. Seed Decision Scenarios (What-If Recovery Actions)
    act1 = RecoveryAction(
        id="act_ss_01",
        incident_id="inc_ss_01",
        title="Automated Failover: Reroute 100% Traffic to Gateway Beta",
        action_type="gateway_failover",
        description="Shift active checkout traffic away from degraded Gateway Alpha to redundant Gateway Beta with immediate health check ping.",
        decision_score=86.5,
        expected_benefit=92.0,
        operational_cost=150.00,
        operational_risk="low",
        implementation_time_mins=3,
        approval_status="pending"
    )
    act2 = RecoveryAction(
        id="act_ss_02",
        incident_id="inc_ss_01",
        title="Roll Back Release v2.4.0 to Stable Release v2.3.9",
        action_type="release_rollback",
        description="Revert mobile web bundle and checkout microservices to previous stable commit c1b90aa.",
        decision_score=48.0,
        expected_benefit=55.0,
        operational_cost=1200.00,
        operational_risk="high",
        implementation_time_mins=25,
        approval_status="pending"
    )
    act3 = RecoveryAction(
        id="act_ss_03",
        incident_id="inc_ss_01",
        title="Issue $15 Courtesy Credit & Proactive Push Notification to 184 Affected Customers",
        action_type="customer_credit",
        description="Notify affected customers whose transactions timed out with one-click re-order voucher to preserve loyalty.",
        decision_score=78.2,
        expected_benefit=85.0,
        operational_cost=2760.00,
        operational_risk="low",
        implementation_time_mins=5,
        approval_status="pending"
    )
    db.merge(act1)
    db.merge(act2)
    db.merge(act3)

    # L. Recovery Metric Baseline
    rm1 = RecoveryMetric(
        id="rec_ss_01",
        incident_id="inc_ss_01",
        metric_name="Payment Retry Rate",
        pre_intervention_value=38.6,
        current_value=38.6,
        target_value=5.0,
        is_recovered=False
    )
    rm2 = RecoveryMetric(
        id="rec_ss_02",
        incident_id="inc_ss_01",
        metric_name="Checkout Abandonment Rate",
        pre_intervention_value=64.1,
        current_value=64.1,
        target_value=20.0,
        is_recovered=False
    )
    db.merge(rm1)
    db.merge(rm2)

    db.commit()

def seed_quickcart_scenario(db: Session):
    company_id = "quickcart"
    base_time = datetime.utcnow() - timedelta(hours=4)

    # QuickCart customer profiles
    for i in range(1, 31):
        cust = Customer(
            id=f"cust_qc_{i:03d}",
            company_id=company_id,
            name=f"Grocery Shopper {i}",
            email=f"qc_user_{i}@quickcart-express.com",
            tier="gold" if i % 3 == 0 else "standard",
            churn_risk_score=round(random.uniform(0.1, 0.6), 2),
            created_at=base_time - timedelta(days=random.randint(5, 60))
        )
        db.merge(cust)

    # QuickCart Signal: Dispatch SLA Latency Spike
    sig = DetectedSignal(
        id="sig_qc_001",
        company_id=company_id,
        signal_type="delivery_dispatch_delay",
        metric_name="Average Dispatch Time (Minutes)",
        baseline_value=8.4,
        detected_value=27.8,
        severity="high",
        detected_at=base_time + timedelta(hours=1),
        status="active"
    )
    db.merge(sig)

    # Incident
    inc = CXIncident(
        id="inc_qc_01",
        company_id=company_id,
        title="Zone-4 Hub Fulfilment Delay & Fresh Produce Cancellation Spike",
        description="Fulfillment partner driver deficit at East Hub leading to dispatch bottleneck and order dropouts.",
        status="investigating",
        severity="high",
        affected_customers_count=92,
        transaction_value_at_risk=4180.00,
        created_at=base_time + timedelta(hours=1, minutes=15),
        updated_at=base_time + timedelta(hours=1, minutes=15)
    )
    db.merge(inc)

    db.commit()

def seed_stylebay_scenario(db: Session):
    company_id = "stylebay"
    base_time = datetime.utcnow() - timedelta(hours=5)

    # StyleBay customer profiles
    for i in range(1, 31):
        cust = Customer(
            id=f"cust_sb_{i:03d}",
            company_id=company_id,
            name=f"Apparel Client {i}",
            email=f"sb_client_{i}@stylebay-apparel.com",
            tier="vip_platinum" if i % 4 == 0 else "silver",
            churn_risk_score=round(random.uniform(0.2, 0.7), 2),
            created_at=base_time - timedelta(days=random.randint(15, 90))
        )
        db.merge(cust)

    # StyleBay Signal: Return Approval Latency
    sig = DetectedSignal(
        id="sig_sb_001",
        company_id=company_id,
        signal_type="refund_processing_bottleneck",
        metric_name="Return Verification Days",
        baseline_value=1.5,
        detected_value=5.8,
        severity="medium",
        detected_at=base_time + timedelta(hours=2),
        status="active"
    )
    db.merge(sig)

    # Incident
    inc = CXIncident(
        id="inc_sb_01",
        company_id=company_id,
        title="Reverse Logistics Intake Latency & Unprocessed Return Inquiries",
        description="Warehouse scanning backlog causing delay in credit issuance for autumn apparel returns.",
        status="investigating",
        severity="medium",
        affected_customers_count=64,
        transaction_value_at_risk=8920.00,
        created_at=base_time + timedelta(hours=2, minutes=20),
        updated_at=base_time + timedelta(hours=2, minutes=20)
    )
    db.merge(inc)

    db.commit()

