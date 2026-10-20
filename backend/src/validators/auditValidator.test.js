import test from "node:test";
import assert from "node:assert/strict";
import { validateAndNormalizeRecords } from "./auditValidator.js";

const valid = {
  claim_id: "CLM-1",
  patient_id: "PAT-1",
  encounter_id: "ENC-1",
  service_date: "2026-01-01",
  record_type: "billing",
  description: "Consultation",
  billed_amount: 120,
};

test("accepts a valid record and converts the amount to a number", () => {
  const result = validateAndNormalizeRecords([{ ...valid, billed_amount: "120.50" }]);
  assert.equal(result.data[0].billed_amount, 120.5);
});

test("rejects empty required strings", () => {
  const result = validateAndNormalizeRecords([{ ...valid, claim_id: "   " }]);
  assert.match(result.error, /claim_id/);
});

test("rejects a missing billed_amount instead of defaulting to zero", () => {
  const withoutAmount = { ...valid };
  delete withoutAmount.billed_amount;

  const result = validateAndNormalizeRecords([withoutAmount]);
  assert.match(result.error, /billed_amount/);
});

test("rejects a malformed service_date", () => {
  const result = validateAndNormalizeRecords([{ ...valid, service_date: "01/09/2026" }]);
  assert.match(result.error, /service_date/);
});

test("rejects records that are not objects", () => {
  const result = validateAndNormalizeRecords(["not a record"]);
  assert.match(result.error, /must be an object/);
});

test("rejects an empty batch", () => {
  const result = validateAndNormalizeRecords([]);
  assert.match(result.error, /at least one record/);
});