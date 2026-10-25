# CareSure AI Microservice

FastAPI Python microservice providing Isolation Forest anomaly detection and
Random Forest risk classification for the CareSure hospital claim verification system.

> **⚠️ Label Disclosure**: The Random Forest model is trained on **synthetic heuristic labels**
> derived from procedure benchmarks in the repository. It predicts whether a claim
> *requires human review*, not whether it is fraudulent. See `training/generate_dataset.py`
> for full disclosure.

---

## Quick Start

### 1. Install dependencies

```powershell
cd ai-service
pip install -r requirements.txt
```

### 2. Configure environment

```powershell
copy .env.example .env
# Edit .env and set AI_SERVICE_TOKEN to match backend's AI_SERVICE_TOKEN
```

### 3. Train the models (must do before starting)

```powershell
# From ai-service/ directory:
python -m training.train_models
```

This generates model artifacts in `models/` and prints a training report with
ROC-AUC, F1-score, and feature importances.

### 4. Start the AI service

```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health check: http://localhost:8000/health
- API docs: http://localhost:8000/docs

---

## Running the Full Application

**Terminal 1 — AI Microservice (this service)**
```powershell
cd ai-service
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Express Backend**
```powershell
cd backend
npm install
# Copy and configure backend/.env (see backend/.env.example)
npm run seed       # Seed demo data (first time only)
npm run dev        # Starts on http://localhost:5000
```

---

## API Endpoints

### `GET /health`
Returns service status and model availability.

```json
{
  "status": "ok",
  "models_loaded": true,
  "anomaly_model": "loaded",
  "risk_model": "loaded",
  "version": "1.0.0"
}
```

### `POST /anomaly`
Isolation Forest anomaly detection.

**Request** (matches backend `aiClient.ts`):
```json
{
  "procedure": "Appendectomy",
  "amount": 245800.0,
  "length_of_stay": 4,
  "items_billed": 5
}
```

**Response**:
```json
{
  "anomaly_score": 0.62,
  "is_anomaly": true,
  "top_factors": [
    "Billed amount ₹245,800 exceeds the benchmark range ₹150,000–₹220,000 for Appendectomy"
  ]
}
```

### `POST /ml-risk`
Random Forest risk classification.

**Request**:
```json
{
  "features": {
    "procedure": "Appendectomy",
    "amount": 245800.0,
    "length_of_stay": 4,
    "items_billed": 5,
    "rules_fired": 1,
    "unmatched_ratio": 0.2
  }
}
```

**Response**:
```json
{
  "risk_probability": 0.78,
  "risk_level": "HIGH",
  "top_features": [
    "1 deterministic rule violation(s) detected (e.g. missing documents, duplicate billing)",
    "Billed amount ₹245,800 exceeds procedure benchmark ceiling for Appendectomy"
  ]
}
```

---

## Hybrid Scoring

The Express backend combines all three signals:

| Component | Weight | Formula |
|---|---|---|
| Rule Engine (R01–R06) | 0–40 pts | Sum of fired rule points, capped at 40 |
| ML Risk | 0–35 pts | `round(risk_probability × 35)` |
| Anomaly | 0–25 pts | `round(anomaly_score × 25)` |
| **Total** | **0–100** | Rules + ML + Anomaly |

**Risk bands**: low ≤ 39, review ≤ 69, high > 69

**Hero case** (CLM-2026-1041): Rules 25 + ML 28 + Anomaly 19 = **72/100 (High)**

---

## Running Tests

```powershell
# From ai-service/ directory (train models first):
pytest tests/ -v
```

---

## Evaluating Models

```powershell
python -m training.evaluate_models
```

---

## Project Structure

```
ai-service/
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI app, endpoints, auth
│   ├── schemas.py         # Pydantic request/response models
│   ├── model_loader.py    # One-time model loading at startup
│   ├── anomaly_detector.py   # Isolation Forest inference
│   └── risk_classifier.py    # Random Forest inference
├── training/
│   ├── generate_dataset.py   # Synthetic dataset generator
│   ├── train_models.py       # Full training pipeline
│   └── evaluate_models.py    # Post-training evaluation
├── models/                # Generated artifacts (gitignored)
│   ├── anomaly_model.joblib
│   ├── anomaly_scaler.joblib
│   ├── risk_model.joblib
│   ├── procedure_benchmarks.joblib
│   ├── synthetic_claims.csv
│   └── training_report.json
├── tests/
│   └── test_ai_service.py
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## Authentication

Requests from the backend must include the `X-Service-Token` header matching
`AI_SERVICE_TOKEN` in both `.env` files. If `AI_SERVICE_TOKEN` is not set,
authentication is skipped (development mode only).

---

## Fallback Behaviour

If the AI service is unreachable, the Express backend:
- Returns `aiSignalsAvailable: false` in the claim response
- Scores claims using rule engine only (no ML/anomaly points)
- Forces claims to at least `review` band (never auto-cleared without AI signals)
- Logs the fallback with reason

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` |
| `models not found` error | Run `python -m training.train_models` first |
| `401 Unauthorized` from backend | Ensure `AI_SERVICE_TOKEN` matches in both `.env` files |
| Port 8000 already in use | Change port: `--port 8001` and update backend `AI_SERVICE_URL` |
| Backend can't reach AI service | Verify `AI_SERVICE_URL=http://localhost:8000` in backend `.env` |
