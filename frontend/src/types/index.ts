export interface Company {
  id: string;
  name: string;
  industry: string;
  description: string;
}

export type UserRole = 'cx_manager' | 'business_analyst' | 'customer';

export interface DetectedSignal {
  id: string;
  company_id: string;
  signal_type: string;
  metric_name: string;
  baseline_value: number;
  detected_value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  status: string;
}

export interface RootCauseHypothesis {
  id: string;
  incident_id: string;
  title: string;
  description: string;
  confidence_score: number;
  supporting_evidence: string[];
  contradictory_evidence: string[];
  missing_evidence: string[];
  is_primary: boolean;
}

export interface CXIncident {
  id: string;
  company_id: string;
  title: string;
  description: string;
  status: 'investigating' | 'action_simulated' | 'approved' | 'recovering' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_customers_count: number;
  transaction_value_at_risk: number;
  created_at: string;
  updated_at: string;
}

export interface RecoveryAction {
  id: string;
  incident_id: string;
  title: string;
  action_type: string;
  description: string;
  decision_score: number;
  expected_benefit: number;
  operational_cost: number;
  operational_risk: 'low' | 'medium' | 'high';
  implementation_time_mins: number;
  approval_status: 'pending' | 'approved' | 'rejected' | 'executed';
  approved_by?: string;
  approved_at?: string;
  execution_result?: any;
  breakdown?: {
    impact_component: number;
    urgency_component: number;
    benefit_component: number;
    cost_penalty: number;
    risk_penalty: number;
  };
}

export interface InvestigationHistory {
  id: string;
  incident_id: string;
  version: number;
  trigger_type: string;
  injected_evidence_summary?: string;
  delta_explanation: string;
  created_at: string;
}

export interface RecoveryMetric {
  metric_name: string;
  pre_intervention: number;
  current_value: number;
  target_value: number;
  is_recovered: boolean;
  last_verified_at?: string;
}

export interface VerificationResult {
  incident_id: string;
  overall_recovered: boolean;
  recovery_progress_pct: number;
  metrics: RecoveryMetric[];
  verification_timestamp: string;
}

export interface ComplaintCluster {
  cluster_id: number;
  topic: string;
  item_count: number;
  top_keywords: string[];
  sample_items: string[];
}

