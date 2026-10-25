"""
train_models.py – Training pipeline for CareSure AI models.

Trains:
  A. IsolationForest – unsupervised anomaly detection
  B. RandomForestClassifier – supervised risk classification (synthetic labels)

Run from the ai-service/ directory:
    python -m training.train_models

Or from project root:
    python -m ai-service.training.train_models
"""

import sys
import json
import logging
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    confusion_matrix,
)
from sklearn.compose import ColumnTransformer

# Add parent to path so we can import training modules
sys.path.insert(0, str(Path(__file__).parent.parent))
from training.generate_dataset import generate_dataset, PROCEDURE_BENCHMARKS

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("caresure.training")

RANDOM_SEED = 42
MODELS_DIR = Path(__file__).parent.parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# ── Feature definitions ───────────────────────────────────────────────────────

# Anomaly detection features (numerical only — IsolationForest doesn't handle categoricals)
ANOMALY_FEATURES = [
    "amount_rupees",
    "length_of_stay",
    "items_billed",
    "amount_per_day",
    "benchmark_ratio",
    "above_benchmark",
]

# Risk classification features (mix of categorical + numerical)
RISK_CAT_FEATURES = ["procedure"]
RISK_NUM_FEATURES = [
    "amount_rupees",
    "length_of_stay",
    "items_billed",
    "rules_fired",
    "unmatched_ratio",
    "benchmark_ratio",
    "above_benchmark",
]
RISK_LABEL = "high_risk"


def train_anomaly_model(df: pd.DataFrame) -> dict:
    """
    Train Isolation Forest on anomaly detection features.

    Returns a dict with model artifacts and evaluation metadata.

    IsolationForest is fully unsupervised — it does not use the 'high_risk' label.
    The contamination parameter is estimated from the label distribution as a
    reasonable initialization, but the model is not evaluated against labels
    (that would require ground-truth anomaly labels that don't exist here).
    """
    logger.info("=" * 60)
    logger.info("PHASE A: Training Isolation Forest (Anomaly Detection)")
    logger.info("=" * 60)

    X = df[ANOMALY_FEATURES].values
    n_samples = len(X)

    # Estimate contamination from synthetic labels (heuristic only)
    contamination = float(df[RISK_LABEL].mean())
    contamination = max(0.05, min(0.40, contamination))  # Clip to valid sklearn range
    logger.info("Estimated contamination from heuristic labels: %.3f", contamination)

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train model
    model = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        max_features=0.8,
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )
    model.fit(X_scaled)

    # Compute score normalization bounds on the full training set
    raw_scores = model.score_samples(X_scaled)
    score_min = float(raw_scores.min())
    score_max = float(raw_scores.max())

    # Attach bounds as custom attributes so model_loader can use them
    model._caresure_score_min = score_min
    model._caresure_score_max = score_max
    model._caresure_features = ANOMALY_FEATURES
    model._caresure_trained_at = datetime.utcnow().isoformat()

    # Normalize scores to [0, 1]
    score_range = score_max - score_min
    normalized_scores = 1.0 - (raw_scores - score_min) / score_range if score_range > 0 else np.full_like(raw_scores, 0.5)

    # Summary stats (for disclosure — not claimed as ground-truth evaluation)
    predicted_anomalies = (model.predict(X_scaled) == -1).sum()
    mean_score = float(normalized_scores.mean())
    high_score_count = (normalized_scores >= 0.55).sum()

    logger.info("Training samples: %d", n_samples)
    logger.info("Contamination parameter: %.3f", contamination)
    logger.info("Samples flagged as anomalous by model: %d (%.1f%%)", predicted_anomalies, predicted_anomalies/n_samples*100)
    logger.info("Score range (raw): [%.4f, %.4f]", score_min, score_max)
    logger.info("Mean normalized score: %.4f", mean_score)
    logger.info("Claims with score >= 0.55: %d", high_score_count)
    logger.info("⚠️  Note: Anomaly evaluation without ground-truth labels reflects")
    logger.info("   model behavior on training data only, not real-world performance.")

    # Save artifacts
    joblib.dump(model, MODELS_DIR / "anomaly_model.joblib")
    joblib.dump(scaler, MODELS_DIR / "anomaly_scaler.joblib")
    logger.info("✅ Anomaly model saved to %s", MODELS_DIR / "anomaly_model.joblib")

    return {
        "model_type": "IsolationForest",
        "n_estimators": 200,
        "contamination": contamination,
        "n_training_samples": n_samples,
        "features": ANOMALY_FEATURES,
        "predicted_anomalies_in_training": int(predicted_anomalies),
        "mean_normalized_score": round(mean_score, 4),
        "score_min_raw": round(score_min, 6),
        "score_max_raw": round(score_max, 6),
        "trained_at": model._caresure_trained_at,
        "note": (
            "Unsupervised model. No labeled ground truth is available. "
            "Evaluation reflects model behavior on synthetic training data only."
        ),
    }


