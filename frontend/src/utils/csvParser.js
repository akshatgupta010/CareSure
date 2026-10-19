import Papa from 'papaparse';

/**
 * Loads and parses a CSV file from a URL, blob, or asset path.
 */
export async function loadSyntheaCsv(filePath) {
  try {
    const url = filePath.startsWith('http') || filePath.startsWith('blob:')
      ? filePath
      : new URL(filePath, import.meta.url).href;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err),
      });
    });
  } catch (error) {
    console.error('Error loading CSV file:', error);
    return [];
  }
}

/**
 * Normalizes raw Synthea or generic claim CSV rows for the audit API.
 */
export function normalizeClaimRecords(rawData) {
  return rawData.map((row, index) => ({
    claim_id: String(row.CLAIM_ID || row.claim_id || row.Id || `CLM-${index + 1}`),
    patient_id: String(row.PATIENT || row.PATIENT_ID || row.patient_id || 'UNKNOWN_PATIENT'),
    encounter_id: String(row.ENCOUNTER || row.ENCOUNTER_ID || row.encounter_id || 'UNKNOWN_ENCOUNTER'),
    service_date: String(row.DATE || row.START || row.service_date || new Date().toISOString().split('T')[0]),
    record_type: String(row.RECORD_TYPE || row.record_type || 'billing').toLowerCase(),
    description: String(row.DESCRIPTION || row.description || row.CODE || 'Unspecified Service'),
    billed_amount: parseFloat(row.TOTAL_CLAIM_COST || row.billed_amount || row.AMOUNT || 0.0),
  }));
}

/**
 * Sends parsed and normalized records to the Express audit API.
 */
export async function sendClaimsToBackend(records) {
  const normalized = normalizeClaimRecords(records);

  const response = await fetch('http://127.0.0.1:8000/api/audit/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalized),
  });

  if (!response.ok) {
    throw new Error(`Audit API failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}