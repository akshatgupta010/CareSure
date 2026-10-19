const REQUIRED_STRING_FIELDS = [
  "claim_id",
  "patient_id",
  "encounter_id",
  "service_date",
  "record_type",
  "description",
];

export function validateAndNormalizeRecords(records) {
  if (!Array.isArray(records)) {
    return { error: "Request body must be a JSON array of records." };
  }

  const normalized = [];

  for (let index = 0; index < records.length; index += 1) {
    const raw = records[index];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { error: `Record at index ${index} must be an object.` };
    }

    for (const field of REQUIRED_STRING_FIELDS) {
      if (raw[field] === undefined || raw[field] === null) {
        return { error: `Missing required field '${field}' at index ${index}.` };
      }
    }

    const rawAmount = raw.billed_amount;
    const billedAmount =
      rawAmount === undefined || rawAmount === null || rawAmount === ""
        ? 0
        : Number(rawAmount);

    if (!Number.isFinite(billedAmount)) {
      return {
        error: `Invalid 'billed_amount' at index ${index}: expected a number, got '${rawAmount}'.`,
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
