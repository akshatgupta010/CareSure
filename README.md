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
