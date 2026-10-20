const REQUIRED_FIELDS = [
  "claim_id",
  "patient_id",
  "encounter_id",
  "service_date",
  "record_type",
  "description",
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toRequiredText(value) {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function toAmount(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

export function validateAndNormalizeRecords(records) {
  if (!Array.isArray(records)) {
    return { error: "Request body must be a JSON array of records." };
  }

  if (records.length === 0) {
    return { error: "Request must include at least one record." };
  }

  const normalized = [];

  for (let index = 0; index < records.length; index += 1) {
    const raw = records[index];

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { error: `Record at index ${index} must be an object.` };
    }

    const fields = {};
    for (const field of REQUIRED_FIELDS) {
      const value = toRequiredText(raw[field]);
      if (value === null) {
        return { error: `Missing required field '${field}' at index ${index}.` };
      }
      fields[field] = value;
    }

    if (!DATE_PATTERN.test(fields.service_date)) {
      return {
        error: `Invalid 'service_date' at index ${index}: expected YYYY-MM-DD.`,
      };
    }

    const billedAmount = toAmount(raw.billed_amount);
    if (!Number.isFinite(billedAmount)) {
      return {
        error: `Invalid 'billed_amount' at index ${index}: expected a number, got '${raw.billed_amount}'.`,
      };
    }

    normalized.push({ ...fields, billed_amount: billedAmount });
  }

  return { data: normalized };
}