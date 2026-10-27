import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from './config/db.js';
import { User } from './models/User.js';
import { Claim } from './models/Claim.js';
import { Setting } from './models/Setting.js';
import { ExpectedRange } from './models/ExpectedRange.js';
import { RefreshToken } from './models/RefreshToken.js';
import { AuditLog } from './models/AuditLog.js';
import { EvaluationRun } from './models/EvaluationRun.js';

export const BENCHMARK_8_CLAIMS = [
  // 1. Hero High Risk Case
  {
    claimNumber: 'CLM-2026-1041',
    patientId: 'PT-20981',
    patientName: 'Priya Singh',
    hospitalName: 'Apollo Medical Center',
    insurer: 'HealthSecure India',
    policyNumber: 'POL-882910',
    encounterId: 'ENC-77120',
    admissionDate: new Date('2026-09-24T09:00:00Z'),
    dischargeDate: new Date('2026-09-28T14:00:00Z'),
    diagnosis: 'Acute appendicitis with localized peritonitis',
    procedure: 'Appendectomy',
    claimAmount: 24580000, // ₹2,45,800
    status: 'Pending Review',
    submittedAt: new Date('2026-09-28T16:30:00Z'),
    validatedAt: new Date('2026-09-28T16:32:00Z'),
    billing: [
      { service: 'Appendectomy Surgical Fee', code: 'APP-01', amount: 15000000, serviceDate: new Date('2026-09-25T10:00:00Z'), encounterId: 'ENC-77120' },
      { service: 'CT Scan Abdomen', code: 'CT-ABD', amount: 1850000, serviceDate: new Date('2026-09-24T14:00:00Z'), encounterId: 'ENC-77120' },
      { service: 'IPD Room Charges (4 Days)', code: 'ROOM-IPD', amount: 3200000, serviceDate: new Date('2026-09-28T12:00:00Z'), encounterId: 'ENC-77120' },
      { service: 'Pharmacy & Surgical Consumables', code: 'PHARM-SURG', amount: 2530000, serviceDate: new Date('2026-09-27T18:00:00Z'), encounterId: 'ENC-77120' },
      { service: 'Anesthesia & Sedation Charges', code: 'ANES-GEN', amount: 2000000, serviceDate: new Date('2026-09-25T10:00:00Z'), encounterId: 'ENC-77120' },
    ],
    procedures: [
      { name: 'Appendectomy', code: 'APP-01', date: new Date('2026-09-25T10:00:00Z'), encounterId: 'ENC-77120' },
    ],
    diagnostics: [
      { testName: 'Complete Blood Count (CBC)', reportPresent: true, date: new Date('2026-09-24T11:00:00Z'), encounterId: 'ENC-77120' },
      { testName: 'Urine Routine & Microscopic', reportPresent: true, date: new Date('2026-09-24T11:30:00Z'), encounterId: 'ENC-77120' },
    ],
    documents: [
      { kind: 'discharge_summary', fileName: 'Discharge_Summary_PT20981.pdf', storedPath: 'uploads/demo-discharge.pdf', mimeType: 'application/pdf', sizeBytes: 245000 },
      { kind: 'bill', fileName: 'Detailed_Breakup_Bill.pdf', storedPath: 'uploads/demo-bill.pdf', mimeType: 'application/pdf', sizeBytes: 182000 },
    ],
    findings: [
      {
        ruleId: 'R01',
        category: 'Missing Docs',
        severity: 'high',
        points: 25,
        reason: 'CT Scan Abdomen is billed (₹18,500) but no corresponding diagnostic report was found.',
        evidence: [
          { source: 'billing', label: 'CT Scan Abdomen', value: '₹18,500' },
          { source: 'diagnostic', label: 'CT report', value: 'not found' },
          { source: 'procedure', label: 'Appendectomy', value: 'recorded' },
        ],
      },
    ],
    assessment: {
      rulesPoints: 25,
      mlPoints: 28,
      anomalyPoints: 19,
      total: 72,
      band: 'high',
      validation: 'failed',
      aiSignalsAvailable: true,
      processingMs: 1840,
      thresholdsSnapshot: { lowMax: 39, reviewMax: 69, rulesCap: 40, mlCap: 35, anomalyCap: 25, minOcrConfidence: 0.7 },
    },
  },

  // 2. Clean Straight-Through Cleared Case
  {
    claimNumber: 'CLM-2026-1042',
    patientId: 'PT-20982',
    patientName: 'Amit Kumar',
    hospitalName: 'Fortis Healthcare',
    insurer: 'Max Bupa Health',
    policyNumber: 'POL-339102',
    encounterId: 'ENC-77121',
    admissionDate: new Date('2026-09-22T08:00:00Z'),
    dischargeDate: new Date('2026-09-23T18:00:00Z'),
    diagnosis: 'Inguinal hernia (Unilateral)',
    procedure: 'Hernia repair',
    claimAmount: 9500000, // ₹95,000
    status: 'Cleared',
    submittedAt: new Date('2026-09-23T19:00:00Z'),
    validatedAt: new Date('2026-09-23T19:02:00Z'),
    billing: [
      { service: 'Hernia Repair Surgical Fee', code: 'HERN-01', amount: 6500000, serviceDate: new Date('2026-09-22T10:00:00Z'), encounterId: 'ENC-77121' },
      { service: 'Room & Nursing Charges (1 Day)', code: 'ROOM-GEN', amount: 1500000, serviceDate: new Date('2026-09-23T12:00:00Z'), encounterId: 'ENC-77121' },
      { service: 'Post-op Recovery Pharmacy', code: 'PHARM-01', amount: 1500000, serviceDate: new Date('2026-09-23T14:00:00Z'), encounterId: 'ENC-77121' },
    ],
    procedures: [
      { name: 'Hernia repair', code: 'HERN-01', date: new Date('2026-09-22T10:00:00Z'), encounterId: 'ENC-77121' },
    ],
    diagnostics: [
      { testName: 'Pre-op Blood & Coagulation Profile', reportPresent: true, date: new Date('2026-09-22T08:30:00Z'), encounterId: 'ENC-77121' },
    ],
    documents: [
      { kind: 'discharge_summary', fileName: 'Discharge_Summary_PT20982.pdf', storedPath: 'uploads/demo-clean-discharge.pdf', mimeType: 'application/pdf', sizeBytes: 154000 },
    ],
    findings: [],
    assessment: {
      rulesPoints: 0,
      mlPoints: 10,
      anomalyPoints: 8,
      total: 18,
      band: 'low',
      validation: 'passed',
      aiSignalsAvailable: true,
      processingMs: 1210,
      thresholdsSnapshot: { lowMax: 39, reviewMax: 69, rulesCap: 40, mlCap: 35, anomalyCap: 25, minOcrConfidence: 0.7 },
    },
  },

  // 3. Duplicate Billing Review Case
  {
    claimNumber: 'CLM-2026-1043',
    patientId: 'PT-20983',
    patientName: 'Sunita Roy',
    hospitalName: 'Max Super Speciality Hospital',
    insurer: 'Star Health Insurance',
    policyNumber: 'POL-662194',
    encounterId: 'ENC-77122',
    admissionDate: new Date('2026-09-20T10:00:00Z'),
    dischargeDate: new Date('2026-09-23T12:00:00Z'),
    diagnosis: 'Gallstones with acute cholecystitis',
    procedure: 'Cholecystectomy',
    claimAmount: 21000000, // ₹2,10,000
    status: 'Pending Review',
    submittedAt: new Date('2026-09-23T15:00:00Z'),
    validatedAt: new Date('2026-09-23T15:01:00Z'),
    billing: [
      { service: 'Laparoscopic Cholecystectomy Package', code: 'CHOLE-01', amount: 16200000, serviceDate: new Date('2026-09-21T09:00:00Z'), encounterId: 'ENC-77122' },
      { service: 'Laparoscopic Trocar Pack', code: 'PROC-TR01', amount: 1600000, serviceDate: new Date('2026-09-21T11:00:00Z'), encounterId: 'ENC-77122' },
      { service: 'Laparoscopic Trocar Pack', code: 'PROC-TR01', amount: 1600000, serviceDate: new Date('2026-09-21T11:00:00Z'), encounterId: 'ENC-77122' },
      { service: 'Post-op Ward & Nursing Care', code: 'ROOM-IPD', amount: 1600000, serviceDate: new Date('2026-09-23T10:00:00Z'), encounterId: 'ENC-77122' },
    ],
    procedures: [
      { name: 'Cholecystectomy', code: 'CHOLE-01', date: new Date('2026-09-21T09:00:00Z'), encounterId: 'ENC-77122' },
    ],
    diagnostics: [
      { testName: 'USG Whole Abdomen & Pelvis', reportPresent: true, date: new Date('2026-09-20T14:00:00Z'), encounterId: 'ENC-77122' },
    ],
    documents: [
      { kind: 'discharge_summary', fileName: 'Discharge_Summary_PT20983.pdf', storedPath: 'uploads/demo-dup-discharge.pdf', mimeType: 'application/pdf', sizeBytes: 168000 },
    ],
    findings: [
      {
        ruleId: 'R02',
        category: 'Duplicate-like',
        severity: 'high',
        points: 20,
        reason: 'Laparoscopic Trocar Pack billed 2 times on 2026-09-21 for total ₹32,000.',
        evidence: [
          { source: 'billing', label: 'Trocar Pack (Line #1)', value: '₹16,000' },
          { source: 'billing', label: 'Trocar Pack (Line #2)', value: '₹16,000' },
        ],
      },
    ],
    assessment: {
      rulesPoints: 20,
      mlPoints: 16,
      anomalyPoints: 12,
      total: 48,
      band: 'review',
      validation: 'warnings',
      aiSignalsAvailable: true,
      processingMs: 1420,
      thresholdsSnapshot: { lowMax: 39, reviewMax: 69, rulesCap: 40, mlCap: 35, anomalyCap: 25, minOcrConfidence: 0.7 },
    },
  },

  // 4. Documents Requested Case
  {
    claimNumber: 'CLM-2026-1044',
    patientId: 'PT-20984',
    patientName: 'Rahul Mehta',
    hospitalName: 'Manipal Hospital',
    insurer: 'HDFC ERGO Health',
    policyNumber: 'POL-910482',
    encounterId: 'ENC-77123',
    admissionDate: new Date('2026-09-18T11:00:00Z'),
    dischargeDate: new Date('2026-09-22T16:00:00Z'),
    diagnosis: 'Severe osteoarthritis of right knee',
    procedure: 'Total Knee Arthroplasty',
    claimAmount: 32000000, // ₹3,20,000
    status: 'Documents Requested',
    submittedAt: new Date('2026-09-22T18:00:00Z'),
    validatedAt: new Date('2026-09-22T18:03:00Z'),
    billing: [
      { service: 'Total Knee Arthroplasty Implant Package', code: 'TKA-01', amount: 26000000, serviceDate: new Date('2026-09-19T10:00:00Z'), encounterId: 'ENC-77123' },
      { service: 'Physical Rehabilitation & Mobility Care', code: 'REHAB-01', amount: 6000000, serviceDate: new Date('2026-09-21T15:00:00Z'), encounterId: 'ENC-77123' },
    ],
    procedures: [
      { name: 'Total Knee Arthroplasty', code: 'TKA-01', date: new Date('2026-09-19T10:00:00Z'), encounterId: 'ENC-77123' },
    ],
    diagnostics: [
      { testName: 'Digital X-Ray Bilateral Knee Joint', reportPresent: true, date: new Date('2026-09-18T14:00:00Z'), encounterId: 'ENC-77123' },
    ],
    documents: [
      { kind: 'discharge_summary', fileName: 'Discharge_Summary_PT20984.pdf', storedPath: 'uploads/demo-tka-discharge.pdf', mimeType: 'application/pdf', sizeBytes: 198000 },
    ],
    findings: [
      {
        ruleId: 'R06',
        category: 'Missing Docs',
        severity: 'medium',
        points: 10,
        reason: 'Implant serial barcode sticker and prosthesis manufacturer invoice missing.',
        evidence: [
          { source: 'billing', label: 'Implant Package', value: '₹2,60,000' },
          { source: 'document', label: 'Implant Invoice', value: 'Not provided' },
        ],
      },
    ],
    assessment: {
      rulesPoints: 10,
      mlPoints: 20,
      anomalyPoints: 18,
      total: 48,
      band: 'review',
      validation: 'warnings',
      aiSignalsAvailable: true,
      processingMs: 1350,
      thresholdsSnapshot: { lowMax: 39, reviewMax: 69, rulesCap: 40, mlCap: 35, anomalyCap: 25, minOcrConfidence: 0.7 },
    },
  },

  // 5. Approved Auditor Certified Case
  {
    claimNumber: 'CLM-2026-1045',
    patientId: 'PT-20985',
    patientName: 'Ananya Sen',
    hospitalName: 'Apollo Speciality Hospital',
    insurer: 'Care Health Insurance',
    policyNumber: 'POL-771890',
    encounterId: 'ENC-77124',
    admissionDate: new Date('2026-09-17T06:00:00Z'),
    dischargeDate: new Date('2026-09-19T14:00:00Z'),
    diagnosis: 'Single spontaneous delivery at 39 weeks',
    procedure: 'Normal delivery',
    claimAmount: 12500000, // ₹1,25,000
    status: 'Approved',
    submittedAt: new Date('2026-09-19T16:00:00Z'),
    validatedAt: new Date('2026-09-19T16:01:00Z'),
    billing: [
      { service: 'Normal Spontaneous Delivery Package', code: 'DEL-01', amount: 8500000, serviceDate: new Date('2026-09-17T11:00:00Z'), encounterId: 'ENC-77124' },
      { service: 'Neonatal Nursery Care & Pediatrician Fees', code: 'NEO-01', amount: 4000000, serviceDate: new Date('2026-09-18T10:00:00Z'), encounterId: 'ENC-77124' },
    ],
    procedures: [
      { name: 'Normal delivery', code: 'DEL-01', date: new Date('2026-09-17T11:00:00Z'), encounterId: 'ENC-77124' },
    ],
    diagnostics: [
      { testName: 'Maternal & Fetal Clinical Profile', reportPresent: true, date: new Date('2026-09-17T07:00:00Z'), encounterId: 'ENC-77124' },
    ],
    documents: [
      { kind: 'discharge_summary', fileName: 'Discharge_Summary_PT20985.pdf', storedPath: 'uploads/demo-delivery.pdf', mimeType: 'application/pdf', sizeBytes: 165000 },
    ],
    findings: [],
    assessment: {
      rulesPoints: 0,
      mlPoints: 4,
      anomalyPoints: 4,
      total: 8,
      band: 'low',
      validation: 'passed',
      aiSignalsAvailable: true,
      processingMs: 1100,
      thresholdsSnapshot: { lowMax: 39, reviewMax: 69, rulesCap: 40, mlCap: 35, anomalyCap: 25, minOcrConfidence: 0.7 },
    },
  },

  // 6. Review Required: PTCA Angioplasty Consumables
  {
    claimNumber: 'CLM-2026-1046',
    patientId: 'PT-20986',
    patientName: 'Vikram Malhotra',
    hospitalName: 'Medanta The Medicity',
    insurer: 'ICICI Lombard Health',
    policyNumber: 'POL-552918',
    encounterId: 'ENC-77125',
    admissionDate: new Date('2026-09-15T08:00:00Z'),
    dischargeDate: new Date('2026-09-18T12:00:00Z'),
    diagnosis: 'Unstable angina with coronary artery disease',
    procedure: 'Coronary Angioplasty (PTCA)',
    claimAmount: 28500000, // ₹2,85,000
    status: 'Pending Review',
    submittedAt: new Date('2026-09-18T14:00:00Z'),
    validatedAt: new Date('2026-09-18T14:02:00Z'),
    billing: [
      { service: 'Percutaneous Coronary Intervention', code: 'PTCA-01', amount: 21000000, serviceDate: new Date('2026-09-16T11:00:00Z'), encounterId: 'ENC-77125' },
      { service: 'Drug Eluting Stent (DES) Tariff Cap', code: 'STENT-01', amount: 4500000, serviceDate: new Date('2026-09-16T11:00:00Z'), encounterId: 'ENC-77125' },
      { service: 'Coronary Care Unit (CCU 2 Days)', code: 'ICU-CCU', amount: 3000000, serviceDate: new Date('2026-09-17T18:00:00Z'), encounterId: 'ENC-77125' },
    ],
    procedures: [
      { name: 'Coronary Angioplasty (PTCA)', code: 'PTCA-01', date: new Date('2026-09-16T11:00:00Z'), encounterId: 'ENC-77125' },
    ],
    diagnostics: [
      { testName: 'Coronary Angiography (CAG)', reportPresent: true, date: new Date('2026-09-15T14:00:00Z'), encounterId: 'ENC-77125' },
    ],
    documents: [
      { kind: 'discharge_summary', fileName: 'Discharge_Summary_PT20986.pdf', storedPath: 'uploads/demo-ptca.pdf', mimeType: 'application/pdf', sizeBytes: 210000 },
    ],
    findings: [
      {
        ruleId: 'R03',
        category: 'Unusual Amount',
        severity: 'medium',
        points: 15,
        reason: 'Drug eluting stent billing requires verification against NPPA ceiling price.',
        evidence: [
          { source: 'billing', label: 'DES Stent Charge', value: '₹45,000' },
          { source: 'system', label: 'NPPA Statutory Cap', value: '₹38,200' },
        ],
      },
    ],
    assessment: {
      rulesPoints: 15,
      mlPoints: 30,
      anomalyPoints: 23,
      total: 68,
      band: 'review',
      validation: 'warnings',
      aiSignalsAvailable: true,
      processingMs: 1620,
      thresholdsSnapshot: { lowMax: 39, reviewMax: 69, rulesCap: 40, mlCap: 35, anomalyCap: 25, minOcrConfidence: 0.7 },
    },
  },

  // 7. Review Required: Cesarean Section OT Consumable Surcharge
  {
    claimNumber: 'CLM-2026-1047',
    patientId: 'PT-20987',
    patientName: 'Kavita Joshi',
    hospitalName: 'Sir Ganga Ram Hospital',
    insurer: 'Bajaj Allianz General',
    policyNumber: 'POL-118274',
    encounterId: 'ENC-77126',
    admissionDate: new Date('2026-09-14T09:00:00Z'),
    dischargeDate: new Date('2026-09-17T15:00:00Z'),
    diagnosis: 'Previous LSCS in labor with cephalopelvic disproportion',
    procedure: 'Cesarean delivery',
    claimAmount: 16800000, // ₹1,68,000
    status: 'Pending Review',
    submittedAt: new Date('2026-09-17T17:00:00Z'),
    validatedAt: new Date('2026-09-17T17:03:00Z'),
    billing: [
      { service: 'Lower Segment Cesarean Section Package', code: 'LSCS-01', amount: 12500000, serviceDate: new Date('2026-09-14T14:00:00Z'), encounterId: 'ENC-77126' },
      { service: 'Emergency OT Surcharge & Anesthesia', code: 'SURG-OT', amount: 4300000, serviceDate: new Date('2026-09-14T14:00:00Z'), encounterId: 'ENC-77126' },
    ],
    procedures: [
      { name: 'Cesarean delivery', code: 'LSCS-01', date: new Date('2026-09-14T14:00:00Z'), encounterId: 'ENC-77126' },
    ],
    diagnostics: [
      { testName: 'Obstetric Ultrasound Doppler', reportPresent: true, date: new Date('2026-09-14T10:00:00Z'), encounterId: 'ENC-77126' },
    ],
    documents: [
      { kind: 'discharge_summary', fileName: 'Discharge_Summary_PT20987.pdf', storedPath: 'uploads/demo-csection.pdf', mimeType: 'application/pdf', sizeBytes: 184000 },
    ],
    findings: [
      {
        ruleId: 'R03',
        category: 'Unusual Amount',
        severity: 'medium',
        points: 15,
        reason: 'Emergency OT surcharge exceeds agreed insurer tariff schedule package by 14%.',
        evidence: [
          { source: 'billing', label: 'Emergency OT', value: '₹43,000' },
          { source: 'system', label: 'Package Schedule Limit', value: '₹35,000' },
        ],
      },
    ],
    assessment: {
      rulesPoints: 15,
      mlPoints: 24,
      anomalyPoints: 16,
      total: 55,
      band: 'review',
      validation: 'warnings',
      aiSignalsAvailable: true,
      processingMs: 1480,
      thresholdsSnapshot: { lowMax: 39, reviewMax: 69, rulesCap: 40, mlCap: 35, anomalyCap: 25, minOcrConfidence: 0.7 },
    },
  },

  // 8. Review Required: Arthroscopic ACL Reconstruction
  {
    claimNumber: 'CLM-2026-1048',
    patientId: 'PT-20988',
    patientName: 'Devansh Verma',
    hospitalName: 'Kokilaben Hospital',
    insurer: 'Niva Bupa Health',
    policyNumber: 'POL-441829',
    encounterId: 'ENC-77127',
    admissionDate: new Date('2026-09-12T10:00:00Z'),
    dischargeDate: new Date('2026-09-14T16:00:00Z'),
    diagnosis: 'Complete tear of anterior cruciate ligament of knee',
    procedure: 'Arthroscopic ACL Reconstruction',
    claimAmount: 17500000, // ₹1,75,000
    status: 'Pending Review',
    submittedAt: new Date('2026-09-14T18:00:00Z'),
    validatedAt: new Date('2026-09-14T18:02:00Z'),
    billing: [
      { service: 'Arthroscopic ACL Reconstruction Package', code: 'ACL-01', amount: 13500000, serviceDate: new Date('2026-09-13T10:00:00Z'), encounterId: 'ENC-77127' },
      { service: 'Bioabsorbable Interference Screws', code: 'IMP-BIO01', amount: 4000000, serviceDate: new Date('2026-09-13T10:00:00Z'), encounterId: 'ENC-77127' },
    ],
    procedures: [
      { name: 'Arthroscopic ACL Reconstruction', code: 'ACL-01', date: new Date('2026-09-13T10:00:00Z'), encounterId: 'ENC-77127' },
    ],
    diagnostics: [
      { testName: 'MRI Left Knee Joint', reportPresent: true, date: new Date('2026-09-12T14:00:00Z'), encounterId: 'ENC-77127' },
    ],
    documents: [
      { kind: 'discharge_summary', fileName: 'Discharge_Summary_PT20988.pdf', storedPath: 'uploads/demo-acl.pdf', mimeType: 'application/pdf', sizeBytes: 195000 },
    ],
    findings: [
      {
        ruleId: 'R04',
        category: 'Data Mismatch',
        severity: 'medium',
        points: 10,
        reason: 'Implant screw pricing requires confirmation against hospital procurement invoice.',
        evidence: [
          { source: 'billing', label: 'Interference Screws', value: '₹40,000' },
          { source: 'system', label: 'Benchmark Schedule', value: '₹30,000 - ₹35,000' },
        ],
      },
    ],
    assessment: {
      rulesPoints: 10,
      mlPoints: 24,
      anomalyPoints: 18,
      total: 52,
      band: 'review',
      validation: 'warnings',
      aiSignalsAvailable: true,
      processingMs: 1540,
      thresholdsSnapshot: { lowMax: 39, reviewMax: 69, rulesCap: 40, mlCap: 35, anomalyCap: 25, minOcrConfidence: 0.7 },
    },
  },
];

