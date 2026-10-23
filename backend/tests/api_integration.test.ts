import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Server } from 'http';

let server: Server;
let baseUrl: string;
let accessToken: string;
let heroClaimId: string;

test.before(async () => {
  await connectDB('memory');
  const { Claim } = await import('../src/models/Claim.js');
  const { User } = await import('../src/models/User.js');
  const bcrypt = (await import('bcryptjs')).default;

  await Promise.all([Claim.deleteMany(), User.deleteMany()]);

  const passwordHash = await bcrypt.hash('CareSureDemo2026!', 10);
  await User.create({
    email: 'reviewer@caresure.demo',
    name: 'Priya Reviewer',
    role: 'reviewer',
    team: 'Claims Team',
    passwordHash,
  });

  const hero = await Claim.create({
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
    claimAmount: 24580000,
    status: 'Pending Review',
    submittedAt: new Date('2026-09-28T16:30:00Z'),
    validatedAt: new Date('2026-09-28T16:32:00Z'),
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
    },
  });

  heroClaimId = hero._id.toString();

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address() as any;
      baseUrl = `http://localhost:${address.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDB();
});

test('Integration - GET /health returns 200 OK', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const json: any = await res.json();
  assert.equal(json.status, 'ok');
});

test('Integration - GET /ready returns 200 OK with connected database', async () => {
  const res = await fetch(`${baseUrl}/ready`);
  assert.equal(res.status, 200);
  const json: any = await res.json();
  assert.equal(json.status, 'ready');
  assert.match(json.database, /MongoDB/i);
});

test('Integration - POST /api/v1/auth/login authenticates demo reviewer and issues tokens', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'reviewer@caresure.demo',
      password: 'CareSureDemo2026!',
    }),
  });

  assert.equal(res.status, 200);
  const json: any = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.data.accessToken);
  assert.equal(json.data.user.email, 'reviewer@caresure.demo');
  assert.equal(json.data.user.role, 'reviewer');

  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie);
  assert.match(setCookie, /refreshToken=/);
  assert.match(setCookie, /HttpOnly/i);

  accessToken = json.data.accessToken;
});

test('Integration - GET /api/v1/auth/me returns authenticated reviewer profile', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  assert.equal(res.status, 200);
  const json: any = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.email, 'reviewer@caresure.demo');
});

test('Integration - GET /api/v1/dashboard/stats returns real aggregated KPIs and insights', async () => {
  const res = await fetch(`${baseUrl}/api/v1/dashboard/stats`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  assert.equal(res.status, 200);
  const json: any = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.data.kpis.totalClaims.value >= 1);
  assert.ok(json.data.recentClaims.length > 0);
});

test('Integration - GET /api/v1/review-queue/queue contains flagged Hero Claim CLM-2026-1041', async () => {
  const res = await fetch(`${baseUrl}/api/v1/review-queue/queue`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  assert.equal(res.status, 200);
  const json: any = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.data.items.length > 0);

  const heroItem = json.data.items.find((i: any) => i.claimNumber === 'CLM-2026-1041');
  assert.ok(heroItem, 'Hero claim should be in review queue');
  assert.equal(heroItem.riskScore, 72);
  assert.equal(heroItem.band, 'high');
  assert.match(heroItem.topReason, /CT Scan/);
});

test('Integration - GET /api/v1/claims/:id returns full findings, evidence breakdown, and timeline', async () => {
  const res = await fetch(`${baseUrl}/api/v1/claims/${heroClaimId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  assert.equal(res.status, 200);
  const json: any = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.claimNumber, 'CLM-2026-1041');
  assert.equal(json.data.assessment.total, 72);
  assert.equal(json.data.assessment.rulesPoints, 25);
  assert.equal(json.data.assessment.mlPoints, 28);
  assert.equal(json.data.assessment.anomalyPoints, 19);
  assert.ok(json.data.findings.length > 0);
  assert.equal(json.data.findings[0].ruleId, 'R01');
  assert.ok(Array.isArray(json.data.findings[0].evidence));
});

test('Integration - POST /api/v1/claims/:id/decision records reviewer decision with audit trail', async () => {
  const res = await fetch(`${baseUrl}/api/v1/claims/${heroClaimId}/decision`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'request_docs',
      note: 'CT scan report missing. Requested from radiology department via email.',
    }),
  });

  assert.equal(res.status, 200);
  const json: any = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.status, 'Documents Requested');
});
