import { ClaimSummary } from './api';

export interface BenchmarkShowcaseClaim {
  id: string;
  claimNumber: string;
  procedure: string;
  confidence: number;
  status: string;
  badgeVariant: 'low' | 'review' | 'high' | 'neutral';
  patient: string;
  patientId: string;
  department: string;
  admissionDate: string;
  insurer: string;
  amount: number;
  unbackedItems: string;
  timeline: Array<{
    stage: string;
    status: 'Matched' | 'Inconsistency Detected';
    description: string;
  }>;
  breakdown: {
    completeness: number;
    consistency: number;
    billingMatch: number;
    timestamp: number;
    evidence: number;
  };
}

export const BENCHMARK_8_CLAIMS: BenchmarkShowcaseClaim[] = [
  {
    id: 'clm-2026-1041',
    claimNumber: 'CLM-2026-1041',
    procedure: 'Appendectomy',
    confidence: 28, // 72 risk
    status: 'High Risk',
    badgeVariant: 'high',
    patient: 'Priya Singh',
    patientId: 'PT-20981',
    department: 'Apollo Medical Center',
    admissionDate: '24 Sep 2026',
    insurer: 'HealthSecure India',
    amount: 245800,
    unbackedItems: 'CT Scan Abdomen is billed (₹18,500) but no corresponding diagnostic report was found. Claim amount exceeds benchmark.',
    timeline: [
      { stage: 'Registration', status: 'Matched', description: 'Patient identity and admission date consistent' },
      { stage: 'Prescription', status: 'Matched', description: 'Post-operative medication aligns with procedure' },
      { stage: 'Investigation Report', status: 'Inconsistency Detected', description: 'CT Scan Abdomen billed (₹18,500) without verified diagnostic report' },
      { stage: 'Procedure Record', status: 'Matched', description: 'Emergency appendectomy recorded by operating surgeon' },
      { stage: 'Discharge Summary', status: 'Matched', description: 'Discharge diagnosis matches clinical record' },
      { stage: 'Billing', status: 'Inconsistency Detected', description: 'Claim amount ₹2,45,800 exceeds approved benchmark range' },
    ],
    breakdown: { completeness: 85, consistency: 65, billingMatch: 45, timestamp: 88, evidence: 60 },
  },
  {
    id: 'clm-2026-1042',
    claimNumber: 'CLM-2026-1042',
    procedure: 'Hernia repair',
    confidence: 96,
    status: 'Cleared',
    badgeVariant: 'low',
    patient: 'Amit Kumar',
    patientId: 'PT-20982',
    department: 'Fortis Healthcare',
    admissionDate: '22 Sep 2026',
    insurer: 'Max Bupa Health',
    amount: 95000,
    unbackedItems: 'None. All billed items match surgical and pharmacy logs with zero discrepancies.',
    timeline: [
      { stage: 'Registration', status: 'Matched', description: 'Patient identity and admission date consistent' },
      { stage: 'Prescription', status: 'Matched', description: 'Post-operative medication aligns with procedure' },
      { stage: 'Investigation Report', status: 'Matched', description: 'Pre-op coagulation & clinical blood panels verified' },
      { stage: 'Procedure Record', status: 'Matched', description: 'Hernia repair recorded by operating surgeon' },
      { stage: 'Discharge Summary', status: 'Matched', description: 'Discharge diagnosis matches procedure record' },
      { stage: 'Billing', status: 'Matched', description: 'Room, OT, and consumable charges match hospital schedule' },
    ],
    breakdown: { completeness: 98, consistency: 97, billingMatch: 96, timestamp: 99, evidence: 98 },
  },
  {
    id: 'clm-2026-1043',
    claimNumber: 'CLM-2026-1043',
    procedure: 'Cholecystectomy',
    confidence: 52, // 48 risk
    status: 'Needs Review',
    badgeVariant: 'review',
    patient: 'Sunita Roy',
    patientId: 'PT-20983',
    department: 'Max Super Speciality Hospital',
    admissionDate: '20 Sep 2026',
    insurer: 'Star Health Insurance',
    amount: 210000,
    unbackedItems: 'Laparoscopic Trocar Pack billed 2 times on 2026-09-21 for total ₹32,000 (duplicate line charge).',
    timeline: [
      { stage: 'Registration', status: 'Matched', description: 'Patient encounter verified' },
      { stage: 'Prescription', status: 'Matched', description: 'Antibiotic therapy documented' },
      { stage: 'Investigation Report', status: 'Matched', description: 'USG whole abdomen and pelvis report verified' },
      { stage: 'Procedure Record', status: 'Matched', description: 'Cholecystectomy documented in OT log' },
      { stage: 'Discharge Summary', status: 'Matched', description: 'Discharge completed' },
      { stage: 'Billing', status: 'Inconsistency Detected', description: 'Duplicate line item: Laparoscopic Trocar Pack charged twice on same date' },
    ],
    breakdown: { completeness: 89, consistency: 68, billingMatch: 58, timestamp: 90, evidence: 70 },
  },
  {
    id: 'clm-2026-1044',
    claimNumber: 'CLM-2026-1044',
    procedure: 'Total Knee Arthroplasty',
    confidence: 52,
    status: 'Docs Needed',
    badgeVariant: 'review',
    patient: 'Rahul Mehta',
    patientId: 'PT-20984',
    department: 'Manipal Hospital',
    admissionDate: '18 Sep 2026',
    insurer: 'HDFC ERGO Health',
    amount: 320000,
    unbackedItems: 'Implant serial barcode sticker and prosthesis manufacturer invoice missing from submission.',
    timeline: [
      { stage: 'Registration', status: 'Matched', description: 'Registration and identity verified' },
      { stage: 'Prescription', status: 'Matched', description: 'Post-op analgesics and prophylaxis documented' },
      { stage: 'Investigation Report', status: 'Matched', description: 'Digital X-ray bilateral knee joint verified' },
      { stage: 'Procedure Record', status: 'Matched', description: 'Arthroplasty recorded by orthopedic surgeon' },
      { stage: 'Discharge Summary', status: 'Inconsistency Detected', description: 'Prosthesis serial barcode and invoice required for clearance' },
      { stage: 'Billing', status: 'Matched', description: 'Implant package billed' },
    ],
    breakdown: { completeness: 76, consistency: 74, billingMatch: 70, timestamp: 88, evidence: 65 },
  },
  {
    id: 'clm-2026-1045',
    claimNumber: 'CLM-2026-1045',
    procedure: 'Normal delivery',
    confidence: 98,
    status: 'Approved',
    badgeVariant: 'low',
    patient: 'Ananya Sen',
    patientId: 'PT-20985',
    department: 'Apollo Speciality Hospital',
    admissionDate: '17 Sep 2026',
    insurer: 'Care Health Insurance',
    amount: 125000,
    unbackedItems: 'Claim reviewed and approved by medical auditor with certified audit trail.',
    timeline: [
      { stage: 'Registration', status: 'Matched', description: 'Obstetric admission verified' },
      { stage: 'Prescription', status: 'Matched', description: 'Post-partum medication recorded' },
      { stage: 'Investigation Report', status: 'Matched', description: 'Maternal-fetal screening panel verified' },
      { stage: 'Procedure Record', status: 'Matched', description: 'Normal delivery recorded by obstetrician' },
      { stage: 'Discharge Summary', status: 'Matched', description: 'Discharge summary signed by attending physician' },
      { stage: 'Billing', status: 'Matched', description: 'Delivery & neonatal charges verified clean' },
    ],
    breakdown: { completeness: 99, consistency: 98, billingMatch: 99, timestamp: 99, evidence: 99 },
  },
  {
    id: 'clm-2026-1046',
    claimNumber: 'CLM-2026-1046',
    procedure: 'Coronary Angioplasty (PTCA)',
    confidence: 32, // 68 risk
    status: 'Needs Review',
    badgeVariant: 'review',
    patient: 'Vikram Malhotra',
    patientId: 'PT-20986',
    department: 'Medanta The Medicity',
    admissionDate: '15 Sep 2026',
    insurer: 'ICICI Lombard Health',
    amount: 285000,
    unbackedItems: 'Drug eluting stent billing requires verification against statutory price ceiling.',
    timeline: [
      { stage: 'Registration', status: 'Matched', description: 'Emergency cardiac admission consistent' },
      { stage: 'Prescription', status: 'Matched', description: 'Antiplatelet and cardiac medications verified' },
      { stage: 'Investigation Report', status: 'Matched', description: 'Coronary angiography report present' },
      { stage: 'Procedure Record', status: 'Matched', description: 'PTCA with stent deployment recorded' },
      { stage: 'Discharge Summary', status: 'Matched', description: 'Cardiology discharge summary complete' },
      { stage: 'Billing', status: 'Inconsistency Detected', description: 'Stent charge ₹45,000 exceeds ceiling threshold' },
    ],
    breakdown: { completeness: 88, consistency: 70, billingMatch: 52, timestamp: 85, evidence: 68 },
  },
  {
    id: 'clm-2026-1047',
    claimNumber: 'CLM-2026-1047',
    procedure: 'Cesarean delivery',
    confidence: 45, // 55 risk
    status: 'Needs Review',
    badgeVariant: 'review',
    patient: 'Kavita Joshi',
    patientId: 'PT-20987',
    department: 'Sir Ganga Ram Hospital',
    admissionDate: '14 Sep 2026',
    insurer: 'Bajaj Allianz General',
    amount: 168000,
    unbackedItems: 'Emergency OT surcharge exceeds agreed insurer tariff schedule package by 14%.',
    timeline: [
      { stage: 'Registration', status: 'Matched', description: 'Maternity registration verified' },
      { stage: 'Prescription', status: 'Matched', description: 'Surgical prophylaxis logged' },
      { stage: 'Investigation Report', status: 'Matched', description: 'Obstetric ultrasound doppler verified' },
      { stage: 'Procedure Record', status: 'Matched', description: 'LSCS documented in surgical register' },
      { stage: 'Discharge Summary', status: 'Matched', description: 'Discharge summary complete' },
      { stage: 'Billing', status: 'Inconsistency Detected', description: 'Emergency OT surcharge ₹43,000 exceeds package schedule limit' },
    ],
    breakdown: { completeness: 84, consistency: 72, billingMatch: 60, timestamp: 88, evidence: 71 },
  },
  {
    id: 'clm-2026-1048',
    claimNumber: 'CLM-2026-1048',
    procedure: 'Arthroscopic ACL Reconstruction',
    confidence: 48, // 52 risk
    status: 'Needs Review',
    badgeVariant: 'review',
    patient: 'Devansh Verma',
    patientId: 'PT-20988',
    department: 'Kokilaben Hospital',
    admissionDate: '12 Sep 2026',
    insurer: 'Niva Bupa Health',
    amount: 175000,
    unbackedItems: 'Bioabsorbable interference screw pricing requires confirmation against hospital procurement invoice.',
    timeline: [
      { stage: 'Registration', status: 'Matched', description: 'Sports orthopedic intake verified' },
      { stage: 'Prescription', status: 'Matched', description: 'Pain management and antibiotic protocol logged' },
      { stage: 'Investigation Report', status: 'Matched', description: 'MRI left knee joint report verified' },
      { stage: 'Procedure Record', status: 'Matched', description: 'ACL reconstruction documented' },
      { stage: 'Discharge Summary', status: 'Matched', description: 'Physiotherapy protocol provided' },
      { stage: 'Billing', status: 'Inconsistency Detected', description: 'Implant screw pricing requires tariff confirmation' },
    ],
    breakdown: { completeness: 86, consistency: 73, billingMatch: 64, timestamp: 87, evidence: 72 },
  },
];

