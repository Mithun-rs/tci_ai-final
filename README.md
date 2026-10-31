# CX PULSE
## Customer Experience Predictive Understanding, Learning & Strategic Evaluation

From Silent Customer Signals to Adaptive Business Decisions.

---

## 1. System Overview

CX PULSE is an enterprise-grade AI intelligence platform designed to detect emerging customer experience degradation through silent behavioural signals and cross-channel operational evidence before explicit complaints surge.

The platform provides a unified multi-company web application supporting three distinct roles:
1. **Customer Portal**: Frictionless complaint reporting and real-time incident resolution tracking.
2. **CX Manager Console**: Operational oversight, risk detection alerts, What-If decision simulation, and authorized action execution.
3. **Business Analyst Studio**: Statistical anomaly telemetry, NLP feedback topic clustering, cross-channel evidence graph, and Dynamic Adaptation Lab.

---

## 2. Multi-Company Workspaces

The platform natively supports multi-tenant isolation across three business scenarios:
- **ShopSphere Retail**: Multi-category e-commerce retailer. Scenario: Payment gateway timeout cascade & checkout dropouts following deployment v2.4.0.
- **QuickCart Express**: Hyperlocal 15-minute grocery delivery. Scenario: Dispatch partner shortage and delivery SLA breach.
- **StyleBay Fashion**: Direct-to-consumer apparel marketplace. Scenario: Reverse logistics intake latency and refund processing bottleneck.

---

## 3. Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: FastAPI, Pydantic, SQLAlchemy, Scikit-learn (TF-IDF & K-Means), Pandas, NumPy
- **Database**: Supabase PostgreSQL compatible schema (with automatic local SQLite fallback for seamless out-of-the-box operation)
- **AI Engine**: Google Gemini API integration with deterministic verifiable fallback reasoning

---

## 4. Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Installation

1. **Backend Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Frontend Dependencies**:
   ```bash
   npm install
   ```

3. **Supabase Database Setup (Optional)**:
   - Create a project on [Supabase](https://supabase.com).
   - In Supabase SQL Editor, run the SQL script located at:
     `backend/sql/supabase_schema.sql`
   - Create a `.env` file in the root or `backend/` directory:
     ```env
     SUPABASE_URL=your_supabase_project_url
     SUPABASE_KEY=your_supabase_anon_or_service_key
     GEMINI_API_KEY=your_google_gemini_api_key
     ```
   *(If no `.env` is configured, CX PULSE automatically initializes the local SQLite database `cx_pulse.db` with full multi-company synthetic scenarios ready for demonstration).*

### Launching the Platform

Run the unified startup script:
```bash
python run_platform.py
```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **Swagger Documentation**: `http://localhost:8000/docs`

---

## 5. Demonstration Walkthrough (ShopSphere Scenario)

1. **Step 1 - Workspace Selection**: Select `ShopSphere Retail` in the top workspace selector.
2. **Step 2 - Silent Signal Discovery**: As CX Manager or Business Analyst, inspect the active silent signals:
   - Payment Retry Rate: **38.6%** (vs 4.2% baseline).
   - Checkout Abandonment Rate: **64.1%** (vs 18.5% baseline).
   - Exposure: 184 affected customer sessions; $24,850.00 at risk.
3. **Step 3 - Cross-Channel Correlation**: Switch to `Business Analyst` view to inspect the interactive Evidence Graph:
   `Silent Signal -> 504 Gateway Logs -> v2.4.0 Release -> Impacted Customers`.
4. **Step 4 - Competing Hypotheses**: Review the hypotheses matrix:
   - Hypothesis A: Primary Gateway Alpha Latency Spike (88% confidence).
   - Hypothesis B: Release v2.4.0 Checkout SDK Regression (45% confidence).
5. **Step 5 - What-If Decision Simulation**: Switch to `CX Manager` view and adjust weights (Impact, Urgency, Benefit, Cost, Risk) to evaluate interventions:
   - Action #1: Automated Failover to Gateway Beta (Score: 86.5).
   - Action #2: Release Rollback (Score: 48.0).
   - Action #3: Courtesy Credits & Push Notification (Score: 78.2).
6. **Step 6 - Human Authorization & Execution**:
   - Click **Authorize Action** on Action #1.
   - Click **Execute Recovery** to run the failover routing.
7. **Step 7 - Dynamic Adaptation Lab**:
   - In `Business Analyst` view, navigate to the Dynamic Adaptation Lab.
   - Inject external gateway provider status confirmation.
   - Observe how the AI engine recalculates confidence (Gateway Alpha to 96%, Release rollback deprioritized to 22.0) and logs an immutable audit version.
8. **Step 8 - Outcome Verification**:
   - Inspect the Operational Verification Status panel confirming that the Payment Retry Rate has recovered below 5.0% and the incident state is resolved.

