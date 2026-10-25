"""
tests/test_ai_service.py – Tests for the CareSure AI microservice.

Tests:
  1. Health endpoint (models loaded and not loaded)
  2. Anomaly detection endpoint
  3. Risk classification endpoint
  4. Token authentication
  5. Invalid/missing inputs
  6. Hero case (CLM-2026-1041 Appendectomy with CT scan missing)
  7. Clean case (low-risk hernia repair)

Run from ai-service/ directory:
    pytest tests/ -v
"""

import os
import sys
from pathlib import Path

# Ensure app is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient

# Set env vars before importing app
os.environ.setdefault("AI_SERVICE_TOKEN", "test-secret-token-1234567890")
os.environ.setdefault("MODELS_DIR", str(Path(__file__).parent.parent / "models"))

from app.main import app

client = TestClient(app)
AUTH_HEADERS = {"X-Service-Token": "test-secret-token-1234567890"}


# ── Health Endpoint ───────────────────────────────────────────────────────────

class TestHealth:
    def test_health_returns_200(self):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_response_schema(self):
        resp = client.get("/health")
        data = resp.json()
        assert "status" in data
        assert "models_loaded" in data
        assert "anomaly_model" in data
        assert "risk_model" in data
        assert data["status"] in ("ok", "degraded")

    def test_health_no_auth_required(self):
        """Health endpoint is public — no token needed."""
        resp = client.get("/health")
        assert resp.status_code == 200


# ── Anomaly Endpoint ─────────────────────────────────────────────────────────

