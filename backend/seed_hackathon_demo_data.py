import os
import sys
import json
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.insert(0, os.path.abspath("backend"))

from app.services.supabase_client import get_supabase_client

def seed_hackathon_mock_data():
    client = get_supabase_client()
    if not client:
        print("[Supabase] Client could not be initialized.")
        return

    print("==================================================")
    print("  SEEDING HACKATHON DEMO DATA TO SUPABASE CLOUD")
    print("==================================================")

    # 1. Detected Signals (Covering all 3 company workspaces)
    print("\n1. Seeding Detected Signals...")
    signals = [
        # ShopSphere Signals
        {
            "id": "sig_ss_01",
            "company_id": "shopsphere",
            "signal_type": "isolation_forest_friction_cluster",
            "metric_name": "Machine Learning Friction Cluster",
            "baseline_value": 0.0,
            "detected_value": 38.6,
            "severity": "critical",
            "detected_at": (datetime.utcnow() - timedelta(minutes=45)).isoformat(),
            "status": "active"
        },
        {
            "id": "sig_ss_02",
            "company_id": "shopsphere",
            "signal_type": "silent_retry_storm",
            "metric_name": "Silent Payment Retry Rate Surge",
            "baseline_value": 4.2,
            "detected_value": 39.1,
            "severity": "critical",
            "detected_at": (datetime.utcnow() - timedelta(minutes=30)).isoformat(),
            "status": "active"
        },
        {
            "id": "sig_ss_03",
            "company_id": "shopsphere",
            "signal_type": "checkout_abandonment_spike",
            "metric_name": "Checkout Abandonment Rate",
            "baseline_value": 20.0,
            "detected_value": 64.1,
            "severity": "high",
            "detected_at": (datetime.utcnow() - timedelta(minutes=25)).isoformat(),
            "status": "active"
        },
        {
            "id": "sig_ss_04",
            "company_id": "shopsphere",
            "signal_type": "gateway_timeout_elevation",
            "metric_name": "Payment Gateway Alpha Latency",
            "baseline_value": 220.0,
            "detected_value": 4450.0,
            "severity": "high",
            "detected_at": (datetime.utcnow() - timedelta(minutes=20)).isoformat(),
            "status": "active"
        },
        # QuickCart Signals
        {
            "id": "sig_qc_01",
            "company_id": "quickcart",
            "signal_type": "dispatch_partner_deficit",
            "metric_name": "Zone-4 Active Rider Deficit",
            "baseline_value": 0.0,
            "detected_value": -42.0,
            "severity": "critical",
            "detected_at": (datetime.utcnow() - timedelta(minutes=35)).isoformat(),
            "status": "active"
        },
        {
            "id": "sig_qc_02",
            "company_id": "quickcart",
            "signal_type": "spoilage_cancellation_spike",
            "metric_name": "Fresh Produce Order Cancellations",
            "baseline_value": 2.1,
            "detected_value": 18.5,
            "severity": "high",
            "detected_at": (datetime.utcnow() - timedelta(minutes=15)).isoformat(),
            "status": "active"
        },
        # StyleBay Signals
        {
            "id": "sig_sb_01",
            "company_id": "stylebay",
            "signal_type": "reverse_logistics_lag",
            "metric_name": "3PL Return Intake Delay",
            "baseline_value": 1.5,
            "detected_value": 7.4,
            "severity": "high",
            "detected_at": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
            "status": "active"
        },
        {
            "id": "sig_sb_02",
            "company_id": "stylebay",
            "signal_type": "refund_backlog_surge",
            "metric_name": "Unprocessed Refund Queue Value",
            "baseline_value": 25000.0,
            "detected_value": 285000.0,
            "severity": "critical",
            "detected_at": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "status": "active"
        }
    ]
    for s in signals:
        client.table("detected_signals").upsert(s).execute()
    print(f" -> Pushed {len(signals)} signals across ShopSphere, QuickCart, & StyleBay.")

    # 2. CX Incidents
    print("\n2. Seeding CX Incidents...")
    incidents = [
        # ShopSphere
        {
            "id": "inc_ss_01",
            "company_id": "shopsphere",
            "title": "Elevated Checkout Dropouts & Payment Gateway Latency Spike",
            "description": "Multi-attempt payment retry storm and customer abandonment following gateway timeout cascade after deployment v2.4.0.",
            "status": "investigating",
            "severity": "critical",
            "affected_customers_count": 842,
            "transaction_value_at_risk": 412500.00
        },
        {
            "id": "inc_ss_02",
            "company_id": "shopsphere",
            "title": "Android UPI Intent Serialization Exception Loop",
            "description": "Localized dropouts on Android v2.4.0 app version during UPI payment confirmation handshake.",
            "status": "investigating",
            "severity": "high",
            "affected_customers_count": 315,
            "transaction_value_at_risk": 185000.00
        },
        # QuickCart
        {
            "id": "inc_qc_01",
            "company_id": "quickcart",
            "title": "Zone-4 Hub Fulfilment Delay & Fresh Produce Cancellation Spike",
            "description": "Flash thunderstorm causing delivery partner shortage and 15-minute SLA breach across South metro.",
            "status": "investigating",
            "severity": "critical",
            "affected_customers_count": 412,
            "transaction_value_at_risk": 142000.00
        },
        # StyleBay
        {
            "id": "inc_sb_01",
            "company_id": "stylebay",
            "title": "Reverse Logistics Intake Latency & Delayed Refund Escalations",
            "description": "3PL logistics partner EDI webhook outage delaying customer return intake and triggering automated refund holds.",
            "status": "investigating",
            "severity": "high",
            "affected_customers_count": 630,
            "transaction_value_at_risk": 285000.00
        }
    ]
    for inc in incidents:
        client.table("cx_incidents").upsert(inc).execute()
    print(f" -> Pushed {len(incidents)} high-impact incidents.")

    # 3. Root Cause Hypotheses
    print("\n3. Seeding Root-Cause Hypotheses...")
    hypotheses = [
        # ShopSphere - inc_ss_01
        {
            "id": "hyp_ss_01",
            "incident_id": "inc_ss_01",
            "title": "Downstream Payment Gateway Alpha Regional Outage",
            "description": "Regional fiber severance in South routing cluster caused Alpha Gateway HTTP 504 timeouts to spike from 0.2% to 38.6%, creating multi-attempt retry cascades.",
            "confidence_score": 0.89,
            "supporting_evidence": [
                "HTTP 504 timeout surge at 14:15 UTC (rate: 38.6%)",
                "Transaction retry loop count > 3 in 84% of failed checkouts",
                "Downstream gateway latency spike to 4,450ms"
            ],
            "contradictory_evidence": [
                "Internal Order Service DB connection pool healthy at 22% utilization"
            ],
            "missing_evidence": [],
            "is_primary": True
        },
        {
            "id": "hyp_ss_02",
            "incident_id": "inc_ss_01",
            "title": "Android UPI SDK Serialization Promise Timeout",
            "description": "Commit c4f89d2 introduced a 5000ms strict Promise timeout on Android UPI intent receiver without fallback handler.",
            "confidence_score": 0.74,
            "supporting_evidence": [
                "92% of affected customer sessions originated from Android devices",
                "Client-side stack traces indicate unresolved Promise in UPI payment bridge"
            ],
            "contradictory_evidence": [
                "iOS checkout sessions also exhibit elevated 504 rates (18%)"
            ],
            "missing_evidence": [],
            "is_primary": False
        },
        {
            "id": "hyp_ss_03",
            "incident_id": "inc_ss_01",
            "title": "Database Read Replica Replication Lag",
            "description": "PostgreSQL read replica synchronization delay under elevated checkout session query load.",
            "confidence_score": 0.31,
            "supporting_evidence": [
                "High checkout session generation volume"
            ],
            "contradictory_evidence": [
                "Primary DB CPU load remains stable at 38%",
                "Read replica replication lag strictly under 15ms"
            ],
            "missing_evidence": [],
            "is_primary": False
        },
        # QuickCart - inc_qc_01
        {
            "id": "hyp_qc_01",
            "incident_id": "inc_qc_01",
            "title": "Unscheduled Regional Rainstorm & Courier Absence",
            "description": "Doppler radar confirms localized flash flooding in Zone-4 dispatch radius, stranding 42% of active two-wheeler riders.",
            "confidence_score": 0.91,
            "supporting_evidence": [
                "Regional weather telemetry alert at 13:45",
                "Zone-4 active courier check-ins dropped by 42%",
                "Pending order queue in Dark Store #4 exceeded 400"
            ],
            "contradictory_evidence": [
                "Adjacent Hub 1 & Hub 2 maintaining 98% on-time delivery SLA"
            ],
            "missing_evidence": [],
            "is_primary": True
        },
        # StyleBay - inc_sb_01
        {
            "id": "hyp_sb_01",
            "incident_id": "inc_sb_01",
            "title": "3PL Courier Partner EDI Webhook Intake Failure",
            "description": "Third-party courier EDI integration endpoint failing to dispatch return package receipt webhooks to warehouse intake service.",
            "confidence_score": 0.88,
            "supporting_evidence": [
                "EDI webhook integration response code 502 Bad Gateway",
                "Over 630 returned parcels unacknowledged in intake pipeline for > 72 hours",
                "Customer return refund queue growing by 120 orders/hour"
            ],
            "contradictory_evidence": [
                "Physical courier vans delivered inventory to sorting hub"
            ],
            "missing_evidence": [],
            "is_primary": True
        }
    ]
    for h in hypotheses:
        client.table("root_cause_hypotheses").upsert(h).execute()
    print(f" -> Pushed {len(hypotheses)} root-cause hypotheses.")

    # 4. Recovery Actions (Decision Studio)
    print("\n4. Seeding Recovery Actions...")
    actions = [
        # ShopSphere - inc_ss_01
        {
            "id": "act_ss_01",
            "incident_id": "inc_ss_01",
            "title": "Dynamic Circuit Breaker Reroute to Payment Gateway Beta",
            "action_type": "circuit_breaker_reroute",
            "description": "Instantly shifts 100% of checkout payment traffic from degraded Alpha cluster to verified Beta Gateway with zero downtime.",
            "decision_score": 94.2,
            "expected_benefit": 95.0,
            "operational_cost": 12000.00,
            "operational_risk": "low",
            "implementation_time_mins": 5,
            "approval_status": "pending"
        },
        {
            "id": "act_ss_02",
            "incident_id": "inc_ss_01",
            "title": "Selective Session Throttling with Instant Cart Hold",
            "action_type": "session_throttling",
            "description": "Holds customer shopping cart reservations for 30 minutes while pacing checkout requests to prevent cascading gateway timeouts.",
            "decision_score": 81.5,
            "expected_benefit": 70.0,
            "operational_cost": 5000.00,
            "operational_risk": "medium",
            "implementation_time_mins": 15,
            "approval_status": "pending"
        },
        {
            "id": "act_ss_03",
            "incident_id": "inc_ss_01",
            "title": "Automated In-App Apology Voucher & Fallback UPI Link",
            "action_type": "customer_compensation",
            "description": "Dispatches automated SMS and WhatsApp recovery link with ₹150 apology store credit to all customers who experienced payment failures.",
            "decision_score": 76.0,
            "expected_benefit": 60.0,
            "operational_cost": 35000.00,
            "operational_risk": "low",
            "implementation_time_mins": 10,
            "approval_status": "pending"
        },
        # QuickCart - inc_qc_01
        {
            "id": "act_qc_01",
            "incident_id": "inc_qc_01",
            "title": "Zone-4 Dynamic Surge Incentive Allocation (₹40/delivery)",
            "action_type": "surge_incentive",
            "description": "Triggers automated ₹40 surge bonus per order to onboard 50+ backup delivery partners across Hub 4.",
            "decision_score": 92.0,
            "expected_benefit": 88.0,
            "operational_cost": 25000.00,
            "operational_risk": "low",
            "implementation_time_mins": 8,
            "approval_status": "pending"
        },
        {
            "id": "act_qc_02",
            "incident_id": "inc_qc_01",
            "title": "Geofenced Delivery Radius Compression (3km -> 1.5km)",
            "action_type": "radius_compression",
            "description": "Compresses active ordering radius around Hub 4 to protect 15-minute SLA on existing in-flight deliveries.",
            "decision_score": 83.5,
            "expected_benefit": 75.0,
            "operational_cost": 8000.00,
            "operational_risk": "medium",
            "implementation_time_mins": 5,
            "approval_status": "pending"
        },
        # StyleBay - inc_sb_01
        {
            "id": "act_sb_01",
            "incident_id": "inc_sb_01",
            "title": "Instant Wallet Refund on First Courier Pickup Scan",
            "action_type": "instant_refund",
            "description": "Bypasses warehouse intake delay by authorizing immediate store wallet refunds upon courier doorstep pickup scan.",
            "decision_score": 91.5,
            "expected_benefit": 92.0,
            "operational_cost": 15000.00,
            "operational_risk": "low",
            "implementation_time_mins": 10,
            "approval_status": "pending"
        }
    ]
    for act in actions:
        client.table("recovery_actions").upsert(act).execute()
    print(f" -> Pushed {len(actions)} decision actions.")

    # 5. Recovery Metrics Verification
    print("\n5. Seeding Recovery Metrics Verification...")
    metrics = [
        {
            "id": "rec_ss_01",
            "incident_id": "inc_ss_01",
            "metric_name": "Payment Retry Rate",
            "pre_intervention_value": 39.1,
            "current_value": 4.2,
            "target_value": 5.0,
            "is_recovered": True
        },
        {
            "id": "rec_ss_02",
            "incident_id": "inc_ss_01",
            "metric_name": "Checkout Abandonment Rate",
            "pre_intervention_value": 64.1,
            "current_value": 18.2,
            "target_value": 20.0,
            "is_recovered": True
        },
        {
            "id": "rec_ss_03",
            "incident_id": "inc_ss_01",
            "metric_name": "Gateway Latency (ms)",
            "pre_intervention_value": 4450.0,
            "current_value": 220.0,
            "target_value": 300.0,
            "is_recovered": True
        },
        {
            "id": "rec_ss_04",
            "incident_id": "inc_ss_01",
            "metric_name": "Customer Dropouts (Hourly)",
            "pre_intervention_value": 842.0,
            "current_value": 14.0,
            "target_value": 50.0,
            "is_recovered": True
        },
        # QuickCart
        {
            "id": "rec_qc_01",
            "incident_id": "inc_qc_01",
            "metric_name": "15-Min Delivery SLA Compliance",
            "pre_intervention_value": 58.0,
            "current_value": 94.5,
            "target_value": 92.0,
            "is_recovered": True
        },
        # StyleBay
        {
            "id": "rec_sb_01",
            "incident_id": "inc_sb_01",
            "metric_name": "Refund Cycle Time (Hours)",
            "pre_intervention_value": 72.0,
            "current_value": 2.5,
            "target_value": 6.0,
            "is_recovered": True
        }
    ]
    for m in metrics:
        client.table("recovery_metrics").upsert(m).execute()
    print(f" -> Pushed {len(metrics)} verification metrics.")

    # 6. Investigation History (Adaptation Lab Revision Audit Trail)
    print("\n6. Seeding Dynamic Adaptation History...")
    history_entries = [
        {
            "id": "hist_01",
            "incident_id": "inc_ss_01",
            "version": 1,
            "trigger_type": "initial_telemetry_scan",
            "previous_hypothesis_id": None,
            "revised_hypothesis_id": "hyp_ss_03",
            "injected_evidence_summary": "Initial baseline telemetry flagged sudden retry surge at 14:15 UTC.",
            "delta_explanation": "Initial heuristic flagged generic database replica latency based on concurrent query volume.",
            "created_at": (datetime.utcnow() - timedelta(minutes=60)).isoformat()
        },
        {
            "id": "hist_02",
            "incident_id": "inc_ss_01",
            "version": 2,
            "trigger_type": "gateway_audit_injection",
            "previous_hypothesis_id": "hyp_ss_03",
            "revised_hypothesis_id": "hyp_ss_01",
            "injected_evidence_summary": "Diagnostic Gateway Log #GW-9844 injected: External fiber outage in South cluster.",
            "delta_explanation": "Investigation revised to V2: Hypothesis shifted from internal DB load to Downstream Payment Gateway Alpha Timeout Cascade (Confidence: 89%).",
            "created_at": (datetime.utcnow() - timedelta(minutes=40)).isoformat()
        },
        {
            "id": "hist_03",
            "incident_id": "inc_ss_01",
            "version": 3,
            "trigger_type": "commit_diff_audit",
            "previous_hypothesis_id": "hyp_ss_01",
            "revised_hypothesis_id": "hyp_ss_01",
            "injected_evidence_summary": "Commit c4f89d2 diff analysis confirms Android UPI intent receiver timeout misconfiguration.",
            "delta_explanation": "Investigation revised to V3: Confirmed Gateway Alpha Circuit Breaker as primary recovery intervention with #1 decision score (94.2).",
            "created_at": (datetime.utcnow() - timedelta(minutes=15)).isoformat()
        }
    ]
    for h in history_entries:
        client.table("investigation_history").upsert(h).execute()
    print(f" -> Pushed {len(history_entries)} adaptation revision audit records.")

    # 7. Customer Support Tickets (For all 3 companies)
    print("\n7. Seeding Realistic Customer Tickets...")
    tickets = [
        # ShopSphere
        {
            "id": "tkt_demo_ss_01",
            "company_id": "shopsphere",
            "customer_id": "CUST-0001",
            "category": "Payment Issue",
            "priority": "critical",
            "status": "open",
            "title": "₹4,299 deducted via GPay but order showing payment failed",
            "description": "Money was deducted from my HDFC bank account during checkout, but the ShopSphere app froze on loading spinner and marked order as failed. Please confirm or refund.",
            "created_at": (datetime.utcnow() - timedelta(minutes=25)).isoformat()
        },
        {
            "id": "tkt_demo_ss_02",
            "company_id": "shopsphere",
            "customer_id": "CUST-0002",
            "category": "Checkout Freeze",
            "priority": "high",
            "status": "in_progress",
            "title": "Checkout screen freezes on step 3 payment intent",
            "description": "On Android app version 2.4.0, clicking Pay Now with UPI hangs indefinitely. Had to retry 4 times before giving up.",
            "created_at": (datetime.utcnow() - timedelta(minutes=18)).isoformat()
        },
        {
            "id": "tkt_demo_ss_03",
            "company_id": "shopsphere",
            "customer_id": "CUST-0003",
            "category": "Payment Issue",
            "priority": "medium",
            "status": "resolved",
            "title": "Double debit reversal request",
            "description": "Card charged twice for same order #ord_ss_0042. Circuit breaker refund received successfully.",
            "created_at": (datetime.utcnow() - timedelta(hours=3)).isoformat()
        },
        # QuickCart
        {
            "id": "tkt_demo_qc_01",
            "company_id": "quickcart",
            "customer_id": "CUST-0010",
            "category": "Delivery SLA",
            "priority": "critical",
            "status": "open",
            "title": "15-minute grocery order delayed by 45+ minutes in Zone-4",
            "description": "Ordered milk, eggs, and bread for breakfast. App shows partner assigned but rider has not moved due to rain.",
            "created_at": (datetime.utcnow() - timedelta(minutes=20)).isoformat()
        },
        # StyleBay
        {
            "id": "tkt_demo_sb_01",
            "company_id": "stylebay",
            "customer_id": "CUST-0020",
            "category": "Payment Issue",
            "priority": "high",
            "status": "open",
            "title": "Return picked up 4 days ago, refund still pending",
            "description": "Courier collected jacket on Tuesday. Courier tracking shows delivered to hub, but refund not reflected.",
            "created_at": (datetime.utcnow() - timedelta(hours=4)).isoformat()
        }
    ]
    for t in tickets:
        client.table("support_tickets").upsert(t).execute()
    print(f" -> Pushed {len(tickets)} demo support tickets.")

    print("\n==================================================")
    print("  ALL HACKATHON DEMO MOCK DATA SEEDED TO SUPABASE!")
    print("==================================================")

if __name__ == "__main__":
    seed_hackathon_mock_data()

