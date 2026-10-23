import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateR01 } from '../src/services/rules/r01_missingDiagnosticReport.js';
import { evaluateR02 } from '../src/services/rules/r02_duplicateBilling.js';
import { evaluateR03 } from '../src/services/rules/r03_amountOutOfRange.js';
import { evaluateR04 } from '../src/services/rules/r04_billingGap.js';
import { evaluateR05 } from '../src/services/rules/r05_dateInconsistency.js';
import { computeHybridScore, DEFAULT_THRESHOLDS } from '../src/services/scoring.js';
import { safeCompare } from '../src/utils/tokenCompare.js';
import { RuleContext } from '../src/services/rules/types.js';

test('Rule R01 - Fires when CT scan is billed but diagnostic report is missing (Hero Case)', () => {
  const ctx: RuleContext = {
    claim: {
      id: 'c1',
      claimNumber: 'CLM-2026-1041',
      patientId: 'PT-20981',
      encounterId: 'ENC-77120',
      admissionDate: new Date('2026-09-24'),
      dischargeDate: new Date('2026-09-28'),
      procedure: 'Appendectomy',
      diagnosis: 'Acute appendicitis',
      claimAmount: 24580000,
    },
    billing: [
      { id: 'b1', service: 'Appendectomy', amount: 15000000, serviceDate: new Date('2026-09-25') },
      { id: 'b2', service: 'CT Scan Abdomen', amount: 1850000, serviceDate: new Date('2026-09-24') },
    ],
    procedures: [{ id: 'p1', name: 'Appendectomy', date: new Date('2026-09-25') }],
    diagnostics: [
      { id: 'd1', testName: 'Complete Blood Count', reportPresent: true, date: new Date('2026-09-24') },
    ],
    documents: [],
    expectedRanges: [],
  };

  const finding = evaluateR01(ctx);
  assert.ok(finding !== null, 'R01 should fire');
  assert.equal(finding.ruleId, 'R01');
  assert.equal(finding.points, 25);
  assert.equal(finding.severity, 'high');
  assert.match(finding.reason, /CT Scan Abdomen is billed/);
});

test('Rule R01 - Does NOT fire when diagnostic report is present', () => {
  const ctx: RuleContext = {
    claim: {
      id: 'c1',
      claimNumber: 'CLM-2026-1041',
      patientId: 'PT-20981',
      encounterId: 'ENC-77120',
      admissionDate: new Date('2026-09-24'),
      dischargeDate: new Date('2026-09-28'),
      procedure: 'Appendectomy',
      diagnosis: 'Acute appendicitis',
      claimAmount: 24580000,
    },
    billing: [
      { id: 'b2', service: 'CT Scan Abdomen', amount: 1850000, serviceDate: new Date('2026-09-24') },
    ],
    procedures: [],
    diagnostics: [
      { id: 'd1', testName: 'CT Scan Abdomen with Contrast', reportPresent: true, date: new Date('2026-09-24') },
    ],
    documents: [],
    expectedRanges: [],
  };

  const finding = evaluateR01(ctx);
  assert.equal(finding, null, 'R01 should not fire when report is present');
});

test('Rule R02 - Fires on duplicate billing charges on same date', () => {
  const ctx: RuleContext = {
    claim: {
      id: 'c2',
      claimNumber: 'CLM-2026-1043',
      patientId: 'PT-2',
      encounterId: 'ENC-2',
      admissionDate: new Date('2026-09-20'),
      dischargeDate: new Date('2026-09-23'),
      procedure: 'Cholecystectomy',
      diagnosis: 'Gallstones',
      claimAmount: 21000000,
    },
    billing: [
      { id: 'b1', service: 'Trocar Pack', amount: 800000, serviceDate: new Date('2026-09-21') },
      { id: 'b2', service: 'Trocar Pack', amount: 800000, serviceDate: new Date('2026-09-21') },
    ],
    procedures: [],
    diagnostics: [],
    documents: [],
    expectedRanges: [],
  };

  const finding = evaluateR02(ctx);
  assert.ok(finding !== null, 'R02 should fire on duplicate items');
  assert.equal(finding.ruleId, 'R02');
  assert.equal(finding.points, 20);
});

