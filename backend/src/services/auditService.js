import { normalizeDescription } from "../utils/text.js";

export function auditRecords(records) {
  const grouped = new Map();

  for (const record of records) {
    const groupKey = JSON.stringify([record.patient_id, record.encounter_id]);
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        patient_id: record.patient_id,
        encounter_id: record.encounter_id,
        records: [],
      });
    }
    grouped.get(groupKey).records.push(record);
  }

  return [...grouped.values()].map(
    ({ patient_id, encounter_id, records: encounterRecords }) => {
      const billingRecords = encounterRecords.filter(
        (record) => record.record_type.toLowerCase() === "billing"
      );
      const documentationRecords = encounterRecords.filter((record) =>
        ["clinical", "procedure", "diagnostic"].includes(
          record.record_type.toLowerCase()
        )
      );
      const claim_id =
        billingRecords[0]?.claim_id ?? encounterRecords[0].claim_id;
      const discrepancies = [];
      const documentedServices = new Set(
        documentationRecords.map((record) =>
          normalizeDescription(record.description)
        )
      );

      for (const bill of billingRecords) {
        const description = normalizeDescription(bill.description);
        if (!documentedServices.has(description)) {
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

      const seenCharges = new Map();
      for (const bill of billingRecords) {
        const chargeKey = JSON.stringify([
          normalizeDescription(bill.description),
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

      const hasHighRisk = discrepancies.some(
        (discrepancy) => discrepancy.risk_level === "High"
      );
      const risk_level = hasHighRisk
        ? "High"
        : discrepancies.length > 0
          ? "Medium"
          : "Low";

      return {
        claim_id,
        patient_id,
        encounter_id,
        risk_level,
        discrepancies,
        status:
          discrepancies.length > 0
            ? "FLAGGED_FOR_HUMAN_REVIEW"
            : "VERIFIED_CLEAN",
      };
    }
  );
}