async function seed() {
  const isReset = process.argv.includes('--reset');
  console.log(`🌱 Seeding CareSure MongoDB database ${isReset ? '(Full Reset Mode)' : ''}...`);

  await connectDB();

  // Always replace or upsert the 8 benchmark cases
  if (isReset) {
    await Claim.deleteMany();
    await User.deleteMany();
    await RefreshToken.deleteMany();
    await Setting.deleteMany();
    await ExpectedRange.deleteMany();
    await AuditLog.deleteMany();
    await EvaluationRun.deleteMany();
    console.log('🧹 Existing MongoDB collections cleared.');
  }

  // 1. Seed Demo Users
  const passwordHash = await bcrypt.hash('CareSureDemo2026!', 10);

  const reviewerUser = await User.findOneAndUpdate(
    { email: 'reviewer@caresure.demo' },
    {
      email: 'reviewer@caresure.demo',
      name: 'Priya Reviewer',
      role: 'reviewer',
      team: 'Claims Team',
      passwordHash,
    },
    { upsert: true, returnDocument: 'after' }
  );

  const adminUser = await User.findOneAndUpdate(
    { email: 'admin@caresure.demo' },
    {
      email: 'admin@caresure.demo',
      name: 'Rahul Claims Lead',
      role: 'admin',
      team: 'Revenue Assurance',
      passwordHash,
    },
    { upsert: true, returnDocument: 'after' }
  );

  console.log(`👤 Users seeded: ${reviewerUser.email} (reviewer), ${adminUser.email} (admin)`);

  // 2. Seed System Settings & Validation Rules
  await Setting.findOneAndUpdate(
    { key: 'scoring_thresholds' },
    {
      key: 'scoring_thresholds',
      value: {
        lowMax: 39,
        reviewMax: 69,
        rulesCap: 40,
        mlCap: 35,
        anomalyCap: 25,
        minOcrConfidence: 0.7,
      },
    },
    { upsert: true }
  );

  // 3. Seed Procedure Benchmark Expected Ranges
  const benchmarks = [
    { procedureKey: 'appendectomy', minAmount: 15000000, maxAmount: 22000000 },
    { procedureKey: 'cholecystectomy', minAmount: 18000000, maxAmount: 28000000 },
    { procedureKey: 'hernia repair', minAmount: 8000000, maxAmount: 14000000 },
    { procedureKey: 'normal delivery', minAmount: 5000000, maxAmount: 9000000 },
    { procedureKey: 'cesarean delivery', minAmount: 9000000, maxAmount: 16000000 },
    { procedureKey: 'knee replacement', minAmount: 22000000, maxAmount: 35000000 },
    { procedureKey: 'coronary angioplasty (ptca)', minAmount: 20000000, maxAmount: 32000000 },
    { procedureKey: 'arthroscopic acl reconstruction', minAmount: 12000000, maxAmount: 20000000 },
  ];

  for (const b of benchmarks) {
    await ExpectedRange.findOneAndUpdate(
      { procedureKey: b.procedureKey },
      b,
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log(`📊 ${benchmarks.length} procedure pricing benchmarks seeded.`);

  // 4. Seed Exactly the 8 Unique Benchmark Claims
  // Clear any leftover claims so DB has exactly the 8 unique cases
  await Claim.deleteMany();
  for (const c of BENCHMARK_8_CLAIMS) {
    const claimDoc: any = { ...c };
    if (c.status === 'Approved') {
      claimDoc.decisions = [
        {
          reviewerId: reviewerUser._id,
          actorEmail: reviewerUser.email,
          action: 'approve',
          note: 'All clinical documentation and neonatal packages verified clean. Claim approved by medical auditor.',
          createdAt: new Date('2026-09-20T10:00:00Z'),
        },
      ];
    }
    await Claim.create(claimDoc);
  }

  console.log(`⭐ 8 Unique Benchmark Claims seeded in MongoDB successfully!`);
  BENCHMARK_8_CLAIMS.forEach((c) => {
    console.log(`   ${c.claimNumber} | ${c.patientName} (${c.patientId}) | ${c.procedure} | ${c.status} (${c.assessment.total}/100)`);
  });

  await disconnectDB();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
