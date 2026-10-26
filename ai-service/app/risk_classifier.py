"""
risk_classifier.py – Random Forest supervised risk classification for CareSure.

⚠️  IMPORTANT LABEL DISCLOSURE
The training dataset is SYNTHETIC, generated from the seed data benchmarks and
domain knowledge in the CareSure repository. Labels represent a heuristic
estimate of "would a claim trigger rule violations or exceed benchmarks" and are
NOT actual audit outcomes or fraud ground truth. The model predicts the probability
of a claim requiring human review based on the features available at validation time.

The model was trained on a RandomForestClassifier sklearn Pipeline that includes:
  - OrdinalEncoder for the procedure column
  - StandardScaler for numerical features
  - RandomForestClassifier with class_weight='balanced'

This pipeline is saved as a single joblib artifact.
"""

import logging
import numpy as np
import pandas as pd
from typing import Any

from .model_loader import (
    get_risk_model,
    get_risk_label_encoder,
    get_procedure_benchmarks,
    is_risk_ready,
)

logger = logging.getLogger("caresure.ai.risk")


# Risk level thresholds
def _probability_to_level(prob: float) -> str:
    if prob >= 0.70:
        return "HIGH"
    elif prob >= 0.50:
        return "ELEVATED"
    elif prob >= 0.30:
        return "MEDIUM"
    else:
        return "LOW"


# Procedure encoding — must match the categories used at training time
# This fallback is used if the label encoder artifact is absent
KNOWN_PROCEDURES = [
    "appendectomy",
    "cholecystectomy",
    "hernia repair",
    "normal delivery",
    "cesarean delivery",
    "knee replacement",
    "other",
]


def _encode_procedure(procedure: str, encoder) -> str:
    """Return the canonical procedure key used during training."""
    proc_lower = procedure.lower().strip()
    for known in KNOWN_PROCEDURES:
        if known in proc_lower or proc_lower in known:
            return known
    return "other"


def classify_risk(
    procedure: str,
    amount: float,
    length_of_stay: int,
    items_billed: int,
    rules_fired: int,
    unmatched_ratio: float,
) -> dict:
    """
    Predict the probability that this claim requires audit review.

    Returns a dict with:
      - risk_probability: float in [0, 1]
      - risk_level: str (LOW | MEDIUM | ELEVATED | HIGH)
      - top_features: list[str]
    """
    if not is_risk_ready():
        logger.warning("Risk model not loaded – returning neutral probability")
        return {
            "risk_probability": 0.0,
            "risk_level": "LOW",
            "top_features": ["Risk model not available"],
        }

    model = get_risk_model()
    encoder = get_risk_label_encoder()
    benchmarks = get_procedure_benchmarks()

    proc_key = _encode_procedure(procedure, encoder)

    # Features must match training column names and types exactly:
    #   ['procedure', 'amount_rupees', 'length_of_stay', 'items_billed',
    #    'rules_fired', 'unmatched_ratio', 'benchmark_ratio', 'above_benchmark']
    proc_key_lower = proc_key.lower()
    if proc_key_lower in benchmarks:
        bmin, bmax = benchmarks[proc_key_lower]
        bmid = (bmin + bmax) / 2.0
        benchmark_ratio = amount / bmid if bmid > 0 else 1.0
        above_benchmark = 1.0 if amount > bmax else 0.0
    else:
        benchmark_ratio = 1.0
        above_benchmark = 0.0

    X = pd.DataFrame([{
        "procedure": proc_key,
        "amount_rupees": float(amount),
        "length_of_stay": float(length_of_stay),
        "items_billed": float(items_billed),
        "rules_fired": float(rules_fired),
        "unmatched_ratio": float(unmatched_ratio),
        "benchmark_ratio": float(benchmark_ratio),
        "above_benchmark": float(above_benchmark),
    }])

    try:
        prob_array = model.predict_proba(X)[0]
        # Class 1 = high_risk
        risk_probability = float(prob_array[1]) if len(prob_array) > 1 else float(prob_array[0])
    except Exception as exc:
        logger.error("Risk prediction failed: %s", exc)
        return {
            "risk_probability": 0.0,
            "risk_level": "LOW",
            "top_features": [f"Prediction error: {exc}"],
        }

    risk_probability = float(np.clip(risk_probability, 0.0, 1.0))
    risk_level = _probability_to_level(risk_probability)

    top_features = _build_feature_explanations(
        procedure=procedure,
        amount=amount,
        length_of_stay=length_of_stay,
        items_billed=items_billed,
        rules_fired=rules_fired,
        unmatched_ratio=unmatched_ratio,
        benchmark_ratio=benchmark_ratio,
        above_benchmark=above_benchmark,
        model=model,
    )

    return {
        "risk_probability": round(risk_probability, 4),
        "risk_level": risk_level,
        "top_features": top_features,
    }


def _build_feature_explanations(
    procedure: str,
    amount: float,
    length_of_stay: int,
    items_billed: int,
    rules_fired: int,
    unmatched_ratio: float,
    benchmark_ratio: float,
    above_benchmark: float,
    model,
) -> list[str]:
    """
    Build human-readable explanations based on feature importances.
    We use a heuristic approach: inspect top feature importances and map them
    to the provided input values.
    """
    feature_names = [
        "procedure",
        "amount_rupees",
        "length_of_stay",
        "items_billed",
        "rules_fired",
        "unmatched_ratio",
        "benchmark_ratio",
        "above_benchmark",
    ]

    explanations = []

    # Always-relevant explanations based on input values
    if rules_fired > 0:
        explanations.append(
            f"{rules_fired} deterministic rule violation(s) detected "
            "(e.g. missing documents, duplicate billing)"
        )
    if above_benchmark > 0:
        explanations.append(
            f"Billed amount ₹{amount:,.0f} exceeds procedure benchmark ceiling for {procedure}"
        )
    if unmatched_ratio > 0.3:
        pct = int(unmatched_ratio * 100)
        explanations.append(
            f"{pct}% of billing items have no matching clinical/diagnostic record"
        )
    if benchmark_ratio > 1.5:
        explanations.append(
            f"Billed amount is {benchmark_ratio:.1f}× the expected benchmark midpoint"
        )
    if items_billed > 8:
        explanations.append(
            f"High billing complexity: {items_billed} line items"
        )

    if not explanations:
        # Try model feature importances
        try:
            importances = model.named_steps["clf"].feature_importances_
            top_idx = int(np.argmax(importances))
            explanations.append(
                f"Primary risk driver: {feature_names[min(top_idx, len(feature_names)-1)].replace('_', ' ')}"
            )
        except Exception:
            explanations.append("Claim pattern matches elevated-risk profiles in training data")

    return explanations[:4]  # Return top 4 explanations max
