-- CX PULSE: Multi-Company Customer Experience Intelligence Platform
-- PostgreSQL / Supabase Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Companies / Workspaces
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Profiles & Roles
CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(150),
    role VARCHAR(50) NOT NULL CHECK (role IN ('cx_manager', 'business_analyst', 'customer', 'admin')),
    company_id VARCHAR(50) REFERENCES companies(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customers
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    tier VARCHAR(50) DEFAULT 'standard',
    churn_risk_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Behavioural Events
CREATE TABLE IF NOT EXISTS behavioural_events (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id VARCHAR(100) REFERENCES customers(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    application_version VARCHAR(50),
    device_type VARCHAR(50),
    event_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id VARCHAR(100) REFERENCES customers(id) ON DELETE CASCADE,
    order_id VARCHAR(100),
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(50),
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'refunded')),
    gateway_id VARCHAR(50),
    error_code VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Orders
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id VARCHAR(100) REFERENCES customers(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    items_count INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Customer Reviews
CREATE TABLE IF NOT EXISTS customer_reviews (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id VARCHAR(100) REFERENCES customers(id) ON DELETE CASCADE,
    product_id VARCHAR(100),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT NOT NULL,
    sentiment_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id VARCHAR(100) REFERENCES customers(id) ON DELETE CASCADE,
    order_id VARCHAR(100),
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'open',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Application Telemetry
CREATE TABLE IF NOT EXISTS app_telemetry (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    status_code INT NOT NULL,
    latency_ms INT NOT NULL,
    version VARCHAR(50),
    device_os VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Release Logs
CREATE TABLE IF NOT EXISTS release_logs (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    deployed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    changelog TEXT,
    commit_hash VARCHAR(100)
);

-- 11. Payment Gateway Logs
CREATE TABLE IF NOT EXISTS payment_gateway_logs (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    gateway_id VARCHAR(50) NOT NULL,
    response_code VARCHAR(50),
    latency_ms INT NOT NULL,
    is_error BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Detected Silent Signals (Behavioural Anomalies)
CREATE TABLE IF NOT EXISTS detected_signals (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    signal_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    baseline_value FLOAT NOT NULL,
    detected_value FLOAT NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);

-- 13. CX Incidents
CREATE TABLE IF NOT EXISTS cx_incidents (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'investigating' CHECK (status IN ('investigating', 'action_simulated', 'approved', 'recovering', 'resolved')),
    severity VARCHAR(50) DEFAULT 'high',
    affected_customers_count INT DEFAULT 0,
    transaction_value_at_risk NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Incident Evidence Links
CREATE TABLE IF NOT EXISTS incident_evidence (
    id VARCHAR(100) PRIMARY KEY,
    incident_id VARCHAR(100) NOT NULL REFERENCES cx_incidents(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    summary TEXT NOT NULL,
    correlation_score FLOAT DEFAULT 0.85,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Root Cause Hypotheses
CREATE TABLE IF NOT EXISTS root_cause_hypotheses (
    id VARCHAR(100) PRIMARY KEY,
    incident_id VARCHAR(100) NOT NULL REFERENCES cx_incidents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    confidence_score FLOAT NOT NULL,
    supporting_evidence JSONB DEFAULT '[]'::jsonb,
    contradictory_evidence JSONB DEFAULT '[]'::jsonb,
    missing_evidence JSONB DEFAULT '[]'::jsonb,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Decision Scenarios & Recovery Actions
CREATE TABLE IF NOT EXISTS recovery_actions (
    id VARCHAR(100) PRIMARY KEY,
    incident_id VARCHAR(100) NOT NULL REFERENCES cx_incidents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    decision_score FLOAT NOT NULL,
    expected_benefit FLOAT NOT NULL,
    operational_cost NUMERIC(12, 2) NOT NULL,
    operational_risk VARCHAR(50) NOT NULL,
    implementation_time_mins INT NOT NULL,
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'executed')),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    execution_result JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Investigation History (Adaptation Delta Logs)
CREATE TABLE IF NOT EXISTS investigation_history (
    id VARCHAR(100) PRIMARY KEY,
    incident_id VARCHAR(100) NOT NULL REFERENCES cx_incidents(id) ON DELETE CASCADE,
    version INT NOT NULL,
    trigger_type VARCHAR(100) NOT NULL,
    previous_hypothesis_id VARCHAR(100),
    revised_hypothesis_id VARCHAR(100),
    injected_evidence_summary TEXT,
    delta_explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Recovery Metrics Verification
CREATE TABLE IF NOT EXISTS recovery_metrics (
    id VARCHAR(100) PRIMARY KEY,
    incident_id VARCHAR(100) NOT NULL REFERENCES cx_incidents(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    pre_intervention_value FLOAT NOT NULL,
    current_value FLOAT NOT NULL,
    target_value FLOAT NOT NULL,
    is_recovered BOOLEAN DEFAULT FALSE,
    last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

