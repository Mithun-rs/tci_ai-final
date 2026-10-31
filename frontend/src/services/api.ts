const API_BASE_URL = 'http://localhost:8000/api/v1';

export const api = {
  // Companies
  getCompanies: async () => {
    const res = await fetch(`${API_BASE_URL}/companies`);
    return res.json();
  },

  resetDataset: async () => {
    const res = await fetch(`${API_BASE_URL}/companies/reset-dataset`, { method: 'POST' });
    return res.json();
  },

  // Signals & Real-Time Telemetry
  getSignals: async (companyId: string) => {
    const res = await fetch(`${API_BASE_URL}/signals?company_id=${companyId}`);
    return res.json();
  },

  getRealtimeTelemetry: async (companyId: string, incidentId?: string, timeRange: string = '6h', pointsCount = 10) => {
    let url = `${API_BASE_URL}/signals/telemetry-stream?company_id=${encodeURIComponent(companyId)}&time_range=${timeRange}&points_count=${pointsCount}`;
    if (incidentId) {
      url += `&incident_id=${encodeURIComponent(incidentId)}`;
    }
    const res = await fetch(url);
    return res.json();
  },

  simulateBurst: async (companyId: string) => {
    const res = await fetch(`${API_BASE_URL}/signals/simulate-burst?company_id=${encodeURIComponent(companyId)}`, {
      method: 'POST'
    });
    return res.json();
  },

  detectSignals: async (companyId: string) => {
    const res = await fetch(`${API_BASE_URL}/signals/detect?company_id=${companyId}`, { method: 'POST' });
    return res.json();
  },

  // Incidents
  getIncidents: async (companyId: string) => {
    const res = await fetch(`${API_BASE_URL}/incidents?company_id=${companyId}`);
    return res.json();
  },

  getIncidentDetails: async (incidentId: string) => {
    const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}`);
    return res.json();
  },

  getIncidentGraph: async (incidentId: string) => {
    const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/graph`);
    return res.json();
  },

  getAffectedCustomers: async (incidentId: string) => {
    const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/affected-customers`);
    return res.json();
  },

  // Hypotheses and Clustering
  getHypotheses: async (incidentId: string) => {
    const res = await fetch(`${API_BASE_URL}/ai/hypotheses/${incidentId}`);
    return res.json();
  },

  getClusters: async (companyId: string) => {
    const res = await fetch(`${API_BASE_URL}/ai/clustering/${companyId}`);
    return res.json();
  },

  // Decisions
  simulateDecisions: async (incidentId: string, weights?: any) => {
    const res = await fetch(`${API_BASE_URL}/decisions/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: incidentId,
        weight_customer_impact: weights?.impact ?? 0.25,
        weight_urgency: weights?.urgency ?? 0.20,
        weight_benefit: weights?.benefit ?? 0.30,
        weight_cost: weights?.cost ?? 0.15,
        weight_risk: weights?.risk ?? 0.10
      })
    });
    return res.json();
  },

  // Recovery & Actions
  approveAction: async (actionId: string, userId: string, action: 'approve' | 'reject') => {
    const res = await fetch(`${API_BASE_URL}/recovery/actions/${actionId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_id: actionId, user_id: userId, action })
    });
    return res.json();
  },

  executeAction: async (actionId: string) => {
    const res = await fetch(`${API_BASE_URL}/recovery/actions/${actionId}/execute`, { method: 'POST' });
    return res.json();
  },

  // Adaptation Lab (Dynamic Evidence)
  injectEvidence: async (data: {
    incident_id: string;
    evidence_type: string;
    source_id: string;
    title: string;
    log_content: string;
    latency_ms?: number;
    is_error?: boolean;
  }) => {
    const res = await fetch(`${API_BASE_URL}/jury/inject-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getInvestigationHistory: async (incidentId: string) => {
    const res = await fetch(`${API_BASE_URL}/jury/history/${incidentId}`);
    return res.json();
  },

  // Verification
  getVerification: async (incidentId: string) => {
    const res = await fetch(`${API_BASE_URL}/verification/${incidentId}`);
    return res.json();
  },

  // Customer Feedback
  submitComplaint: async (data: {
    company_id: string;
    customer_id?: string;
    order_id?: string;
    category: string;
    title: string;
    description: string;
    priority?: string;
  }) => {
    const res = await fetch(`${API_BASE_URL}/customers/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getComplaints: async (companyId: string) => {
    const res = await fetch(`${API_BASE_URL}/customers/complaints?company_id=${companyId}`);
    return res.json();
  },

  getSupabaseStatus: async () => {
    const res = await fetch(`${API_BASE_URL}/supabase/status`);
    return res.json();
  }
};

