import { describe, it, expect } from "vitest";
import { normalizeClaimRecords } from "./csvParser.js";
import { findMissingColumns } from "./csvParser.js";


describe("normalizeClaimRecords", () => {
    it("does not invent a claim_id, patient, encounter, or date", () => {
    const [row] = normalizeClaimRecords([{ RECORD_TYPE: "billing", DESCRIPTION: "X" }]);
    expect(row.claim_id).toBeUndefined();
    expect(row.patient_id).toBeUndefined();
    expect(row.encounter_id).toBeUndefined();
    expect(row.service_date).toBeUndefined();
  });

  it("does not default a missing record type to billing", () => {
      const [row] = normalizeClaimRecords([{ DESCRIPTION: "X" }]);
      expect(row.record_type).toBeUndefined();
    });
    
    it("keeps only the date part of an ISO timestamp", () => {
        const [row] = normalizeClaimRecords([{ START: "2019-02-10T12:34:56Z" }]);
        expect(row.service_date).toBe("2019-02-10");
  });
  
  it("strips currency formatting from amounts", () => {
    const [row] = normalizeClaimRecords([{ TOTAL_CLAIM_COST: "₹1,250.00" }]);
    expect(row.billed_amount).toBe("1250.00");
});
});

it("reports the billing columns missing from a clinical file", () => {
  const headers = ["START", "STOP", "PATIENT", "ENCOUNTER", "CODE", "DESCRIPTION"];
  expect(findMissingColumns(headers)).toEqual([
    "claim_id",
    "record_type",
    "billed_amount",
  ]);
});