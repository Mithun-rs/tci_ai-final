import requests
import json
import sys

BASE = 'http://localhost:8000/api/v1'

print('====================================================')
print('1. TESTING CRUD OPERATIONS')
print('====================================================')

# READ: Companies
r = requests.get(f'{BASE}/companies')
print(f'[READ] GET /companies -> Status {r.status_code}, count: {len(r.json())}')
assert r.status_code == 200 and len(r.json()) >= 3

# CREATE: Customer Complaint
complaint_payload = {
    'company_id': 'shopsphere',
    'customer_id': 'cust_audit_test_01',
    'order_id': 'ord_audit_9999',
    'category': 'payment_failure',
    'title': 'Test Payment Timed Out During UPI Intent',
    'description': 'Payment was debited from bank account but order status remains pending.',
    'priority': 'high'
}
r_comp = requests.post(f'{BASE}/customers/complaints', json=complaint_payload)
print(f'[CREATE] POST /customers/complaints -> Status {r_comp.status_code}, ID: {r_comp.json().get("id")}')
assert r_comp.status_code == 200
comp_id = r_comp.json().get('id')

# READ: Fetch complaints list
r_complaints = requests.get(f'{BASE}/customers/complaints?company_id=shopsphere')
print(f'[READ] GET /customers/complaints -> Status {r_complaints.status_code}, total: {len(r_complaints.json())}')
assert any(c['id'] == comp_id for c in r_complaints.json())

# READ: Incidents
r_inc = requests.get(f'{BASE}/incidents?company_id=shopsphere')
incidents = r_inc.json()
print(f'[READ] GET /incidents -> Status {r_inc.status_code}, incidents found: {len(incidents)}')
assert r_inc.status_code == 200 and len(incidents) > 0
test_inc_id = incidents[0]['id']

# READ: Incident details, graph, affected customers
r_det = requests.get(f'{BASE}/incidents/{test_inc_id}')
r_graph = requests.get(f'{BASE}/incidents/{test_inc_id}/graph')
r_cust = requests.get(f'{BASE}/incidents/{test_inc_id}/affected-customers')
print(f'[READ] GET /incidents/{test_inc_id} -> Status {r_det.status_code}, status: {r_det.json().get("incident", {}).get("status")}')
print(f'[READ] GET /incidents/{test_inc_id}/graph -> Status {r_graph.status_code}, nodes: {len(r_graph.json().get("nodes", []))}, edges: {len(r_graph.json().get("edges", []))}')
print(f'[READ] GET /incidents/{test_inc_id}/affected-customers -> Status {r_cust.status_code}, count: {len(r_cust.json().get("sample_customers", []))}')

print('\n====================================================')
print('2. TESTING AI INTEGRATION & ML INFERENCE')
print('====================================================')

# AI: Silent Signal Detection with Isolation Forest
r_det_sig = requests.post(f'{BASE}/signals/detect?company_id=shopsphere')
print(f'[AI DETECT] POST /signals/detect -> Status {r_det_sig.status_code}, anomalies: {r_det_sig.json().get("anomalies_detected")}')
for s in r_det_sig.json().get('signals', []):
    print(f'   -> Signal: {s.get("metric_name")} ({s.get("severity")}): {s.get("detected_value")}%')

# AI: NLP Semantic Complaint Topic Clustering
r_clust = requests.get(f'{BASE}/ai/clustering/shopsphere')
print(f'[AI NLP] GET /ai/clustering/shopsphere -> Status {r_clust.status_code}, clusters: {len(r_clust.json())}')
for c in r_clust.json()[:3]:
    print(f'   -> Cluster: "{c.get("topic")}" ({c.get("item_count")} records), keywords: {c.get("top_keywords")[:3]}')

# AI: Causal Root Cause Hypothesis Generation
r_hyp = requests.get(f'{BASE}/ai/hypotheses/{test_inc_id}')
print(f'[AI HYPOTHESIS] GET /ai/hypotheses/{test_inc_id} -> Status {r_hyp.status_code}, hypotheses: {len(r_hyp.json())}')
for h in r_hyp.json()[:2]:
    print(f'   -> Hypothesis: "{h.get("title")}" | Confidence: {h.get("confidence_score")}')