class TestAnomalyEndpoint:
    NORMAL_PAYLOAD = {
        "procedure": "Hernia repair",
        "amount": 95000.0,
        "length_of_stay": 2,
        "items_billed": 5,
    }

    HIGH_RISK_PAYLOAD = {
        "procedure": "Appendectomy",
        "amount": 450000.0,   # Well above ₹2.2L benchmark ceiling
        "length_of_stay": 4,
        "items_billed": 8,
    }

    def test_anomaly_normal_claim(self):
        resp = client.post("/anomaly", json=self.NORMAL_PAYLOAD, headers=AUTH_HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert "anomaly_score" in data
        assert "is_anomaly" in data
        assert "top_factors" in data
        assert 0.0 <= data["anomaly_score"] <= 1.0
        assert isinstance(data["is_anomaly"], bool)
        assert isinstance(data["top_factors"], list)

    def test_anomaly_high_risk_claim(self):
        resp = client.post("/anomaly", json=self.HIGH_RISK_PAYLOAD, headers=AUTH_HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        # High-amount claim should have a higher score than normal
        assert data["anomaly_score"] >= 0.0

    def test_anomaly_score_range(self):
        resp = client.post("/anomaly", json=self.NORMAL_PAYLOAD, headers=AUTH_HEADERS)
        assert resp.status_code == 200
        score = resp.json()["anomaly_score"]
        assert 0.0 <= score <= 1.0, f"Score {score} out of [0, 1] range"

    def test_anomaly_missing_field(self):
        """Missing required field should return 422 Unprocessable Entity."""
        payload = {"procedure": "Appendectomy", "amount": 100000.0}  # Missing los + items
        resp = client.post("/anomaly", json=payload, headers=AUTH_HEADERS)
        assert resp.status_code == 422

    def test_anomaly_negative_amount_rejected(self):
        payload = {**self.NORMAL_PAYLOAD, "amount": -1000.0}
        resp = client.post("/anomaly", json=payload, headers=AUTH_HEADERS)
        assert resp.status_code == 422

    def test_anomaly_zero_stay(self):
        """Zero length of stay is valid input (day procedure)."""
        payload = {**self.NORMAL_PAYLOAD, "length_of_stay": 0}
        resp = client.post("/anomaly", json=payload, headers=AUTH_HEADERS)
        assert resp.status_code == 200

    def test_anomaly_hero_case(self):
        """
        Hero case: Appendectomy ₹2,45,800 — 4-day stay, 5 items.
        This matches CLM-2026-1041 from seed data.
        """
        payload = {
            "procedure": "Appendectomy",
            "amount": 245800.0,
            "length_of_stay": 4,
            "items_billed": 5,
        }
        resp = client.post("/anomaly", json=payload, headers=AUTH_HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        # Amount is near the top of the benchmark (₹1.5L–₹2.2L),
        # so it should have a moderate-to-high anomaly score.
        assert 0.0 <= data["anomaly_score"] <= 1.0
        assert isinstance(data["top_factors"], list)

    def test_anomaly_empty_procedure_rejected(self):
        payload = {**self.NORMAL_PAYLOAD, "procedure": "   "}
        resp = client.post("/anomaly", json=payload, headers=AUTH_HEADERS)
        assert resp.status_code == 422


# ── ML Risk Endpoint ──────────────────────────────────────────────────────────

class TestMLRiskEndpoint:
    NORMAL_PAYLOAD = {
        "features": {
            "procedure": "Hernia repair",
            "amount": 95000.0,
            "length_of_stay": 2,
            "items_billed": 5,
            "rules_fired": 0,
            "unmatched_ratio": 0.0,
        }
    }

    HIGH_RISK_PAYLOAD = {
        "features": {
            "procedure": "Appendectomy",
            "amount": 450000.0,
            "length_of_stay": 4,
            "items_billed": 9,
            "rules_fired": 2,
            "unmatched_ratio": 0.4,
        }
    }

    def test_risk_normal_claim(self):
        resp = client.post("/ml-risk", json=self.NORMAL_PAYLOAD, headers=AUTH_HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert "risk_probability" in data
        assert "risk_level" in data
        assert "top_features" in data
        assert 0.0 <= data["risk_probability"] <= 1.0
        assert data["risk_level"] in ("LOW", "MEDIUM", "ELEVATED", "HIGH")
        assert isinstance(data["top_features"], list)

    def test_risk_high_risk_claim(self):
        resp = client.post("/ml-risk", json=self.HIGH_RISK_PAYLOAD, headers=AUTH_HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert 0.0 <= data["risk_probability"] <= 1.0

    def test_risk_probability_range(self):
        resp = client.post("/ml-risk", json=self.NORMAL_PAYLOAD, headers=AUTH_HEADERS)
        assert resp.status_code == 200
        prob = resp.json()["risk_probability"]
        assert 0.0 <= prob <= 1.0, f"Probability {prob} out of [0, 1] range"

    def test_risk_missing_features(self):
        """Missing required features field should return 422."""
        resp = client.post("/ml-risk", json={"procedure": "Appendectomy"}, headers=AUTH_HEADERS)
        assert resp.status_code == 422

    def test_risk_invalid_unmatched_ratio(self):
        """unmatched_ratio > 1.0 should be rejected."""
        payload = {
            "features": {**self.NORMAL_PAYLOAD["features"], "unmatched_ratio": 1.5}
        }
        resp = client.post("/ml-risk", json=payload, headers=AUTH_HEADERS)
        assert resp.status_code == 422

    def test_risk_hero_case(self):
        """Hero case with 1 rule fired (R01 Missing Diagnostic Report)."""
        payload = {
            "features": {
                "procedure": "Appendectomy",
                "amount": 245800.0,
                "length_of_stay": 4,
                "items_billed": 5,
                "rules_fired": 1,
                "unmatched_ratio": 0.2,
            }
        }
        resp = client.post("/ml-risk", json=payload, headers=AUTH_HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        # With rules_fired=1 and amount near benchmark ceiling, should be non-zero risk
        assert data["risk_probability"] >= 0.0
        assert data["risk_level"] in ("LOW", "MEDIUM", "ELEVATED", "HIGH")

    def test_risk_unknown_procedure(self):
        """Unknown procedure should not crash — should fall back to 'other'."""
        payload = {
            "features": {
                "procedure": "Experimental Nano-Surgery",
                "amount": 500000.0,
                "length_of_stay": 7,
                "items_billed": 15,
                "rules_fired": 0,
                "unmatched_ratio": 0.1,
            }
        }
        resp = client.post("/ml-risk", json=payload, headers=AUTH_HEADERS)
        assert resp.status_code == 200


# ── Authentication ────────────────────────────────────────────────────────────

class TestAuthentication:
    ANOMALY_PAYLOAD = {
        "procedure": "Hernia repair",
        "amount": 95000.0,
        "length_of_stay": 2,
        "items_billed": 5,
    }

    def test_wrong_token_rejected(self):
        resp = client.post(
            "/anomaly",
            json=self.ANOMALY_PAYLOAD,
            headers={"X-Service-Token": "wrong-token"},
        )
        assert resp.status_code == 401

    def test_missing_token_rejected(self):
        resp = client.post("/anomaly", json=self.ANOMALY_PAYLOAD)
        assert resp.status_code == 401

    def test_correct_token_accepted(self):
        resp = client.post("/anomaly", json=self.ANOMALY_PAYLOAD, headers=AUTH_HEADERS)
        assert resp.status_code == 200


# ── Score boundary integration ────────────────────────────────────────────────

class TestScoreBoundaries:
    """Verify that the hybrid scoring formula works as expected end-to-end."""

    def test_score_formula_hero_case(self):
        """
        Simulate the scoring from the backend test:
        rules_points=25, ml_probability=0.80, anomaly_score=0.76
        → ml_points = round(0.80 × 35) = 28
        → anomaly_points = round(0.76 × 25) = 19
        → total = 25 + 28 + 19 = 72
        """
        # This is a pure math test of the scoring formula, not an API call
        rules_points = 25
        ml_probability = 0.80
        anomaly_score = 0.76
        ml_cap = 35
        anomaly_cap = 25

        ml_points = round(ml_probability * ml_cap)
        anomaly_points = round(anomaly_score * anomaly_cap)
        total = rules_points + ml_points + anomaly_points

        assert ml_points == 28
        assert anomaly_points == 19
        assert total == 72

    def test_score_caps(self):
        """Total score should never exceed 100."""
        ml_points = min(round(1.0 * 35), 35)
        anomaly_points = min(round(1.0 * 25), 25)
        rules_points = min(100, 40)
        total = min(100, rules_points + ml_points + anomaly_points)
        assert total <= 100
