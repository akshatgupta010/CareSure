import { normalizeDescription } from "../utils/text.js";

const DOCUMENTATION_TYPES = ["clinical", "procedure", "diagnostic"];

function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

function buildGroupKey(record) {
  return JSON.stringify([record.patient_id, record.encounter_id]);
}

function groupRecords(records) {
  const grouped = new Map();

  for (const record of records) {
    const key = buildGroupKey(record);
    if (!grouped.has(key)) {
      grouped.set(key, {
        patient_id: record.patient_id,
        encounter_id: record.encounter_id,
        records: [],
      });
    }
    grouped.get(key).records.push(record);
  }

  return [...grouped.values()];
}

function resolveClaimId(encounterRecords) {
  const claimIds = [...new Set(encounterRecords.map((r) => r.claim_id))];

  if (claimIds.length !== 1) {
    return { claim_id: null, error: "MIXED_CLAIM_IDS" };
  }

  return { claim_id: claimIds[0], error: null };
}

function checkMissingDocumentation(billingRecords, documentationRecords) {
  const documented = new Set(
    documentationRecords.map((r) => normalizeDescription(r.description))
  );

  const discrepancies = [];

  for (const bill of billingRecords) {
    const description = normalizeDescription(bill.description);

    if (!documented.has(description)) {
      discrepancies.push({
        rule_id: "RULE_MISSING_DOCUMENTATION",
        risk_level: "High",
        reason: `Billed service '${bill.description}' lacks corresponding clinical or diagnostic record.`,
        evidence: [
          `Billing record charges for ${bill.description}`,
          "No corresponding clinical or diagnostic document found",
        ],
      });
    }
  }

  return discrepancies;
}

function checkDuplicateBilling(billingRecords, encounterId) {
  const counts = new Map();
  const firstSeen = new Map();

  for (const bill of billingRecords) {
    const key = JSON.stringify([
      normalizeDescription(bill.description),
      toCents(bill.billed_amount),
      bill.service_date,
    ]);

    counts.set(key, (counts.get(key) || 0) + 1);

    if (!firstSeen.has(key)) {
      firstSeen.set(key, bill);
    }
  }

  const discrepancies = [];

  for (const [key, count] of counts) {
    if (count > 1) {
      const bill = firstSeen.get(key);
      discrepancies.push({
        rule_id: "RULE_DUPLICATE_BILLING",
        risk_level: "High",
        reason: `Duplicate line item detected: '${bill.description}' billed ${count} times on ${bill.service_date}.`,
        evidence: [
          `Identical charge of $${(toCents(bill.billed_amount) / 100).toFixed(2)} repeated ${count} times within encounter ${encounterId}`,
        ],
      });
    }
  }

  return discrepancies;
}

function deriveRisk(discrepancies) {
  if (discrepancies.some((d) => d.risk_level === "High")) return "High";
  if (discrepancies.length > 0) return "Medium";
  return "Low";
}

export function auditRecords(records) {
  const groups = groupRecords(records);

  return groups.map(({ patient_id, encounter_id, records: encounterRecords }) => {
    const { claim_id, error } = resolveClaimId(encounterRecords);

    if (error) {
      return {
        claim_id: null,
        patient_id,
        encounter_id,
        risk_level: "High",
        discrepancies: [
          {
            rule_id: "RULE_INCONSISTENT_CLAIM_ID",
            risk_level: "High",
            reason: "Records in this encounter reference more than one claim_id.",
            evidence: [error],
          },
        ],
        status: "FLAGGED_FOR_HUMAN_REVIEW",
      };
    }

    const billingRecords = encounterRecords.filter(
      (r) => r.record_type.toLowerCase() === "billing"
    );

    if (billingRecords.length === 0) {
      return {
        claim_id,
        patient_id,
        encounter_id,
        risk_level: "Low",
        discrepancies: [],
        status: "NO_BILLING_RECORDS",
      };
    }

    const documentationRecords = encounterRecords.filter((r) =>
      DOCUMENTATION_TYPES.includes(r.record_type.toLowerCase())
    );

    const discrepancies = [
      ...checkMissingDocumentation(billingRecords, documentationRecords),
      ...checkDuplicateBilling(billingRecords, encounter_id),
    ];

    return {
      claim_id,
      patient_id,
      encounter_id,
      risk_level: deriveRisk(discrepancies),
      discrepancies,
      status:
        discrepancies.length > 0 ? "FLAGGED_FOR_HUMAN_REVIEW" : "VERIFIED_CLEAN",
    };
  });
}