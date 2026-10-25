"""
model_loader.py – Loads trained model artifacts once at service startup.

Models are stored as .joblib files in the MODELS_DIR directory.
If artifacts are missing, the service starts in degraded mode and returns
appropriate fallback responses rather than crashing.
"""

import os
import logging
import joblib
from pathlib import Path
from typing import Optional

logger = logging.getLogger("caresure.ai")

# Resolved at import time from env (or default)
MODELS_DIR = Path(os.getenv("MODELS_DIR", "./models"))

# Module-level singletons (loaded once at startup)
_anomaly_model = None      # IsolationForest
_anomaly_scaler = None     # StandardScaler for anomaly features
_risk_model = None         # RandomForestClassifier pipeline
_risk_label_encoder = None # LabelEncoder for procedure categories
_procedure_benchmarks: dict = {}  # {procedure_key: (min_rupees, max_rupees)}
_anomaly_loaded = False
_risk_loaded = False


def load_models() -> None:
    """
    Called once during FastAPI lifespan startup.
    Sets module-level flags so endpoints can check availability.
    """
    global _anomaly_model, _anomaly_scaler, _anomaly_loaded
    global _risk_model, _risk_label_encoder, _risk_loaded
    global _procedure_benchmarks

    # ── Load Anomaly Detection artifacts ──
    anomaly_model_path = MODELS_DIR / "anomaly_model.joblib"
    anomaly_scaler_path = MODELS_DIR / "anomaly_scaler.joblib"

    if anomaly_model_path.exists() and anomaly_scaler_path.exists():
        try:
            _anomaly_model = joblib.load(anomaly_model_path)
            _anomaly_scaler = joblib.load(anomaly_scaler_path)
            _anomaly_loaded = True
            logger.info("✅ Anomaly detection model loaded from %s", anomaly_model_path)
        except Exception as exc:
            logger.error("❌ Failed to load anomaly model: %s", exc)
    else:
        logger.warning(
            "⚠️  Anomaly model artifacts not found at %s. "
            "Run training/train_models.py first.",
            MODELS_DIR,
        )

    # ── Load Risk Classification artifacts ──
    risk_model_path = MODELS_DIR / "risk_model.joblib"
    risk_encoder_path = MODELS_DIR / "risk_label_encoder.joblib"

    if risk_model_path.exists():
        try:
            _risk_model = joblib.load(risk_model_path)
            _risk_loaded = True
            logger.info("✅ Risk classification model loaded from %s", risk_model_path)
        except Exception as exc:
            logger.error("❌ Failed to load risk model: %s", exc)
    else:
        logger.warning(
            "⚠️  Risk model artifacts not found at %s. "
            "Run training/train_models.py first.",
            MODELS_DIR,
        )

    if risk_encoder_path.exists():
        try:
            _risk_label_encoder = joblib.load(risk_encoder_path)
        except Exception as exc:
            logger.warning("Could not load risk label encoder: %s", exc)

    # ── Load procedure benchmarks ──
    benchmarks_path = MODELS_DIR / "procedure_benchmarks.joblib"
    if benchmarks_path.exists():
        try:
            _procedure_benchmarks = joblib.load(benchmarks_path)
            logger.info("✅ Procedure benchmarks loaded (%d entries)", len(_procedure_benchmarks))
        except Exception as exc:
            logger.warning("Could not load procedure benchmarks: %s", exc)


# ── Public accessors ─────────────────────────────────────────────────────────

def get_anomaly_model():
    return _anomaly_model


def get_anomaly_scaler():
    return _anomaly_scaler


def get_risk_model():
    return _risk_model


def get_risk_label_encoder():
    return _risk_label_encoder


def get_procedure_benchmarks() -> dict:
    return _procedure_benchmarks


def is_anomaly_ready() -> bool:
    return _anomaly_loaded


def is_risk_ready() -> bool:
    return _risk_loaded


def models_status() -> dict:
    return {
        "anomaly_model": "loaded" if _anomaly_loaded else "not_loaded",
        "risk_model": "loaded" if _risk_loaded else "not_loaded",
        "models_loaded": _anomaly_loaded and _risk_loaded,
    }
