"""
main.py – FastAPI application for CareSure AI microservice.

Endpoints:
  GET  /health      – Service health and model status
  POST /anomaly     – Isolation Forest anomaly detection
  POST /ml-risk     – Random Forest risk classification

The service is designed to be called by the CareSure Express backend.
Requests are authenticated via the X-Service-Token header.
Models are loaded once at startup via the lifespan context manager.
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse

from .model_loader import load_models, models_status
from .schemas import (
    AnomalyRequest,
    AnomalyResponse,
    MLRiskRequest,
    MLRiskResponse,
    HealthResponse,
)
from .anomaly_detector import detect_anomaly
from .risk_classifier import classify_risk

# ── Logging ──────────────────────────────────────────────────────────────────
log_level = os.getenv("LOG_LEVEL", "info").upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("caresure.ai")

# ── Service Token Auth ────────────────────────────────────────────────────────
AI_SERVICE_TOKEN = os.getenv("AI_SERVICE_TOKEN", "")


def _verify_token(request: Request) -> None:
    """
    Validates the X-Service-Token header against the configured secret.
    Skips validation in development mode (when token is empty).
    """
    if not AI_SERVICE_TOKEN:
        # No token configured — allow all requests (dev/test mode)
        return

    incoming = request.headers.get("X-Service-Token", "")
    if not incoming or incoming != AI_SERVICE_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Service-Token",
        )


# ── FastAPI Lifespan (startup / shutdown) ─────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Load models once at startup."""
    logger.info("🚀 CareSure AI service starting up — loading models...")
    load_models()
    status_info = models_status()
    if status_info["models_loaded"]:
        logger.info("✅ All models loaded. Service ready.")
    else:
        logger.warning(
            "⚠️  Service started in DEGRADED mode. "
            "Models not loaded: anomaly=%s, risk=%s. "
            "Run training/train_models.py to generate artifacts.",
            status_info["anomaly_model"],
            status_info["risk_model"],
        )
    yield
    logger.info("CareSure AI service shutting down.")


# ── Application ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="CareSure AI Microservice",
    description=(
        "Isolation Forest anomaly detection and Random Forest risk classification "
        "for hospital claim verification. Designed to be called by the CareSure "
        "Express backend. Not a standalone fraud detection or claim rejection system."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check and model status",
    tags=["Health"],
)
async def health() -> HealthResponse:
    """
    Returns service status and whether both ML models are loaded.
    The Express backend's /ready endpoint calls this to determine AI availability.
    """
    ms = models_status()
    return HealthResponse(
        status="ok" if ms["models_loaded"] else "degraded",
        models_loaded=ms["models_loaded"],
        anomaly_model=ms["anomaly_model"],
        risk_model=ms["risk_model"],
    )


@app.post(
    "/anomaly",
    response_model=AnomalyResponse,
    summary="Isolation Forest anomaly detection",
    tags=["ML"],
)
async def anomaly_endpoint(
    request: Request,
    body: AnomalyRequest,
) -> AnomalyResponse:
    """
    Detects statistically anomalous billing patterns using an Isolation Forest.

    The anomaly_score is normalized to [0, 1]. A score ≥ 0.55 is flagged as
    anomalous. This score does NOT indicate fraud — it is a reviewer assistance
    signal only.

    Called by backend aiClient.ts with amount already in Rupees.
    """
    _verify_token(request)

    logger.info(
        "Anomaly detection request: procedure=%s amount=%.0f los=%d items=%d",
        body.procedure, body.amount, body.length_of_stay, body.items_billed,
    )

    result = detect_anomaly(
        procedure=body.procedure,
        amount=body.amount,
        length_of_stay=body.length_of_stay,
        items_billed=body.items_billed,
    )

    return AnomalyResponse(
        anomaly_score=result["anomaly_score"],
        is_anomaly=result["is_anomaly"],
        top_factors=result["top_factors"],
    )


@app.post(
    "/ml-risk",
    response_model=MLRiskResponse,
    summary="Random Forest risk classification",
    tags=["ML"],
)
async def ml_risk_endpoint(
    request: Request,
    body: MLRiskRequest,
) -> MLRiskResponse:
    """
    Predicts the probability that a claim requires human audit review.

    ⚠️  Label disclosure: The model was trained on SYNTHETIC labels derived from
    rule-engine heuristics and procedure benchmarks. It predicts "review signal"
    not actual fraud probability.

    Called by backend aiClient.ts with features nested under 'features' key.
    """
    _verify_token(request)

    f = body.features
    logger.info(
        "Risk classification request: procedure=%s amount=%.0f los=%d items=%d rules=%d",
        f.procedure, f.amount, f.length_of_stay, f.items_billed, f.rules_fired,
    )

    result = classify_risk(
        procedure=f.procedure,
        amount=f.amount,
        length_of_stay=f.length_of_stay,
        items_billed=f.items_billed,
        rules_fired=f.rules_fired,
        unmatched_ratio=f.unmatched_ratio,
    )

    return MLRiskResponse(
        risk_probability=result["risk_probability"],
        risk_level=result["risk_level"],
        top_features=result["top_features"],
    )


# ── Global Exception Handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check AI service logs."},
    )
