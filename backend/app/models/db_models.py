from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Company(Base):
    __tablename__ = "companies"
    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    industry = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserProfile(Base):
    __tablename__ = "user_profiles"
    id = Column(String(100), primary_key=True, index=True)
    email = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=True)
    role = Column(String(50), nullable=False) # cx_manager, business_analyst, customer
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Customer(Base):
    __tablename__ = "customers"
    id = Column(String(100), primary_key=True, index=True)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(255), nullable=True)
    tier = Column(String(50), default="standard")
    churn_risk_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class BehaviouralEvent(Base):
    __tablename__ = "behavioural_events"
    id = Column(String(100), primary_key=True, index=True)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False, index=True)
    customer_id = Column(String(100), ForeignKey("customers.id"), nullable=True, index=True)
    session_id = Column(String(100), nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    application_version = Column(String(50), nullable=True)
    device_type = Column(String(50), nullable=True)
    event_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(String(100), primary_key=True, index=True)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False, index=True)
    customer_id = Column(String(100), ForeignKey("customers.id"), nullable=True, index=True)
    order_id = Column(String(100), nullable=True, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    payment_method = Column(String(50), nullable=True)
    status = Column(String(50), nullable=False) # success, failed, pending, refunded
    gateway_id = Column(String(50), nullable=True)
    error_code = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class Order(Base):
    __tablename__ = "orders"
    id = Column(String(100), primary_key=True, index=True)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False, index=True)
    customer_id = Column(String(100), ForeignKey("customers.id"), nullable=True, index=True)
    status = Column(String(50), nullable=False)
    total_amount = Column(Float, nullable=False)
    items_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

class CustomerReview(Base):
    __tablename__ = "customer_reviews"
    id = Column(String(100), primary_key=True, index=True)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False, index=True)
    customer_id = Column(String(100), ForeignKey("customers.id"), nullable=True)
    product_id = Column(String(100), nullable=True)
    rating = Column(Integer, nullable=False)
    review_text = Column(Text, nullable=False)
    sentiment_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class SupportTicket(Base):
    __tablename__ = "support_tickets"
    id = Column(String(100), primary_key=True, index=True)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False, index=True)
    customer_id = Column(String(100), ForeignKey("customers.id"), nullable=True)
    order_id = Column(String(100), nullable=True)
    category = Column(String(100), nullable=False)
    priority = Column(String(50), default="medium")
    status = Column(String(50), default="open")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AppTelemetry(Base):
    __tablename__ = "app_telemetry"
    id = Column(String(100), primary_key=True, index=True)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False, index=True)
    endpoint = Column(String(255), nullable=False)
    status_code = Column(Integer, nullable=False)
    latency_ms = Column(Integer, nullable=False)
    version = Column(String(50), nullable=True)
    device_os = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ReleaseLog(Base):
    __tablename__ = "release_logs"
    id = Column(String(100), primary_key=True, index=True)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False, index=True)
    version = Column(String(50), nullable=False)
    deployed_at = Column(DateTime, nullable=False)
    changelog = Column(Text, nullable=True)
    commit_hash = Column(String(100), nullable=True)

class PaymentGatewayLog(Base):
    __tablename__ = "payment_gateway_logs"
    id = Column(String(100), primary_key=True, index=True)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False, index=True)
    gateway_id = Column(String(50), nullable=False)
    response_code = Column(String(50), nullable=True)
    latency_ms = Column(Integer, nullable=False)
    is_error = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DetectedSignal(Base):
    __tablename__ = "detected_signals"
    id = Column(String(100), primary_key=True, index=True)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False, index=True)
    signal_type = Column(String(100), nullable=False) # checkout_abandonment_spike, payment_retry_burst, gateway_latency_drift
    metric_name = Column(String(100), nullable=False)
    baseline_value = Column(Float, nullable=False)
    detected_value = Column(Float, nullable=False)
    severity = Column(String(50), default="high") # low, medium, high, critical
    detected_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="active")

class CXIncident(Base):
    __tablename__ = "cx_incidents"
    id = Column(String(100), primary_key=True, index=True)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="investigating") # investigating, action_simulated, approved, recovering, resolved
    severity = Column(String(50), default="high")
    affected_customers_count = Column(Integer, default=0)
    transaction_value_at_risk = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class IncidentEvidence(Base):
    __tablename__ = "incident_evidence"
    id = Column(String(100), primary_key=True, index=True)
    incident_id = Column(String(100), ForeignKey("cx_incidents.id"), nullable=False, index=True)
    source_type = Column(String(50), nullable=False) # telemetry, gateway_log, behavioural_event, review, ticket, release
    source_id = Column(String(100), nullable=False)
    summary = Column(Text, nullable=False)
    correlation_score = Column(Float, default=0.85)
    timestamp = Column(DateTime, default=datetime.utcnow)

class RootCauseHypothesis(Base):
    __tablename__ = "root_cause_hypotheses"
    id = Column(String(100), primary_key=True, index=True)
    incident_id = Column(String(100), ForeignKey("cx_incidents.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    confidence_score = Column(Float, nullable=False)
    supporting_evidence = Column(JSON, default=list)
    contradictory_evidence = Column(JSON, default=list)
    missing_evidence = Column(JSON, default=list)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class RecoveryAction(Base):
    __tablename__ = "recovery_actions"
    id = Column(String(100), primary_key=True, index=True)
    incident_id = Column(String(100), ForeignKey("cx_incidents.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    action_type = Column(String(100), nullable=False) # gateway_failover, release_rollback, customer_credit, retries_circuit_breaker
    description = Column(Text, nullable=False)
    decision_score = Column(Float, nullable=False)
    expected_benefit = Column(Float, nullable=False)
    operational_cost = Column(Float, nullable=False)
    operational_risk = Column(String(50), nullable=False) # low, medium, high
    implementation_time_mins = Column(Integer, nullable=False)
    approval_status = Column(String(50), default="pending") # pending, approved, rejected, executed
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    execution_result = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

class InvestigationHistory(Base):
    __tablename__ = "investigation_history"
    id = Column(String(100), primary_key=True, index=True)
    incident_id = Column(String(100), ForeignKey("cx_incidents.id"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    trigger_type = Column(String(100), nullable=False) # initial_detection, injected_evidence, operational_update
    previous_hypothesis_id = Column(String(100), nullable=True)
    revised_hypothesis_id = Column(String(100), nullable=True)
    injected_evidence_summary = Column(Text, nullable=True)
    delta_explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class RecoveryMetric(Base):
    __tablename__ = "recovery_metrics"
    id = Column(String(100), primary_key=True, index=True)
    incident_id = Column(String(100), ForeignKey("cx_incidents.id"), nullable=False, index=True)
    metric_name = Column(String(100), nullable=False)
    pre_intervention_value = Column(Float, nullable=False)
    current_value = Column(Float, nullable=False)
    target_value = Column(Float, nullable=False)
    is_recovered = Column(Boolean, default=False)
    last_verified_at = Column(DateTime, default=datetime.utcnow)

