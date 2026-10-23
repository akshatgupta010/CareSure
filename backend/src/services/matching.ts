export interface MatchRecord {
  billingId: string;
  matchedId?: string;
  matchedType?: 'procedure' | 'diagnostic';
  matchType: 'exact' | 'fuzzy' | 'none';
  confidence: number;
}

export interface MatchingResult {
  matchedPairs: MatchRecord[];
  unmatchedBilling: Array<{
    id: string;
    service: string;
    code?: string | null;
    amount: number;
    serviceDate: Date;
  }>;
  unmatchedClinical: Array<{
    id: string;
    type: 'procedure' | 'diagnostic';
    name: string;
    code?: string | null;
    date: Date;
  }>;
}

const SYNONYMS: Record<string, string[]> = {
  'ct scan': ['computed tomography', 'cat scan', 'ct abdomen', 'ct scan abdomen', 'ct pelvis'],
  'computed tomography': ['ct scan', 'cat scan', 'ct abdomen'],
  'ultrasound': ['usg', 'ultrasonography', 'sonography', 'usg abdomen'],
  'mri': ['magnetic resonance imaging', 'mri scan'],
  'x-ray': ['xray', 'radiograph', 'chest x-ray'],
  'appendectomy': ['appendix removal', 'laparoscopic appendectomy', 'open appendectomy'],
  'cbc': ['complete blood count', 'hemogram'],
  'ecg': ['electrocardiogram', 'ekg'],
};

function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function areSynonyms(a: string, b: string): boolean {
  const normA = normalizeString(a);
  const normB = normalizeString(b);

  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  for (const [canonical, list] of Object.entries(SYNONYMS)) {
    const group = [canonical, ...list].map(normalizeString);
    if (group.includes(normA) && group.includes(normB)) {
      return true;
    }
  }

  return false;
}

export function matchRecords(
  billing: Array<{ id: string; service: string; code?: string | null; amount: number; serviceDate: Date }>,
  procedures: Array<{ id: string; name: string; code?: string | null; date: Date }>,
  diagnostics: Array<{ id: string; testName: string; reportPresent: boolean; date: Date }>
): MatchingResult {
  const matchedBillingIds = new Set<string>();
  const matchedProcedureIds = new Set<string>();
  const matchedDiagnosticIds = new Set<string>();

  const matchedPairs: MatchRecord[] = [];

  // Match each billing item
  for (const bill of billing) {

    // 1. Try matching against diagnostics
    let diagMatch = diagnostics.find(
      (d) =>
        !matchedDiagnosticIds.has(d.id) &&
        (d.testName.toLowerCase() === bill.service.toLowerCase() ||
          (bill.code && d.testName.toLowerCase().includes(bill.code.toLowerCase())))
    );

    if (diagMatch) {
      matchedBillingIds.add(bill.id);
      matchedDiagnosticIds.add(diagMatch.id);
      matchedPairs.push({
        billingId: bill.id,
        matchedId: diagMatch.id,
        matchedType: 'diagnostic',
        matchType: 'exact',
        confidence: 1.0,
      });
      continue;
    }

    // Fuzzy synonym match for diagnostics
    diagMatch = diagnostics.find(
      (d) => !matchedDiagnosticIds.has(d.id) && areSynonyms(d.testName, bill.service)
    );

    if (diagMatch) {
      matchedBillingIds.add(bill.id);
      matchedDiagnosticIds.add(diagMatch.id);
      matchedPairs.push({
        billingId: bill.id,
        matchedId: diagMatch.id,
        matchedType: 'diagnostic',
        matchType: 'fuzzy',
        confidence: 0.85,
      });
      continue;
    }

    // 2. Try matching against procedures
    let procMatch = procedures.find(
      (p) =>
        !matchedProcedureIds.has(p.id) &&
        (p.name.toLowerCase() === bill.service.toLowerCase() ||
          (bill.code && p.code && bill.code === p.code))
    );

    if (procMatch) {
      matchedBillingIds.add(bill.id);
      matchedProcedureIds.add(procMatch.id);
      matchedPairs.push({
        billingId: bill.id,
        matchedId: procMatch.id,
        matchedType: 'procedure',
        matchType: 'exact',
        confidence: 1.0,
      });
      continue;
    }

    // Fuzzy match for procedures
    procMatch = procedures.find(
      (p) => !matchedProcedureIds.has(p.id) && areSynonyms(p.name, bill.service)
    );

    if (procMatch) {
      matchedBillingIds.add(bill.id);
      matchedProcedureIds.add(procMatch.id);
      matchedPairs.push({
        billingId: bill.id,
        matchedId: procMatch.id,
        matchedType: 'procedure',
        matchType: 'fuzzy',
        confidence: 0.85,
      });
      continue;
    }

    // If unmatched, mark
    matchedPairs.push({
      billingId: bill.id,
      matchType: 'none',
      confidence: 0.0,
    });
  }

  const unmatchedBilling = billing.filter((b) => !matchedBillingIds.has(b.id));

  const unmatchedClinical: MatchingResult['unmatchedClinical'] = [];
  procedures.forEach((p) => {
    if (!matchedProcedureIds.has(p.id)) {
      unmatchedClinical.push({
        id: p.id,
        type: 'procedure',
        name: p.name,
        code: p.code,
        date: p.date,
      });
    }
  });

  diagnostics.forEach((d) => {
    if (!matchedDiagnosticIds.has(d.id)) {
      unmatchedClinical.push({
        id: d.id,
        type: 'diagnostic',
        name: d.testName,
        date: d.date,
      });
    }
  });

  return {
    matchedPairs,
    unmatchedBilling,
    unmatchedClinical,
  };
}
