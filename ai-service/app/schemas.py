"""
schemas.py – Pydantic request/response schemas for the CareSure AI service.

These schemas are carefully aligned with the contracts expected by the backend's
aiClient.ts, which sends requests to /anomaly and /ml-risk.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional


# ── Request Schemas ──────────────────────────────────────────────────────────

class AnomalyRequest(BaseModel):
    """
    Sent by backend aiClient.ts → POST /anomaly
    Amount is in Indian Rupees (already converted from paise by the backend).
    """
    procedure: str = Field(..., description="Primary procedure name (e.g. 'Appendectomy')")
    amount: float = Field(..., ge=0, description="Total claim amount in Rupees")
    length_of_stay: int = Field(..., ge=0, description="Hospital stay duration in days")
    items_billed: int = Field(..., ge=0, description="Number of distinct billing line items")

    @field_validator("procedure")
    @classmethod
    def procedure_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("procedure must not be empty")
        return v


class MLRiskFeatures(BaseModel):
    """Nested features object for /ml-risk endpoint."""
    procedure: str = Field(..., description="Primary procedure name")
    amount: float = Field(..., ge=0, description="Total claim amount in Rupees")
    length_of_stay: int = Field(..., ge=0, description="Hospital stay duration in days")
    items_billed: int = Field(..., ge=0, description="Number of distinct billing line items")
    rules_fired: int = Field(..., ge=0, description="Number of deterministic rules triggered")
    unmatched_ratio: float = Field(..., ge=0.0, le=1.0, description="Fraction of billing items with no clinical match")


class MLRiskRequest(BaseModel):
    """Sent by backend aiClient.ts → POST /ml-risk"""
    features: MLRiskFeatures


# ── Response Schemas ─────────────────────────────────────────────────────────

class AnomalyResponse(BaseModel):
    anomaly_score: float = Field(..., description="Normalized anomaly score 0.0–1.0 (higher = more anomalous)")
    is_anomaly: bool = Field(..., description="True when anomaly_score exceeds the model's threshold")
    top_factors: list[str] = Field(default_factory=list, description="Human-readable reasons for elevated score")


class MLRiskResponse(BaseModel):
    risk_probability: float = Field(..., description="Probability of requiring audit/review, 0.0–1.0")
    risk_level: str = Field(..., description="LOW | MEDIUM | ELEVATED | HIGH")
    top_features: list[str] = Field(default_factory=list, description="Top contributing risk factors")


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    anomaly_model: str
    risk_model: str
    version: str = "1.0.0"
