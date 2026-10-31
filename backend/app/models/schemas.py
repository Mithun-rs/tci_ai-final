from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# Base & Auth Schemas
class UserProfileSchema(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str # cx_manager, business_analyst, customer
    company_id: Optional[str] = None

class CompanySchema(BaseModel):
    id: str
    name: str
    industry: str
    description: Optional[str] = None

# Customer & Feedback Schemas
class CustomerReviewCreate(BaseModel):
    company_id: str
    customer_id: Optional[str] = None
    product_id: Optional[str] = None
    rating: int = Field(..., ge=1, le=5)
    review_text: str

class SupportTicketCreate(BaseModel):
    company_id: str
    customer_id: Optional[str] = None
    order_id: Optional[str] = None
    category: str
    priority: Optional[str] = "medium"
    title: str
    description: str

class SupportTicketResponse(BaseModel):
    id: str
    company_id: str
    customer_id: Optional[str]
    order_id: Optional[str]
    category: str
    priority: str
    status: str
    title: str
    description: str
    created_at: datetime

# Telemetry and Behavioural Schemas
class BehaviouralEventCreate(BaseModel):
    company_id: str
    customer_id: Optional[str] = None
    session_id: str
    event_type: str
    application_version: Optional[str] = "2.4.0"
    device_type: Optional[str] = "mobile_web"
    event_metadata: Optional[Dict[str, Any]] = None

# Detection and Incident Schemas
class DetectedSignalResponse(BaseModel):
    id: str
    company_id: str
    signal_type: str
    metric_name: str
    baseline_value: float
    detected_value: float
    severity: str
    detected_at: datetime
    status: str

class IncidentEvidenceResponse(BaseModel):
    id: str
    incident_id: str
    source_type: str
    source_id: str
    summary: str
    correlation_score: float
    timestamp: datetime

class RootCauseHypothesisResponse(BaseModel):
    id: str
    incident_id: str
    title: str
    description: str
    confidence_score: float
    supporting_evidence: List[str]
    contradictory_evidence: List[str]
    missing_evidence: List[str]
    is_primary: bool

class CXIncidentResponse(BaseModel):
    id: str
    company_id: str
    title: str
    description: Optional[str]
    status: str
    severity: str
    affected_customers_count: int
    transaction_value_at_risk: float
    created_at: datetime
    updated_at: datetime
    signals: Optional[List[DetectedSignalResponse]] = []
    hypotheses: Optional[List[RootCauseHypothesisResponse]] = []
    evidence: Optional[List[IncidentEvidenceResponse]] = []

# Simulation and Recovery Schemas
class WhatIfSimulationRequest(BaseModel):
    incident_id: str
    weight_customer_impact: float = 0.25
    weight_urgency: float = 0.20
    weight_benefit: float = 0.30
    weight_cost: float = 0.15
    weight_risk: float = 0.10

class RecoveryActionResponse(BaseModel):
    id: str
    incident_id: str
    title: str
    action_type: str
    description: str
    decision_score: float
    expected_benefit: float
    operational_cost: float
    operational_risk: str
    implementation_time_mins: int
    approval_status: str
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    execution_result: Optional[Dict[str, Any]]

class ActionApprovalRequest(BaseModel):
    action_id: str
    user_id: str
    action: str = "approve" # approve, reject
    notes: Optional[str] = None

# Dynamic Evidence Injection
class JuryEvidenceInjection(BaseModel):
    incident_id: str
    evidence_type: str # gateway_log, network_telemetry, deployment_audit
    source_id: str
    title: str
    log_content: str
    latency_ms: Optional[int] = 4200
    is_error: Optional[bool] = True
    error_code: Optional[str] = "GATEWAY_TIMEOUT_504"

class DynamicAdaptationResponse(BaseModel):
    incident_id: str
    version: int
    trigger_type: str
    delta_explanation: str
    revised_hypotheses: List[RootCauseHypothesisResponse]
    revised_recommended_action: RecoveryActionResponse

# Verification Schemas
class VerificationResultResponse(BaseModel):
    incident_id: str
    overall_recovered: bool
    recovery_progress_pct: float
    metrics: List[Dict[str, Any]]
    verification_timestamp: datetime

