"""
anomaly_detector.py – Isolation Forest anomaly detection for CareSure claims.

The model is trained on claim features and produces a normalized anomaly score
in [0, 1] where higher values indicate more anomalous claims.

Important notes on Isolation Forest output normalization:
- sklearn's IsolationForest.score_samples() returns raw "anomaly scores" in
  [-0.5, 0.5] (approx), with more negative values meaning more anomalous.
- We normalize these to [0, 1] by applying:
    normalized = 1.0 - (score - score_min) / (score_max - score_min)
  using the training set score range saved at training time.
- This means score=1.0 is maximally anomalous.
"""

import logging
import numpy as np
from typing import Any

from .model_loader import (
    get_anomaly_model,
    get_anomaly_scaler,
    get_procedure_benchmarks,
    is_anomaly_ready,
)

logger = logging.getLogger("caresure.ai.anomaly")

# The threshold above which a claim is flagged as anomalous
ANOMALY_THRESHOLD = 0.55

# Procedure key normalization (lowercase, strip)
def _normalize_procedure_key(procedure: str) -> str:
    return procedure.lower().strip()


def _build_features(
    procedure: str,
    amount: float,
    length_of_stay: int,
    items_billed: int,
    benchmarks: dict,
) -> np.ndarray:
    """
    Build the feature vector for anomaly detection.

    Features (must match training feature order exactly):
      0. amount_rupees         – total claim amount in ₹
      1. length_of_stay        – days admitted
      2. items_billed          – number of billing line items
      3. amount_per_day        – amount / max(1, length_of_stay)
      4. benchmark_ratio       – amount / benchmark_midpoint (or 1.0 if no benchmark)
      5. above_benchmark       – 1 if amount > benchmark_max, else 0
    """
    amount_per_day = amount / max(1, length_of_stay)

    proc_key = _normalize_procedure_key(procedure)
    if proc_key in benchmarks:
        bmin, bmax = benchmarks[proc_key]
        bmid = (bmin + bmax) / 2.0
        benchmark_ratio = amount / bmid if bmid > 0 else 1.0
        above_benchmark = 1.0 if amount > bmax else 0.0
    else:
        benchmark_ratio = 1.0
        above_benchmark = 0.0

    return np.array([[
        float(amount),
        float(length_of_stay),
        float(items_billed),
        float(amount_per_day),
        float(benchmark_ratio),
        float(above_benchmark),
    ]])


def detect_anomaly(
    procedure: str,
    amount: float,
    length_of_stay: int,
    items_billed: int,
) -> dict:
    """
    Run anomaly detection on a single claim.

    Returns a dict with:
      - anomaly_score: float in [0, 1]
      - is_anomaly: bool
      - top_factors: list[str]
    """
    if not is_anomaly_ready():
        logger.warning("Anomaly model not loaded – returning neutral score")
        return {
            "anomaly_score": 0.0,
            "is_anomaly": False,
            "top_factors": ["Anomaly model not available"],
        }

    model = get_anomaly_model()
    scaler = get_anomaly_scaler()
    benchmarks = get_procedure_benchmarks()

    # Build raw feature vector
    X_raw = _build_features(procedure, amount, length_of_stay, items_billed, benchmarks)

    # Scale features using the training scaler
    X_scaled = scaler.transform(X_raw)

    # Get raw Isolation Forest score (more negative = more anomalous)
    raw_score = model.score_samples(X_scaled)[0]

    # Normalize to [0, 1] using training set score range stored on model
    # These are set at training time:
    score_min = getattr(model, "_caresure_score_min", -0.5)
    score_max = getattr(model, "_caresure_score_max", 0.5)

    score_range = score_max - score_min
    if score_range > 0:
        normalized = 1.0 - (raw_score - score_min) / score_range
    else:
        normalized = 0.5

    anomaly_score = float(np.clip(normalized, 0.0, 1.0))
    is_anomaly = anomaly_score >= ANOMALY_THRESHOLD

    # Build explanations
    top_factors = _build_explanations(
        procedure, amount, length_of_stay, items_billed, benchmarks, anomaly_score
    )

    return {
        "anomaly_score": round(anomaly_score, 4),
        "is_anomaly": is_anomaly,
        "top_factors": top_factors,
    }


def _build_explanations(
    procedure: str,
    amount: float,
    length_of_stay: int,
    items_billed: int,
    benchmarks: dict,
    anomaly_score: float,
) -> list[str]:
    """Generate human-readable explanations for the anomaly signal."""
    factors = []

    proc_key = _normalize_procedure_key(procedure)

    if proc_key in benchmarks:
        bmin, bmax = benchmarks[proc_key]
        bmid = (bmin + bmax) / 2.0
        if amount > bmax * 1.3:
            pct = int((amount - bmax) / bmax * 100)
            factors.append(
                f"Billed amount ₹{amount:,.0f} is {pct}% above the procedure benchmark "
                f"ceiling ₹{bmax:,.0f} for {procedure}"
            )
        elif amount > bmax:
            factors.append(
                f"Billed amount ₹{amount:,.0f} exceeds the benchmark range "
                f"₹{bmin:,.0f}–₹{bmax:,.0f} for {procedure}"
            )
        elif amount < bmin * 0.5:
            factors.append(
                f"Billed amount ₹{amount:,.0f} is unusually low compared to the "
                f"benchmark minimum ₹{bmin:,.0f} for {procedure}"
            )

    amount_per_day = amount / max(1, length_of_stay)
    if amount_per_day > 80_000:
        factors.append(
            f"Cost per day ₹{amount_per_day:,.0f} is unusually high "
            f"(₹{amount:,.0f} over {length_of_stay} day(s))"
        )

    if items_billed > 10:
        factors.append(
            f"High number of billing line items ({items_billed}) may warrant review"
        )

    if length_of_stay == 0:
        factors.append("Zero-day stay with non-zero billed amount is unusual")

    if not factors and anomaly_score >= ANOMALY_THRESHOLD:
        factors.append(
            "Claim pattern is statistically unusual relative to the training population"
        )

    return factors
