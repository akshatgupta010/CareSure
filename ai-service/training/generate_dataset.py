"""
generate_dataset.py – Synthetic training dataset generator for CareSure.

⚠️  DATASET DISCLOSURE
The CareSure repository contains no standalone ML training dataset.
The only data sources are:
  1. data/samples/ – 3 CSV files with the single "hero case" (~5 rows each)
  2. backend/src/seed.ts – 3 synthetic demonstration claims seeded in MongoDB

Therefore this script generates a SYNTHETIC dataset of realistic hospital
claims calibrated to:
  - The exact procedure benchmarks defined in backend/src/seed.ts
  - The same schema used by the backend (amounts in Rupees, dates, records)
  - The same rule logic used by the backend (R01–R06)

Labels (high_risk=1/0) are HEURISTIC — a claim is labeled high_risk if it
would plausibly trigger rule violations or exceed procedure benchmarks.
These labels DO NOT represent actual audit outcomes, fraud determinations, or
insurer decisions. The model predicts "requires human review" not "is fraudulent".

This is clearly disclosed in model artifacts and the training report.
"""

import random
import numpy as np
import pandas as pd
from pathlib import Path

RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

# ── Procedure Benchmarks (from backend/src/seed.ts, converted from paise to ₹) ──
PROCEDURE_BENCHMARKS = {
    "appendectomy":      (150_000, 220_000),   # ₹1.5L–₹2.2L
    "cholecystectomy":   (180_000, 280_000),
    "hernia repair":     ( 80_000, 140_000),
    "normal delivery":   ( 50_000,  90_000),
    "cesarean delivery": ( 90_000, 160_000),
    "knee replacement":  (220_000, 350_000),
}

# Typical length of stay in days (min, max, typical)
PROCEDURE_STAY = {
    "appendectomy":      (2, 6),
    "cholecystectomy":   (2, 5),
    "hernia repair":     (1, 3),
    "normal delivery":   (2, 4),
    "cesarean delivery": (3, 6),
    "knee replacement":  (4, 8),
}

# Typical billing items (min, max)
PROCEDURE_ITEMS = {
    "appendectomy":      (4, 8),
    "cholecystectomy":   (4, 9),
    "hernia repair":     (3, 6),
    "normal delivery":   (3, 7),
    "cesarean delivery": (5, 10),
    "knee replacement":  (6, 12),
}


def generate_claim(claim_id: int) -> dict:
    """Generate a single synthetic claim with features and a heuristic label."""
    procedure = random.choice(list(PROCEDURE_BENCHMARKS.keys()))
    bmin, bmax = PROCEDURE_BENCHMARKS[procedure]
    bmid = (bmin + bmax) / 2

    # Sample amount scenarios
    scenario = random.choices(
        ["normal", "slightly_high", "very_high", "below_floor", "duplicate_risk"],
        weights=[0.50, 0.20, 0.12, 0.08, 0.10],
    )[0]

    if scenario == "normal":
        amount = random.uniform(bmin * 0.85, bmax * 1.05)
    elif scenario == "slightly_high":
        amount = random.uniform(bmax * 1.05, bmax * 1.30)
    elif scenario == "very_high":
        amount = random.uniform(bmax * 1.30, bmax * 2.20)
    elif scenario == "below_floor":
        amount = random.uniform(bmin * 0.30, bmin * 0.75)
    else:  # duplicate_risk
        amount = random.uniform(bmin * 0.90, bmax * 1.10)

    stay_min, stay_max = PROCEDURE_STAY[procedure]
    length_of_stay = random.randint(stay_min, stay_max)

    items_min, items_max = PROCEDURE_ITEMS[procedure]
    items_billed = random.randint(items_min, items_max)

    # Rules-fired simulation (heuristic)
    rules_fired = 0
    if scenario == "very_high":
        rules_fired = random.randint(1, 3)
    elif scenario == "slightly_high":
        rules_fired = random.randint(0, 1)
    elif scenario == "duplicate_risk":
        rules_fired = random.randint(1, 2)

    # Unmatched ratio simulation
    if scenario in ("very_high", "duplicate_risk"):
        unmatched_ratio = random.uniform(0.2, 0.7)
    else:
        unmatched_ratio = random.uniform(0.0, 0.2)

    # Benchmark ratio
    benchmark_ratio = amount / bmid if bmid > 0 else 1.0
    above_benchmark = 1.0 if amount > bmax else 0.0

    # ── Heuristic label ──────────────────────────────────────────────────────
    # High risk if: very high amount OR amount above benchmark + rules fired
    # OR significant unmatched billing items
    high_risk = int(
        scenario == "very_high"
        or (above_benchmark and rules_fired > 0)
        or (unmatched_ratio > 0.4 and rules_fired > 0)
        or benchmark_ratio > 1.5
    )

    return {
        "claim_id": f"SYN-{claim_id:04d}",
        "procedure": procedure,
        "amount_rupees": round(amount, 2),
        "length_of_stay": length_of_stay,
        "items_billed": items_billed,
        "rules_fired": rules_fired,
        "unmatched_ratio": round(unmatched_ratio, 4),
        "benchmark_ratio": round(benchmark_ratio, 4),
        "above_benchmark": above_benchmark,
        # Derived
        "amount_per_day": round(amount / max(1, length_of_stay), 2),
        "benchmark_min": bmin,
        "benchmark_max": bmax,
        # Label (heuristic — see disclosure at top of file)
        "high_risk": high_risk,
    }


def generate_dataset(n: int = 600) -> pd.DataFrame:
    """Generate n synthetic claims and return as a DataFrame."""
    records = [generate_claim(i + 1) for i in range(n)]
    df = pd.DataFrame(records)
    return df


def main() -> None:
    output_dir = Path(__file__).parent.parent / "models"
    output_dir.mkdir(parents=True, exist_ok=True)

    print("🔄 Generating synthetic CareSure training dataset...")
    df = generate_dataset(n=600)

    out_path = output_dir / "synthetic_claims.csv"
    df.to_csv(out_path, index=False)

    print(f"✅ Dataset saved: {out_path}")
    print(f"   Rows: {len(df)}")
    print(f"   High-risk claims: {df['high_risk'].sum()} ({df['high_risk'].mean():.1%})")
    print(f"   Procedures: {df['procedure'].value_counts().to_dict()}")
    print()
    print("⚠️  DISCLOSURE: This dataset is SYNTHETIC. Labels are heuristic estimates.")
    print("   They do NOT represent real audit outcomes or fraud determinations.")

    return df


if __name__ == "__main__":
    main()
