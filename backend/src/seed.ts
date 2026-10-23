import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from './config/db.js';
import { User } from './models/User.js';
import { Claim } from './models/Claim.js';
import { Setting } from './models/Setting.js';
import { ExpectedRange } from './models/ExpectedRange.js';
import { RefreshToken } from './models/RefreshToken.js';
import { AuditLog } from './models/AuditLog.js';
import { EvaluationRun } from './models/EvaluationRun.js';

async function seed() {
  const isReset = process.argv.includes('--reset');
  console.log(`🌱 Seeding CareSure MongoDB database ${isReset ? '(Full Reset Mode)' : ''}...`);

  await connectDB();

  if (isReset) {
    await Promise.all([
      Claim.deleteMany(),
      User.deleteMany(),
      RefreshToken.deleteMany(),
      Setting.deleteMany(),
      ExpectedRange.deleteMany(),
      AuditLog.deleteMany(),
      EvaluationRun.deleteMany(),
    ]);
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
    { key: 'thresholds' },
    {
      key: 'thresholds',
      value: {
        lowMax: 39,
        reviewMax: 69,
        rulesCap: 40,
        mlCap: 35,
        anomalyCap: 25,
        minOcrConfidence: 0.7,
      },
      updatedBy: adminUser._id.toString(),
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Setting.findOneAndUpdate(
    { key: 'validation_rules' },
    {
      key: 'validation_rules',
      value: {
        R01: { enabled: true, points: 25, name: 'Missing diagnostic report' },
        R02: { enabled: true, points: 20, name: 'Duplicate billing' },
        R03: { enabled: true, points: 15, name: 'Amount outside expected range', tolerance: 10 },
        R04: { enabled: true, points: 10, name: 'Billing gap (revenue leakage)' },
        R05: { enabled: true, points: 15, name: 'Date inconsistency' },
        R06: { enabled: true, points: 10, name: 'Missing mandatory document' },
      },
      updatedBy: adminUser._id.toString(),
    },
    { upsert: true, returnDocument: 'after' }
  );

  console.log('⚙️ Default settings & thresholds seeded.');

  // 3. Seed Procedure Benchmark Expected Ranges
  const benchmarks = [
    { procedureKey: 'appendectomy', minAmount: 15000000, maxAmount: 22000000 },
    { procedureKey: 'cholecystectomy', minAmount: 18000000, maxAmount: 28000000 },
    { procedureKey: 'hernia repair', minAmount: 8000000, maxAmount: 14000000 },
    { procedureKey: 'normal delivery', minAmount: 5000000, maxAmount: 9000000 },
    { procedureKey: 'cesarean delivery', minAmount: 9000000, maxAmount: 16000000 },
    { procedureKey: 'knee replacement', minAmount: 22000000, maxAmount: 35000000 },
  ];

  for (const b of benchmarks) {
    await ExpectedRange.findOneAndUpdate(
      { procedureKey: b.procedureKey },
      b,
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log(`📊 ${benchmarks.length} procedure pricing benchmarks seeded.`);

  // 4. Seed Hero Case: CLM-2026-1041 (Appendectomy, Billed CT Scan ₹18,500 without Diagnostic Report)
  const heroClaim = await Claim.findOneAndUpdate(
    { claimNumber: 'CLM-2026-1041' },
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
      diagnosis: 'Acute appendicitis',
      procedure: 'Appendectomy',
      claimAmount: 24580000, // ₹2,45,800 in paise
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
        // Notice: CT Scan report is absent!
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
        thresholdsSnapshot: {
          lowMax: 39,
          reviewMax: 69,
          rulesCap: 40,
          mlCap: 35,
          anomalyCap: 25,
        },
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  console.log(`⭐ Hero Claim seeded in MongoDB: ${heroClaim.claimNumber} (72/100, High Risk Signals, R01 Missing Diagnostic Report)`);

  // 5. Seed Clean Claim: CLM-2026-1042
  await Claim.findOneAndUpdate(
    { claimNumber: 'CLM-2026-1042' },
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
      diagnosis: 'Inguinal hernia',
      procedure: 'Hernia repair',
      claimAmount: 9500000, // ₹95,000
      status: 'Cleared',
      submittedAt: new Date('2026-09-23T19:00:00Z'),
      validatedAt: new Date('2026-09-23T19:02:00Z'),
      documents: [
        { kind: 'discharge_summary', fileName: 'Discharge_Summary_PT20982.pdf', storedPath: 'uploads/demo-clean-discharge.pdf', mimeType: 'application/pdf', sizeBytes: 154000 },
      ],
      assessment: {
        rulesPoints: 0,
        mlPoints: 10,
        anomalyPoints: 8,
        total: 18,
        band: 'low',
        validation: 'passed',
        aiSignalsAvailable: true,
        processingMs: 1210,
        thresholdsSnapshot: { lowMax: 39, reviewMax: 69 },
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  // 6. Seed Duplicate Billing Claim: CLM-2026-1043
  await Claim.findOneAndUpdate(
    { claimNumber: 'CLM-2026-1043' },
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
      diagnosis: 'Gallstones with cholecystitis',
      procedure: 'Cholecystectomy',
      claimAmount: 21000000, // ₹2,10,000
      status: 'Pending Review',
      submittedAt: new Date('2026-09-23T15:00:00Z'),
      validatedAt: new Date('2026-09-23T15:01:00Z'),
      documents: [
        { kind: 'discharge_summary', fileName: 'Discharge_Summary_PT20983.pdf', storedPath: 'uploads/demo-dup-discharge.pdf', mimeType: 'application/pdf', sizeBytes: 168000 },
      ],
      findings: [
        {
          ruleId: 'R02',
          category: 'Duplicate-like',
          severity: 'high',
          points: 20,
          reason: 'Laparoscopic Trocar Pack billed 2 times on 2026-09-21 for total ₹16,000.',
          evidence: [
            { source: 'billing', label: 'Trocar Pack (Line #1)', value: '₹8,000' },
            { source: 'billing', label: 'Trocar Pack (Line #2)', value: '₹8,000' },
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
        thresholdsSnapshot: { lowMax: 39, reviewMax: 69 },
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  console.log('✅ MongoDB Seed complete: All demo accounts and Hero Claim are ready!');
  await disconnectDB();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