test('Rule R03 - Fires when billed amount exceeds benchmark range plus tolerance', () => {
  const ctx: RuleContext = {
    claim: {
      id: 'c3',
      claimNumber: 'CLM-2026-1044',
      patientId: 'PT-3',
      encounterId: 'ENC-3',
      admissionDate: new Date('2026-09-20'),
      dischargeDate: new Date('2026-09-22'),
      procedure: 'Normal Delivery',
      diagnosis: 'Full term delivery',
      claimAmount: 18000000, // ₹1,80,000 billed vs max benchmark ₹90,000
    },
    billing: [],
    procedures: [],
    diagnostics: [],
    documents: [],
    expectedRanges: [
      { procedureKey: 'normal delivery', minAmount: 5000000, maxAmount: 9000000 },
    ],
    tolerancePercent: 10,
  };

  const finding = evaluateR03(ctx);
  assert.ok(finding !== null, 'R03 should fire on excessive amount');
  assert.equal(finding.ruleId, 'R03');
  assert.equal(finding.points, 15);
});

test('Rule R04 - Fires on billing gap (procedure performed but never billed)', () => {
  const ctx: RuleContext = {
    claim: {
      id: 'c4',
      claimNumber: 'CLM-4',
      patientId: 'PT-4',
      encounterId: 'ENC-4',
      admissionDate: new Date('2026-09-20'),
      dischargeDate: new Date('2026-09-22'),
      procedure: 'Hernia repair',
      diagnosis: 'Hernia',
      claimAmount: 5000000,
    },
    billing: [
      { id: 'b1', service: 'Room Rent', amount: 5000000, serviceDate: new Date('2026-09-20') },
    ],
    procedures: [
      { id: 'p1', name: 'Laparoscopic Hernia Repair', date: new Date('2026-09-20') },
    ],
    diagnostics: [],
    documents: [],
    expectedRanges: [],
  };

  const finding = evaluateR04(ctx);
  assert.ok(finding !== null, 'R04 should fire on unbilled procedure');
  assert.equal(finding.ruleId, 'R04');
  assert.equal(finding.points, 10);
});

test('Rule R05 - Fires when discharge date precedes admission date', () => {
  const ctx: RuleContext = {
    claim: {
      id: 'c5',
      claimNumber: 'CLM-5',
      patientId: 'PT-5',
      encounterId: 'ENC-5',
      admissionDate: new Date('2026-09-25'),
      dischargeDate: new Date('2026-09-20'),
      procedure: 'Appendectomy',
      diagnosis: 'Appendicitis',
      claimAmount: 10000000,
    },
    billing: [],
    procedures: [],
    diagnostics: [],
    documents: [],
    expectedRanges: [],
  };

  const finding = evaluateR05(ctx);
  assert.ok(finding !== null, 'R05 should fire when discharge is before admission');
  assert.equal(finding.ruleId, 'R05');
});

test('Hybrid Scoring - Correctly calculates 25 + 28 + 19 = 72 (Hero Case)', () => {
  const findings: any[] = [
    { ruleId: 'R01', points: 25, severity: 'high' },
  ];

  const aiResult = {
    available: true,
    mlProbability: 0.8,    // 0.8 * 35 = 28
    anomalyScore: 0.76,     // 0.76 * 25 = 19
  };

  const result = computeHybridScore(findings, aiResult, DEFAULT_THRESHOLDS);

  assert.equal(result.rulesPoints, 25);
  assert.equal(result.mlPoints, 28);
  assert.equal(result.anomalyPoints, 19);
  assert.equal(result.total, 72);
  assert.equal(result.band, 'high');
  assert.equal(result.validation, 'failed');
  assert.equal(result.aiSignalsAvailable, true);
});

test('AI Resilience Fallback - Forces at least review band when AI is down', () => {
  const findings: any[] = []; // No rules fired

  const aiResult = {
    available: false,
    mlProbability: 0,
    anomalyScore: 0,
    note: 'AI service unavailable',
  };

  const result = computeHybridScore(findings, aiResult, DEFAULT_THRESHOLDS);

  assert.equal(result.total, 0);
  assert.equal(result.aiSignalsAvailable, false);
  // Uncertainty forces review, cannot be low risk
  assert.equal(result.band, 'review');
  assert.equal(result.validation, 'warnings');
});

test('Security Utility - Timing-safe token comparison', () => {
  const tokenA = 'f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8';
  const tokenB = 'f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8';
  const tokenC = '0000000000000000000000000000000000000000000000000000000000000000';

  assert.equal(safeCompare(tokenA, tokenB), true);
  assert.equal(safeCompare(tokenA, tokenC), false);
  assert.equal(safeCompare(tokenA, 'short'), false);
});
