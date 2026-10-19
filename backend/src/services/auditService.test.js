import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import app from "../app.js";
import { auditRecords } from "./auditService.js";
import { validateAndNormalizeRecords } from "../validators/auditValidator.js";

const record = (overrides = {}) => ({
  claim_id: "CLM-1",
  patient_id: "PAT-1",
  encounter_id: "ENC-1",
  service_date: "2026-01-01",
  record_type: "billing",
  description: "Consultation",
  billed_amount: 120,
  ...overrides,
});

test("normalizes valid amounts and rejects non-finite amounts", () => {
  const valid = validateAndNormalizeRecords([record({ billed_amount: "120" })]);
  assert.equal(valid.data[0].billed_amount, 120);

  const invalid = validateAndNormalizeRecords([record({ billed_amount: "Infinity" })]);
  assert.match(invalid.error, /expected a number/);
});

test("flags unsupported charges and repeated charges for human review", () => {
  const results = auditRecords([
    record(),
    record({ claim_id: "CLM-1", description: "Consultation" }),
  ]);

  assert.equal(results.length, 1);
  assert.equal(results[0].risk_level, "High");
  assert.equal(results[0].status, "FLAGGED_FOR_HUMAN_REVIEW");
  assert.deepEqual(
    results[0].discrepancies.map(({ rule_id }) => rule_id),
    ["RULE_MISSING_DOCUMENTATION", "RULE_MISSING_DOCUMENTATION", "RULE_DUPLICATE_BILLING"]
  );
});

test("marks documented charges as clean", () => {
  const results = auditRecords([
    record(),
    record({ record_type: "clinical" }),
  ]);

  assert.equal(results[0].risk_level, "Low");
  assert.equal(results[0].status, "VERIFIED_CLEAN");
  assert.deepEqual(results[0].discrepancies, []);
});

test("serves health and validates audit batch requests over HTTP", async () => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const healthResponse = await fetch(`${baseUrl}/health`);
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(await healthResponse.json(), {
      status: "ok",
      service: "caresure-backend",
    });

    const invalidResponse = await fetch(`${baseUrl}/api/audit/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([record({ billed_amount: "invalid" })]),
    });
    assert.equal(invalidResponse.status, 422);
    assert.match((await invalidResponse.json()).detail, /expected a number/);
  } finally {
    server.closeAllConnections();
    server.close();
    await once(server, "close");
  }
});
