export interface EvidenceItem {
  source: string; // "billing" | "diagnostic" | "procedure" | "discharge" | "system"
  label: string;
  value: string;
  recordId?: string;
}

export interface RuleFinding {
  fired: boolean;
  ruleId: string;
  name: string;
  category:
    | 'Missing Docs'
    | 'Data Mismatch'
    | 'Policy Issue'
    | 'Unusual Amount'
    | 'Duplicate-like'
    | 'OCR Uncertainty';
  severity: 'low' | 'medium' | 'high';
  points: number;
  reason: string;
  evidence: EvidenceItem[];
}

export interface RuleContext {
  claim: {
    id: string;
    claimNumber: string;
    patientId: string;
    encounterId: string;
    admissionDate: Date;
    dischargeDate: Date;
    procedure: string;
    diagnosis: string;
    claimAmount: number;
  };
  billing: Array<{
    id: string;
    service: string;
    code?: string | null;
    amount: number;
    serviceDate: Date;
  }>;
  procedures: Array<{
    id: string;
    name: string;
    code?: string | null;
    date: Date;
  }>;
  diagnostics: Array<{
    id: string;
    testName: string;
    reportPresent: boolean;
    date: Date;
  }>;
  documents: Array<{
    id: string;
    kind: string;
    fileName: string;
  }>;
  expectedRanges: Array<{
    procedureKey: string;
    minAmount: number;
    maxAmount: number;
  }>;
  tolerancePercent?: number;
}
