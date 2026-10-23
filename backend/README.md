<<<<<<< HEAD
# CareSure

CareSure is a React and Vite prototype for reviewing medical insurance claim records. The New Claim flow parses an uploaded CSV in the browser, sends its rows to an Express audit endpoint, and displays the returned risk levels and discrepancies in the Human Review Queue.

> The CSV audit flow is connected to the backend. Other dashboard and individual claim views still contain prototype data. This project does not make automated approval, rejection, or fraud decisions.

## Project services

- `frontend/`: React and Vite web application.
- `backend/`: Express audit API, with its request handling split into routes, controllers, validators, and services.
- `ai-service/`: FastAPI service scaffold with a health endpoint; AI/OCR/NLP/ML functionality is not implemented or connected to the audit flow yet.
- `backend/prisma/schema.prisma`: PostgreSQL persistence schema scaffold; the current API does not persist data.

## Run locally

Start the backend in one terminal:

```powershell
cd backend
npm install
npm run dev
```

The audit API listens at `http://127.0.0.1:8000`; check `http://127.0.0.1:8000/health` for its health status.

Start the frontend in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. The frontend sends audit requests to `http://127.0.0.1:8000/api/audit/batch`.

To run the FastAPI service locally, install `ai-service/requirements.txt` in a Python 3.10+ environment, then run:

```powershell
cd ai-service
python -m uvicorn app.main:app --reload --port 8001
```

The AI-service health endpoint is at `http://127.0.0.1:8001/health`; interactive API documentation is at `http://127.0.0.1:8001/docs`.

To build and start all three services with Docker Compose, run `docker compose up --build` from the project root. The frontend is available at `http://localhost:4173`, the audit API at `http://localhost:8000`, and the AI service at `http://localhost:8001`.

## Audit a claims CSV

1. Open **New Claim** in the app.
2. Choose a CSV file and select **Start AI Validation**.
3. When the backend responds, the app opens the **Human Review Queue** with one audit card per patient and encounter.

The CSV should contain a header row with these columns:

| Column | Description |
| --- | --- |
| `claim_id` | Claim identifier |
| `patient_id` | Patient identifier |
| `encounter_id` | Encounter identifier |
| `service_date` | Date of the service |
| `record_type` | For example, `billing`, `clinical`, `diagnostic`, or `procedure` |
| `description` | Service or record description |
| `billed_amount` | Billed amount as a number |

The frontend normalizes common aliases such as `CLAIM_ID`, `PATIENT`, `ENCOUNTER`, `DATE`, `RECORD_TYPE`, `DESCRIPTION`, and `TOTAL_CLAIM_COST`. It reports missing required columns before submission and does not invent missing field values; provide the columns above for meaningful audit results.

An example CSV is included at [`frontend/public/sample_test_claims.csv`](./frontend/public/sample_test_claims.csv). It includes an undocumented billed service and a repeated charge to demonstrate the backend's missing-documentation and duplicate-billing checks.

The backend groups records by patient and encounter. A billing description without a matching clinical, diagnostic, or procedure record is flagged; repeated billing entries with the same description and amount are also flagged. The API returns each group's `claim_id`, `patient_id`, `encounter_id`, `risk_level`, `discrepancies`, and `status`. Discrepancies and risk levels are reviewer-assistance signals only.

## Other prototype flows

The sign-in screen is a demo entry point, not real authentication. Dashboard metrics, analytics, and individual claim detail screens also use sample or mock content. Audit results are held in frontend memory and are cleared when the page is refreshed.
=======
# CareSure Backend API

> AI-Assisted Hospital Revenue Assurance and Claim Verification Backend Engine
> Node.js (Active LTS) + TypeScript (Strict) + Express 5 + MongoDB (Mongoose)

---

## Tech Stack (MERN Architecture)

- **Database:** MongoDB (Local or MongoDB Atlas)
- **ODM:** Mongoose (`^9.11.3`)
- **NoSQL Injection Guard:** In-place sanitizer stripping `$` and `.` operators (compatible with Express 5)
- **Runtime & Framework:** Node.js + Express 5 (`^5.3.0`)
- **Type Safety:** TypeScript Strict Mode (`noImplicitAny: true`)

---

## Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the template and configure your `MONGODB_URI`:
```bash
cp .env.example .env
```
In `.env`:
```env
# Local MongoDB:
MONGODB_URI=mongodb://localhost:27017/caresure

# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/caresure?retryWrites=true&w=majority
```
*(Note: If no local MongoDB daemon is running, the server automatically starts an in-memory MongoDB fallback so you can develop and test immediately without setup).*

### 3. Seed Baseline Demo Data
```bash
npm run seed
```
To reset and reseed back to baseline clean state:
```bash
npm run seed:reset
```

### 4. Run Development Server
```bash
npm run dev
```
The server will start at `http://localhost:5000`.

- **Root info:** `http://localhost:5000/`
- **Health check:** `http://localhost:5000/health`
- **Readiness probe:** `http://localhost:5000/ready`
- **API Base:** `http://localhost:5000/api/v1`

---

## Seed Accounts

| Account | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Reviewer Portal** | `reviewer@caresure.demo` | `CareSureDemo2026!` | reviewer |
| **Admin Portal** | `admin@caresure.demo` | `CareSureDemo2026!` | admin |

---

## Hero Case (CLM-2026-1041)

- **Patient:** Priya Singh (Encounter `ENC-77120`)
- **Procedure:** Appendectomy (Surgery charges ₹1,50,000)
- **Flagged Inconsistency:** **CT Scan Abdomen** billed (₹18,500) but no corresponding radiology report found.
- **Rule Triggered:** `R01` (Missing diagnostic report) $\rightarrow$ 25 pts.
- **Hybrid Score:** Rules: 25 + ML: 28 + Anomaly: 19 = **72 / 100** (**High Risk Signals**).
- **Status:** Automatically routed to the **Review Queue** for human decision (`Approve`, `Request Documents`, `Escalate`).

Sample CSV files for manual upload testing are available in `../data/samples/`.

---

## Test Suites

Run the automated rule engine, security, and integration tests:
```bash
npm test
```
All 17 tests pass with 100% success rate.
>>>>>>> f01e7aa (feat(backend): complete CareSure backend with MongoDB Atlas, rule engine R01-R06, and hybrid scoring)