def train_risk_model(df: pd.DataFrame) -> dict:
    """
    Train a RandomForestClassifier with a preprocessing pipeline.

    Labels are SYNTHETIC heuristics — see generate_dataset.py for disclosure.
    Uses stratified train/test split and cross-validation.
    """
    logger.info("=" * 60)
    logger.info("PHASE B: Training Random Forest (Risk Classification)")
    logger.info("=" * 60)
    logger.info(
        "⚠️  LABEL DISCLOSURE: Training on SYNTHETIC heuristic labels. "
        "This model predicts 'review signal', NOT actual fraud or claim rejection."
    )

    X = df[RISK_CAT_FEATURES + RISK_NUM_FEATURES]
    y = df[RISK_LABEL].values

    label_dist = {int(k): int(v) for k, v in zip(*np.unique(y, return_counts=True))}
    logger.info("Label distribution: %s (0=low_risk, 1=high_risk)", label_dist)

    # Stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.20,
        random_state=RANDOM_SEED,
        stratify=y,
    )
    logger.info("Train samples: %d  |  Test samples: %d", len(X_train), len(X_test))

    # Preprocessing pipeline
    categorical_transformer = OrdinalEncoder(
        handle_unknown="use_encoded_value",
        unknown_value=-1,
        categories=[list(PROCEDURE_BENCHMARKS.keys()) + ["other"]],
    )

    numerical_transformer = StandardScaler()

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", categorical_transformer, RISK_CAT_FEATURES),
            ("num", numerical_transformer, RISK_NUM_FEATURES),
        ]
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("clf", RandomForestClassifier(
            n_estimators=300,
            max_depth=8,
            min_samples_leaf=5,
            class_weight="balanced",
            random_state=RANDOM_SEED,
            n_jobs=-1,
        )),
    ])

    # Fit on training data only
    pipeline.fit(X_train, y_train)

    # Evaluate on held-out test set
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]

    roc_auc = roc_auc_score(y_test, y_prob)
    report = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred).tolist()

    logger.info("ROC-AUC: %.4f", roc_auc)
    logger.info("Classification Report:\n%s", classification_report(y_test, y_pred))
    logger.info("Confusion Matrix:\n%s", np.array(cm))

    # Cross-validation for stability estimate
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_SEED)
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="roc_auc")
    logger.info("5-fold CV ROC-AUC: %.4f ± %.4f", cv_scores.mean(), cv_scores.std())

    # Feature importance
    clf = pipeline.named_steps["clf"]
    feature_names = RISK_CAT_FEATURES + RISK_NUM_FEATURES
    importances = pd.Series(clf.feature_importances_, index=feature_names).sort_values(ascending=False)
    logger.info("Feature importances:\n%s", importances.to_string())

    # Save pipeline
    joblib.dump(pipeline, MODELS_DIR / "risk_model.joblib")
    logger.info("✅ Risk model saved to %s", MODELS_DIR / "risk_model.joblib")

    return {
        "model_type": "RandomForestClassifier",
        "n_estimators": 300,
        "n_training_samples": int(len(X_train)),
        "n_test_samples": int(len(X_test)),
        "label_distribution_full": label_dist,
        "features": RISK_CAT_FEATURES + RISK_NUM_FEATURES,
        "target_label": RISK_LABEL,
        "label_disclosure": (
            "SYNTHETIC heuristic labels. Labels represent a rule-based estimate of "
            "'would this claim require review?', NOT real audit outcomes."
        ),
        "metrics": {
            "roc_auc": round(roc_auc, 4),
            "cv_roc_auc_mean": round(float(cv_scores.mean()), 4),
            "cv_roc_auc_std": round(float(cv_scores.std()), 4),
            "precision_class1": round(report["1"]["precision"], 4),
            "recall_class1": round(report["1"]["recall"], 4),
            "f1_class1": round(report["1"]["f1-score"], 4),
            "confusion_matrix": cm,
        },
        "feature_importances": {k: round(float(v), 6) for k, v in importances.items()},
        "trained_at": datetime.utcnow().isoformat(),
    }


