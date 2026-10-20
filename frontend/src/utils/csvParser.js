import Papa from "papaparse";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export const COLUMN_ALIASES = {
  claim_id: ["CLAIM_ID", "claim_id"],
  patient_id: ["PATIENT", "PATIENT_ID", "patient_id"],
  encounter_id: ["ENCOUNTER", "ENCOUNTER_ID", "encounter_id"],
  service_date: ["DATE", "START", "service_date"],
  record_type: ["RECORD_TYPE", "record_type"],
  description: ["DESCRIPTION", "description"],
  billed_amount: ["TOTAL_CLAIM_COST", "billed_amount", "AMOUNT"],
};

function cleanHeader(header) {
  return header.replace(/^\uFEFF/, "").trim();
}

/** Returns the audit fields that have no matching column in the file. */
export function findMissingColumns(headers) {
  const present = new Set(headers);
  return Object.entries(COLUMN_ALIASES)
    .filter(([, aliases]) => !aliases.some((alias) => present.has(alias)))
    .map(([field]) => field);
}

/**
 * Loads a CSV from a URL/path or from a File object.
 * Returns { rows, headers }. Throws on failure.
 */
export async function loadSyntheaCsv(source) {
  let csvText;

  if (typeof source === "string") {
    const url = /^(https?:|blob:)/.test(source)
      ? source
      : new URL(source, import.meta.url).href;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
    }
    csvText = await response.text();
  } else {
    csvText = await source.text();
  }

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: cleanHeader,
      complete: (results) =>
        resolve({ rows: results.data, headers: results.meta.fields ?? [] }),
      error: reject,
    });
  });
}

function pick(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return undefined;
}

/** Keeps the YYYY-MM-DD part of ISO timestamps. Other values pass through for the validator. */
function toDateOnly(value) {
  if (value === undefined) return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : value;
}

/** Removes currency symbols, thousands separators, and spaces. */
function toAmountString(value) {
  if (value === undefined) return undefined;
  return value.replace(/[$,₹\s]/g, "");
}

/**
 * Maps raw CSV rows to the audit API shape.
 * Never invents values: missing fields stay undefined so the backend rejects them.
 */
export function normalizeClaimRecords(rawData) {
  return rawData.map((row) => ({
    claim_id: pick(row, COLUMN_ALIASES.claim_id),
    patient_id: pick(row, COLUMN_ALIASES.patient_id),
    encounter_id: pick(row, COLUMN_ALIASES.encounter_id),
    service_date: toDateOnly(pick(row, COLUMN_ALIASES.service_date)),
    record_type: pick(row, COLUMN_ALIASES.record_type)?.toLowerCase(),
    description: pick(row, COLUMN_ALIASES.description),
    billed_amount: toAmountString(pick(row, COLUMN_ALIASES.billed_amount)),
  }));
}

/**
 * Sends normalized records to the Express audit API.
 * Throws an Error carrying the backend's detail message on failure.
 */
export async function sendClaimsToBackend(records) {
  const normalized = normalizeClaimRecords(records);

  const response = await fetch(`${API_URL}/api/audit/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalized),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? `Audit API failed: ${response.status}`);
  }

  return response.json();
}