// Helper to convert to ClaimSummary for ClaimsListPage and PatientsPage
export const BENCHMARK_8_CLAIM_SUMMARIES: ClaimSummary[] = BENCHMARK_8_CLAIMS.map((c) => ({
  id: c.id,
  claimNumber: c.claimNumber,
  patientName: c.patient,
  patientId: c.patientId,
  hospitalName: c.department,
  diagnosis:
    c.claimNumber === 'CLM-2026-1041'
      ? 'Acute appendicitis with peritonitis'
      : c.claimNumber === 'CLM-2026-1042'
      ? 'Inguinal hernia (Unilateral)'
      : c.claimNumber === 'CLM-2026-1043'
      ? 'Gallstones with acute cholecystitis'
      : c.claimNumber === 'CLM-2026-1044'
      ? 'Severe osteoarthritis of knee'
      : c.claimNumber === 'CLM-2026-1045'
      ? 'Single spontaneous delivery'
      : c.claimNumber === 'CLM-2026-1046'
      ? 'Unstable angina with CAD'
      : c.claimNumber === 'CLM-2026-1047'
      ? 'Repeat LSCS in labor'
      : 'Complete ACL rupture',
  procedure: c.procedure,
  claimAmount: c.amount * 100, // in paise
  status:
    c.status === 'Approved'
      ? 'Approved'
      : c.status === 'Cleared'
      ? 'Cleared'
      : c.status === 'Docs Needed'
      ? 'Documents Requested'
      : 'Pending Review',
  submittedAt: '2026-09-24T12:00:00.000Z',
  validatedAt: '2026-09-24T12:02:00.000Z',
  riskScore: 100 - c.confidence,
  band: c.badgeVariant === 'neutral' ? null : c.badgeVariant,
  validation: c.badgeVariant === 'low' ? 'passed' : c.badgeVariant === 'high' ? 'failed' : 'warnings',
}));