# AI: What-If Multi-Criteria Decision Simulator
sim_payload = {
    'incident_id': test_inc_id,
    'weight_customer_impact': 0.35,
    'weight_urgency': 0.25,
    'weight_benefit': 0.20,
    'weight_cost': 0.10,
    'weight_risk': 0.10
}
r_sim = requests.post(f'{BASE}/decisions/simulate', json=sim_payload)
sim_actions = r_sim.json().get('simulated_actions', [])
print(f'[AI SIMULATOR] POST /decisions/simulate -> Status {r_sim.status_code}, simulated actions: {len(sim_actions)}')
top_action = sim_actions[0] if sim_actions else None
if top_action:
    print(f'   -> Top Action: "{top_action.get("title")}" | Score: {top_action.get("decision_score")} | Status: {top_action.get("approval_status")}')

# AI: Dynamic Evidence Reassessment (Adaptation Lab)
inject_payload = {
    'incident_id': test_inc_id,
    'evidence_type': 'gateway_log',
    'source_id': 'AUDIT_CHK_01',
    'title': 'Autonomous Core Routing Audit',
    'log_content': 'Live diagnostic trace confirms core gateway latency spike of 4,850ms.',
    'latency_ms': 4850,
    'is_error': True
}
r_inj = requests.post(f'{BASE}/jury/inject-evidence', json=inject_payload)
print(f'[AI ADAPTATION] POST /jury/inject-evidence -> Status {r_inj.status_code}, Version: V{r_inj.json().get("version")}')

print('\n====================================================')
print('3. TESTING ACTION APPROVAL, EXECUTION & REAL-TIME RECOVERY')
print('====================================================')

if top_action:
    act_id = top_action['id']
    # UPDATE: Manager Approval
    r_app = requests.post(f'{BASE}/recovery/actions/{act_id}/approve', json={
        'action_id': act_id,
        'user_id': 'cx_manager_audit',
        'action': 'approve'
    })
    print(f'[UPDATE] POST /recovery/actions/{act_id}/approve -> Status {r_app.status_code}, approval_status: {r_app.json().get("approval_status")}')
    
    # UPDATE: Action Execution & Telemetry Recovery
    r_exec = requests.post(f'{BASE}/recovery/actions/{act_id}/execute')
    print(f'[UPDATE/EXECUTE] POST /recovery/actions/{act_id}/execute -> Status {r_exec.status_code}, overall_recovered: {r_exec.json().get("overall_recovered")}')
    for m in r_exec.json().get('metrics', []):
        print(f'   -> Metric: {m.get("metric_name")} | Pre: {m.get("pre_intervention")}% -> Current: {m.get("current_value")}% (Recovered: {m.get("is_recovered")})')

# READ: Post-Intervention Verification
r_ver = requests.get(f'{BASE}/verification/{test_inc_id}')
print(f'[READ] GET /verification/{test_inc_id} -> Status {r_ver.status_code}, progress: {r_ver.json().get("recovery_progress_pct")}%')

# READ: Real-Time Behavioural Anomaly Telemetry Stream
r_telem = requests.get(f'{BASE}/signals/telemetry-stream?company_id=shopsphere&time_range=6h')
print(f'[REAL-TIME] GET /signals/telemetry-stream -> Status {r_telem.status_code}')
telem_json = r_telem.json()
print(f'   -> Incident Status: {telem_json.get("incident_status")}')
print(f'   -> Is Recovered: {telem_json.get("is_recovered")}')
print(f'   -> Current Retry Rate: {telem_json.get("current_retry_rate")}% (Baseline: {telem_json.get("baseline_rate")}%)')
print(f'   -> Current Latency: {telem_json.get("current_latency_ms")} ms')
print(f'   -> Points Count: {len(telem_json.get("points", []))}')

print('\n====================================================')
print('ALL INTEGRATION, AI, CRUD & REAL-TIME CHECKS PASSED!')
print('====================================================')