def save_benchmarks() -> None:
    """Save procedure benchmarks as a model artifact for use at inference time."""
    benchmarks = {k: list(v) for k, v in PROCEDURE_BENCHMARKS.items()}
    joblib.dump(benchmarks, MODELS_DIR / "procedure_benchmarks.joblib")
    logger.info("✅ Procedure benchmarks saved.")


def main() -> None:
    logger.info("🏥 CareSure AI — Training Pipeline")
    logger.info("Training data: SYNTHETIC (see generate_dataset.py for disclosure)")
    logger.info("Models output dir: %s", MODELS_DIR.resolve())
    logger.info("")

    # Generate dataset
    logger.info("Generating synthetic training dataset (n=600)...")
    df = generate_dataset(n=600)
    logger.info("Dataset ready: %d rows, label balance: %.1f%% high-risk", len(df), df["high_risk"].mean()*100)

    # Save dataset for reference
    df.to_csv(MODELS_DIR / "synthetic_claims.csv", index=False)
    logger.info("Dataset saved to %s/synthetic_claims.csv", MODELS_DIR)
    logger.info("")

    # Save benchmarks
    save_benchmarks()

    # Train models
    anomaly_meta = train_anomaly_model(df)
    risk_meta = train_risk_model(df)

    # Write training report
    report = {
        "caresure_ai_training_report": True,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "dataset": {
            "source": "SYNTHETIC — generated by training/generate_dataset.py",
            "n_total": int(len(df)),
            "n_high_risk": int(df["high_risk"].sum()),
            "label_rate": round(float(df["high_risk"].mean()), 4),
            "procedures": df["procedure"].value_counts().to_dict(),
            "disclosure": (
                "The CareSure repository contains no standalone ML training dataset. "
                "This dataset was generated synthetically using the procedure benchmarks "
                "and seed data from backend/src/seed.ts. Labels are heuristic estimates "
                "and DO NOT represent real audit outcomes or fraud determinations."
            ),
        },
        "anomaly_model": anomaly_meta,
        "risk_model": risk_meta,
    }

    report_path = MODELS_DIR / "training_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    logger.info("")
    logger.info("=" * 60)
    logger.info("✅ TRAINING COMPLETE")
    logger.info("   Anomaly model : %s", MODELS_DIR / "anomaly_model.joblib")
    logger.info("   Risk model    : %s", MODELS_DIR / "risk_model.joblib")
    logger.info("   Report        : %s", report_path)
    logger.info("")
    logger.info("ROC-AUC (risk classifier): %.4f", risk_meta["metrics"]["roc_auc"])
    logger.info("CV ROC-AUC: %.4f ± %.4f",
                risk_meta["metrics"]["cv_roc_auc_mean"],
                risk_meta["metrics"]["cv_roc_auc_std"])
    logger.info("=" * 60)
    logger.info("")
    logger.info("⚠️  All metrics are on SYNTHETIC data. Real-world performance")
    logger.info("   may differ significantly when applied to actual hospital claims.")


if __name__ == "__main__":
    main()
