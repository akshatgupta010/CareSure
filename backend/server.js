import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || "127.0.0.1";

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const REQUIRED_STRING_FIELDS = [
  "claim_id",
  "patient_id",
  "encounter_id",
  "service_date",
  "record_type",
  "description",
];

function validateAndNormalizeRecords(records) {
  if (!Array.isArray(records)) {
    return { error: "Request body must be a JSON array of records." };
  }

  const normalized = [];

  for (let i = 0; i < records.length; i++) {
    const raw = records[i];
    if (!raw || typeof raw !== "object") {
      return { error: `Record at index ${i} must be an object.` };
    }

    for (const field of REQUIRED_STRING_FIELDS) {
      if (raw[field] === undefined || raw[field] === null) {
        return { error: `Missing required field '${field}' at index ${i}.` };
      }
    }

    const rawAmount = raw.billed_amount;
    const billedAmount =
      rawAmount === undefined || rawAmount === null || rawAmount === ""
        ? 0.0
        : Number(rawAmount);

    if (Number.isNaN(billedAmount)) {
      return {
        error: `Invalid 'billed_amount' at index ${i}: expected a number, got '${rawAmount}'.`,
      };
    }

    normalized.push({
      claim_id: String(raw.claim_id),
      patient_id: String(raw.patient_id),
      encounter_id: String(raw.encounter_id),
      service_date: String(raw.service_date),
      record_type: String(raw.record_type),
      description: String(raw.description),
      billed_amount: billedAmount,
    });
  }

  return { data: normalized };
}

app.post("/api/audit/batch", (req, res) => {
  const { data: records, error } = validateAndNormalizeRecords(req.body);

  if (error) {
    return res.status(422).json({ detail: error });
  }

  // Group records by (patient_id, encounter_id) preserving insertion order
  const grouped = new Map();
  for (const rec of records) {
    const groupKey = JSON.stringify([rec.patient_id, rec.encounter_id]);
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        patient_id: rec.patient_id,
        encounter_id: rec.encounter_id,
        records: [],
      });
    }
    grouped.get(groupKey).records.push(rec);
  }

  const results = [];

  for (const { patient_id, encounter_id, records: encounterRecords } of grouped.values()) {
    const billingRecords = encounterRecords.filter(
      (r) => r.record_type.toLowerCase() === "billing"
    );
    const clinicalRecords = encounterRecords.filter((r) =>
      ["clinical", "procedure"].includes(r.record_type.toLowerCase())
    );
    const diagnosticRecords = encounterRecords.filter(
      (r) => r.record_type.toLowerCase() === "diagnostic"
    );

    const claim_id =
      billingRecords.length > 0
        ? billingRecords[0].claim_id
        : encounterRecords[0].claim_id;

    const discrepancies = [];

    // Rule 1: Missing Documentation (Billed item without clinical/diagnostic note)
    const documentedServices = new Set(
      [...clinicalRecords, ...diagnosticRecords].map((r) =>
        r.description.trim().toLowerCase()
      )
    );

    for (const bill of billingRecords) {
      const descClean = bill.description.trim().toLowerCase();
      if (!documentedServices.has(descClean)) {
        discrepancies.push({
          rule_id: "RULE_MISSING_DOCUMENTATION",
          risk_level: "High",
          reason: `Billed service '${bill.description}' lacks corresponding clinical or diagnostic records.`,
          evidence: [
            `Billing record charges for ${bill.description}`,
            "No corresponding clinical or diagnostic document found",
          ],
        });
      }
    }

    // Rule 2: Duplicate Billing Check
    const seenCharges = new Map();
    for (const bill of billingRecords) {
      const chargeKey = JSON.stringify([
        bill.description.trim().toLowerCase(),
        bill.billed_amount,
      ]);
      const count = (seenCharges.get(chargeKey) || 0) + 1;
      seenCharges.set(chargeKey, count);

      if (count === 2) {
        discrepancies.push({
          rule_id: "RULE_DUPLICATE_BILLING",
          risk_level: "High",
          reason: `Duplicate line item detected: '${bill.description}' billed multiple times.`,
          evidence: [
            `Identical charge of $${bill.billed_amount} repeated within encounter ${encounter_id}`,
          ],
        });
      }
    }

    const hasHighRisk = discrepancies.some((d) => d.risk_level === "High");
    const overallRisk = hasHighRisk
      ? "High"
      : discrepancies.length > 0
      ? "Medium"
      : "Low";
    const status =
      discrepancies.length > 0 ? "FLAGGED_FOR_HUMAN_REVIEW" : "VERIFIED_CLEAN";

    results.push({
      claim_id,
      patient_id,
      encounter_id,
      risk_level: overallRisk,
      discrepancies,
      status,
    });
  }

  return res.status(200).json(results);
});

app.listen(PORT, HOST, () => {
  console.log(`CareSure Backend Engine running at http://${HOST}:${PORT}`);
});