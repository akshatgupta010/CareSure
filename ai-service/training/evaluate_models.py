"""
evaluate_models.py – Load saved model artifacts and print evaluation report.

Run after train_models.py has been executed:
    python -m training.evaluate_models
"""

import sys
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

MODELS_DIR = Path(__file__).parent.parent / "models"


def load_report() -> dict:
    report_path = MODELS_DIR / "training_report.json"
    if not report_path.exists():
        print("❌ training_report.json not found. Run train_models.py first.")
        sys.exit(1)
    with open(report_path) as f:
        return json.load(f)


def evaluate_anomaly(df: pd.DataFrame) -> None:
    """Show anomaly score distribution on the training data."""
    model_path = MODELS_DIR / "anomaly_model.joblib"
    scaler_path = MODELS_DIR / "anomaly_scaler.joblib"

    if not model_path.exists():
        print("⚠️  Anomaly model not found.")
        return

    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)

    features = [
        "amount_rupees", "length_of_stay", "items_billed",
        "amount_per_day", "benchmark_ratio", "above_benchmark",
    ]
    X = df[features].values
    X_scaled = scaler.transform(X)
    raw_scores = model.score_samples(X_scaled)

    score_min = model._caresure_score_min
    score_max = model._caresure_score_max
    score_range = score_max - score_min
    normalized = 1.0 - (raw_scores - score_min) / score_range if score_range > 0 else np.full_like(raw_scores, 0.5)

    print("\n── Anomaly Model Evaluation ─────────────────────────────────")
    print(f"  Model type: IsolationForest (unsupervised)")
    print(f"  Training samples: {len(df)}")
    print(f"  Score distribution (normalized 0-1):")
    for pct in [25, 50, 75, 90, 95]:
        print(f"    p{pct}: {np.percentile(normalized, pct):.4f}")
    print(f"  Flagged as anomalous (score >= 0.55): {(normalized >= 0.55).sum()}")
    print(f"  ⚠️  No ground-truth labels available — cannot compute precision/recall")
    print(f"     for anomaly detection. Scores reflect statistical divergence from")
    print(f"     the training distribution only.")


def evaluate_risk(df: pd.DataFrame) -> None:
    """Re-run evaluation on the saved risk model."""
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix

    model_path = MODELS_DIR / "risk_model.joblib"
    if not model_path.exists():
        print("⚠️  Risk model not found.")
        return

    pipeline = joblib.load(model_path)

    features = ["procedure", "amount_rupees", "length_of_stay", "items_billed",
                "rules_fired", "unmatched_ratio", "benchmark_ratio", "above_benchmark"]
    X = df[features]
    y = df["high_risk"].values

    _, X_test, _, y_test = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]

    print("\n── Risk Classification Model Evaluation ─────────────────────")
    print(f"  Model type: RandomForestClassifier")
    print(f"  Test samples: {len(X_test)}")
    print(f"  ⚠️  LABELS ARE SYNTHETIC HEURISTICS — not real audit outcomes")
    print(f"\n  ROC-AUC: {roc_auc_score(y_test, y_prob):.4f}")
    print(f"\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["low_risk", "high_risk"]))
    print(f"  Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"    TN={cm[0,0]}  FP={cm[0,1]}")
    print(f"    FN={cm[1,0]}  TP={cm[1,1]}")


def main() -> None:
    report = load_report()
    print("=" * 60)
    print("CareSure AI — Model Evaluation Report")
    print("=" * 60)
    print(f"Generated: {report.get('generated_at', 'N/A')}")

    dataset_info = report.get("dataset", {})
    print(f"\n── Dataset ──────────────────────────────────────────────────")
    print(f"  Source: {dataset_info.get('source', 'N/A')}")
    print(f"  Total rows: {dataset_info.get('n_total', 'N/A')}")
    print(f"  High-risk (label=1): {dataset_info.get('n_high_risk', 'N/A')} ({dataset_info.get('label_rate', 0)*100:.1f}%)")
    print(f"  ⚠️  {dataset_info.get('disclosure', '')}")

    # Load dataset for live evaluation
    csv_path = MODELS_DIR / "synthetic_claims.csv"
    if csv_path.exists():
        df = pd.read_csv(csv_path)
        evaluate_anomaly(df)
        evaluate_risk(df)
    else:
        print("\n⚠️  synthetic_claims.csv not found. Showing report from saved JSON only.")
        risk_metrics = report.get("risk_model", {}).get("metrics", {})
        print(f"\n  From training report:")
        print(f"  ROC-AUC: {risk_metrics.get('roc_auc', 'N/A')}")
        print(f"  Precision (high-risk): {risk_metrics.get('precision_class1', 'N/A')}")
        print(f"  Recall (high-risk): {risk_metrics.get('recall_class1', 'N/A')}")
        print(f"  F1 (high-risk): {risk_metrics.get('f1_class1', 'N/A')}")


if __name__ == "__main__":
    main()
