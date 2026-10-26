# CareSure

> **AI-Assisted Hospital Revenue Assurance & Claim Verification Engine**  
> *A production-ready full-stack platform combining deterministic compliance rules, unsupervised outlier detection, and supervised risk classification to audit medical insurance claims before submission.*

[![Backend Tests](https://img.shields.io/badge/Node.js%20Tests-17%2F17%20Passed-success?style=flat-square&logo=node.js)](./backend)
[![AI Tests](https://img.shields.io/badge/Pytest%20Suite-25%2F25%20Passed-success?style=flat-square&logo=pytest)](./ai-service)
[![Newman Tests](https://img.shields.io/badge/Newman%20API-10%2F10%20Passed-success?style=flat-square&logo=postman)](./backend)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-forestgreen?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Runtime](https://img.shields.io/badge/AI%20Microservice-FastAPI%20Port%208000-009688?style=flat-square&logo=fastapi)](./ai-service)

---

## 1. Executive Summary

Hospital revenue leakage and claim denials cost health systems billions annually. Minor clerical errors, unbundled charges, duplicate line items, or missing diagnostic reports trigger immediate insurer repudiation or protracted audits.

**CareSure** solves this with a **Three-Tier Hybrid Verification Engine**:
1. **Deterministic Rule Engine (R01–R06):** Strict clinical and policy compliance validation.
2. **Unsupervised Anomaly Detection:** Isolation Forest identifying billing/stay outliers calibrated per medical procedure.
3. **Supervised Risk Classification:** Random Forest estimating the empirical probability of audit failure.

Every claim receives a transparent, explainable **0–100 Hybrid Risk Score** with itemized evidence cards, allowing hospital auditors to resolve discrepancies in minutes before submitting claims to insurers.

---

## 2. System Architecture & Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            HOSPITAL AUDITOR / BILLER                             │
│                  Uploads Claim CSV / Documents / Form Input                      │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         v
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     BACKEND MICROSERVICE (Node.js + Express 5)                   │
│                                (Port: 5000)                                      │
│                                                                                  │
│   • Auth & RBAC (JWT Access + HTTP-only Refresh Cookie, Timing-Safe Comparison)  │
│   • Ingestion & Validation (Zod Schemas, NoSQL Injection Sanitizer)              │
│   • Clinical Matching Engine (Cross-references Billing vs Procedures vs Reports) │
│   • Deterministic Rule Engine (Executes Rules R01 through R06)                   │
│   • MongoDB Atlas Persistence (Mongoose ODM, Strict Schemas, Compound Indexes)   │
└──────────────────┬───────────────────────────────────────────▲───────────────────┘
                   │                                           │
                   │  HTTP POST (Internal REST Handshake)      │ JSON Signals
                   │  Header: X-Service-Token (HMAC verified)  │ (Anomaly & ML Score)
                   v                                           │
┌──────────────────────────────────────────────────────────────┴───────────────────┐
│                       AI MICROSERVICE (Python + FastAPI)                         │
│                                (Port: 8000)                                      │
│                                                                                  │
│   • GET  /health   -> Readiness probe & Model availability verification          │
│   • POST /anomaly  -> Isolation Forest (Amount, Stay, Items per Procedure)       │
│   • POST /ml-risk  -> Random Forest Classifier (Probabilistic Audit Risk)        │
│   • POST /extract  -> Multipart Document Extraction & OCR Fallback Stub          │
│   • Explainability -> Statistical benchmark comparisons & Top driving factors    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

CareSure's backend and AI architecture is built strictly on modern, enterprise-grade stacks:

### Backend Engine
- **Runtime:** Node.js (Active LTS v20+)
- **Language:** TypeScript (Strict mode, `noImplicitAny: true`, ES Modules)
- **Framework:** Express 5 (`^5.3.0`)
- **Database:** **MongoDB** (MongoDB Atlas Cloud Cluster + Local In-Memory Fallback)
- **ODM:** Mongoose (`^9.11.3`)
- **Security & Hardening:**
  - `helmet` security headers
  - In-place NoSQL operator sanitization (stripping `$` and `.` to eliminate query injection)
  - Rate limiting (Global limiter + Dedicated Auth brute-force protection)
  - Timing-safe HMAC token authentication (`crypto.timingSafeEqual`)

### AI / Machine Learning Microservice
- **Runtime:** Python 3.10+
- **Framework:** FastAPI (`^0.115.0`) & Uvicorn ASGI server
- **Machine Learning Libraries:** `scikit-learn`, `numpy`, `pandas`, `joblib`
- **Algorithms:**
  - **Isolation Forest:** Unsupervised anomaly scoring normalized to $[0.0, 1.0]$
  - **Random Forest Classifier:** Supervised audit risk estimation ($n=300$ trees, class-balanced)
- **Pipeline:** Preprocessing Pipelines (`StandardScaler`, `ColumnTransformer`, `OrdinalEncoder`)

---

## 4. The Hybrid Scoring Formula (0 to 100)

Every claim is assessed across three distinct dimensions. The points are summed and mapped into clear operational risk bands:

$$\text{Final Claim Score} = \underbrace{\text{Rules Points (0--40)}}_{\text{Deterministic Violations}} + \underbrace{\text{ML Risk Points (0--35)}}_{\text{Audit Failure Probability}} + \underbrace{\text{Anomaly Points (0--25)}}_{\text{Statistical Billing Outlier}}$$

### Scoring Tiers

| Score Range | Risk Band | Validation Result | Workflow Action |
| :---: | :---: | :---: | :--- |
| **0 – 39** | **Low Risk** | `passed` | **Fast-Track Clearance:** Direct batch submission to insurer. |
| **40 – 69** | **Review** | `warnings` | **Human Review Queue:** Auditor verifies flagged warnings. |
| **70 – 100** | **High Risk** | `failed` | **Mandatory Audit:** Claim halted; documentation/pricing fix required. |

> **Safety Overrides:**
> 1. Any **High-Severity** rule violation (such as missing mandatory documents) automatically elevates the claim to at least `Review` regardless of numerical score.
> 2. If the AI microservice is temporarily offline, the backend gracefully falls back to rules-only scoring while restricting automated clearance (`aiSignalsAvailable: false`).

---

## 5. Deterministic Rules Reference (R01–R06)

| Rule ID | Rule Name | Category | Severity | Points | Trigger Logic |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **R01** | Missing Diagnostic Report | Missing Docs | **High** | **25** | Billed diagnostic service (e.g., CT scan, MRI) has no clinical report on file. |
| **R02** | Duplicate Billing | Duplicate-like | **High** | **20** | Identical billing item billed more than once on the same date for the same encounter. |
| **R03** | Amount Out of Benchmark | Unusual Amount | **Medium** | **15** | Billed amount exceeds procedure benchmark ceiling plus approved tolerance (>10%). |
| **R04** | Billing Gap | Data Mismatch | **Medium** | **15** | Documented clinical procedure was performed but never billed on the invoice. |
| **R05** | Date Inconsistency | Policy Issue | **Low** | **10** | Discharge date precedes admission date, or service date occurs outside the encounter. |
| **R06** | Missing Mandatory Document | Missing Docs | **Low** | **10** | Mandatory claim file missing (e.g. Discharge Summary or Detailed Itemized Bill). |

---

## 6. The Hero Claim (`CLM-2026-1041`)

The platform includes a pre-seeded representative demonstration case:

- **Patient:** Priya Singh (Patient ID: `PT-20981`, Encounter: `ENC-77120`)
- **Hospital:** Apollo Medical Center
- **Procedure:** Appendectomy (Billed: ₹2,45,800 / 24,580,000 paise)
- **Approved Benchmark:** ₹1,50,000 – ₹2,20,000 (Midpoint: ₹1,85,000)
- **Injected Inconsistency:** **CT Scan Abdomen** billed at ₹18,500 without a corresponding radiology diagnostic report.
- **Engine Execution:**
  - **Rule R01 Fires:** Missing diagnostic report $\rightarrow$ **25 pts**
  - **Supervised ML Model:** Predicts high audit likelihood $\rightarrow$ **28 pts** ($0.80 \times 35$)
  - **Isolation Forest:** Outlier stay & amount for appendectomy $\rightarrow$ **19 pts** ($0.76 \times 25$)
  - **Total Assessment:** $25 + 28 + 19 = \mathbf{72 / 100}$ (**High Risk Signals**, `validation: failed`)
- **Recommended Action:** *"Obtain the missing diagnostic report or confirm the service was not performed, then update billing."*

---

## 7. Quickstart & Local Setup

### Prerequisites
- **Node.js** v20.x or higher
- **Python** 3.10 or higher
- **MongoDB** (Atlas connection string or local MongoDB daemon)

---

### Step 1: Configure Environment Variables

1. **Backend (`backend/.env`):**
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@complete-backend.wf4zw9d.mongodb.net/backend
   JWT_ACCESS_SECRET=c1f4e7a3b8d9e2f5a6b0c4d8e1f3a5b7c9d2e4f6a8b0c2d4e6f8a1b3c5d7e9f1
   JWT_REFRESH_SECRET=e7b4a2d8f1c3e5a9b0d2f4a6c8e1b3d5f7a9c2e4b6d8f0a2c4e6b8d1f3a5c7e9
   CLIENT_URL=http://localhost:5173
   CORS_ORIGINS=http://localhost:5173
   AI_SERVICE_URL=http://localhost:8000
   AI_SERVICE_TOKEN=caresure_ai_secret_token_f932847a98d24b6189ef9
   AI_TIMEOUT_MS=5000
   DEMO_USER_PASSWORD=CareSureDemo2026!
   ```

2. **AI Microservice (`ai-service/.env`):**
   ```env
   HOST=0.0.0.0
   PORT=8000
   AI_SERVICE_TOKEN=caresure_ai_secret_token_f932847a98d24b6189ef9
   MODELS_DIR=./models
   LOG_LEVEL=info
   ```

---

### Step 2: Setup & Train the AI Models

Open your first terminal:

```powershell
cd ai-service

# Create and activate Python virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run model training pipeline (generates Isolation Forest & Random Forest binaries)
python -m training.train_models
```

---

### Step 3: Setup & Seed the Backend Database

Open your second terminal:

```powershell
cd backend

# Install dependencies
npm install

# Seed MongoDB Atlas with benchmark ranges, admin/reviewer accounts, and demo claims
npm run seed
```

---

### Step 4: Run Both Microservices

#### Terminal 1 — Start the Python AI Microservice (Port 8000)
```powershell
cd ai-service
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Terminal 2 — Start the Node.js Express Backend (Port 5000)
```powershell
cd backend
npm run dev
```

---

### Step 5: Verify Live System Readiness

In a terminal or browser, check the system handshake:

```powershell
curl http://localhost:5000/ready
```

**Expected Response:**
```json
{
  "status": "ready",
  "database": "connected (MongoDB)",
  "aiService": "connected"
}
```

---

## 8. Seed Demo Accounts

| Portal Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Auditor / Reviewer** | `reviewer@caresure.demo` | `CareSureDemo2026!` | Review queue, claim validation, decisions, notes |
| **System Admin** | `admin@caresure.demo` | `CareSureDemo2026!` | Threshold adjustment, rule configuration, audit logs |

---

## 9. API Reference Summary

### Backend API (`http://localhost:5000/api/v1`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/ready` | Readiness probe (checks MongoDB & AI service) | Public |
| `POST` | `/api/v1/auth/login` | Authenticate reviewer/admin and issue JWTs | Public |
| `GET` | `/api/v1/auth/me` | Fetch active user profile | Reviewer / Admin |
| `GET` | `/api/v1/claims` | List claims with pagination, filters, and search | Reviewer / Admin |
| `POST` | `/api/v1/claims` | Ingest draft claim record | Reviewer / Admin |
| `GET` | `/api/v1/claims/:id` | Get claim by ID with full timeline & evidence | Reviewer / Admin |
| `POST` | `/api/v1/claims/:id/validate` | Execute rules + AI hybrid scoring engine | Reviewer / Admin |
| `POST` | `/api/v1/claims/:id/decision` | Record auditor decision (`Approve`, `Request Docs`) | Reviewer / Admin |
| `GET` | `/api/v1/review-queue/queue` | Fetch pending claims sorted by risk score | Reviewer / Admin |
| `GET` | `/api/v1/dashboard/stats` | KPI metrics (rejection rate, total exposure) | Reviewer / Admin |
| `GET` | `/api/v1/analytics/overview` | Aggregated findings and rule violation trends | Reviewer / Admin |

### AI Microservice API (`http://localhost:8000`)

| Method | Endpoint | Description | Header Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/health` | Model status (`anomaly_model`, `risk_model`) | Public |
| `POST` | `/anomaly` | Unsupervised Isolation Forest anomaly detection | `X-Service-Token` |
| `POST` | `/ml-risk` | Supervised Random Forest risk prediction | `X-Service-Token` |
| `POST` | `/extract` | Document extraction & OCR fallback stub | `X-Service-Token` |

---

## 10. Automated Test Suites

The project features comprehensive end-to-end test coverage across all layers:

### 1. Backend Integration & Unit Suite (17 Tests)
```powershell
cd backend
npm test
```
*Tests rule execution (R01–R06), in-memory MongoDB persistence, hybrid scoring math, AI timeout resilience fallback, and timing-safe security utilities.*

### 2. Newman / Postman REST API Suite (10 Tests)
```powershell
cd backend
npm run test:postman
```
*Tests live HTTP endpoints: Authentication, token refresh, draft claim creation, review queue retrieval, and dashboard analytics.*

### 3. Python AI Microservice Pytest Suite (25 Tests)
```powershell
cd ai-service
pytest tests/ -v
```
*Tests FastAPI endpoints, constant-time HMAC token authentication, boundary score caps, negative amount input validation, and model inference contracts.*

---

## 11. Ethical AI & Compliance Disclosures

1. **Synthetic Data Disclosure:**  
   Due to patient confidentiality under the **Indian Digital Personal Data Protection (DPDP) Act** and **HIPAA**, ML models are trained on calibrated synthetic clinical claims generated according to standard Indian procedure cost baselines (Appendectomy, Cholecystectomy, Hernia Repair, Normal/Cesarean Delivery, Knee Replacement).
2. **Reviewer-Assistance Only:**  
   CareSure does **not** make autonomous claim denials or fraud accusations. All ML outputs and rule findings serve as explainable decision-support signals for accredited human hospital auditors.

---

## 12. License & Academic Attribution

Developed as an academic and enterprise engineering project for **AI-Assisted Hospital Revenue Assurance and Claim Verification**.

Licensed under the [MIT License](./LICENSE).
