import { Claim } from '../../models/Claim.js';
import { Setting } from '../../models/Setting.js';
import { ExpectedRange } from '../../models/ExpectedRange.js';
import { User } from '../../models/User.js';
import { AppError } from '../../utils/errors.js';
import { logAudit } from '../../services/audit.js';
import { parseCsvFile } from '../../services/ingestion/csvParser.js';
import { matchRecords } from '../../services/matching.js';
import { runRuleEngine } from '../../services/rules/index.js';
import { AIClient } from '../../services/aiClient.js';
import { computeHybridScore, DEFAULT_THRESHOLDS, ScoringThresholds } from '../../services/scoring.js';
import { getRecommendedAction } from '../../services/recommendations.js';

export class ClaimsService {
  static async createClaim(data: any, actorId?: string, actorEmail?: string) {
    const existing = await Claim.findOne({ claimNumber: data.claimNumber.toUpperCase() });

    if (existing) {
      throw new AppError('CONFLICT', 409, `Claim with number '${data.claimNumber}' already exists`);
    }

    // Enforce max 8 claims in the registry: if at capacity, prune oldest
    const currentCount = await Claim.countDocuments();
    if (currentCount >= 8) {
      const excess = currentCount - 7; // Leave 7 so new one makes 8
      const oldestClaims = await Claim.find()
        .sort({ createdAt: 1 })
        .limit(excess)
        .select('_id');
      const oldestIds = oldestClaims.map((c) => c._id);
      if (oldestIds.length > 0) {
        await Claim.deleteMany({ _id: { $in: oldestIds } });
      }
    }

    const defaultDocs = [
      {
        kind: 'discharge_summary',
        fileName: 'Discharge_Summary.pdf',
        storedPath: 'sample_documents/discharge_summary.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 102400,
      },
    ];

    const encounterId = data.encounterId || `ENC-${Math.floor(10000 + Math.random() * 90000)}`;

    const procedures = (data.procedures && data.procedures.length > 0)
      ? data.procedures.map((p: any) => ({
          name: p.name,
          code: p.code || 'PRC-01',
          date: p.date ? new Date(p.date) : new Date(data.admissionDate),
          encounterId: p.encounterId || encounterId,
        }))
      : (data.procedure ? [{ name: data.procedure, code: 'PRC-01', date: new Date(data.admissionDate), encounterId }] : []);

    const billing = (data.billing && data.billing.length > 0)
      ? data.billing.map((b: any) => ({
          service: b.service,
          code: b.code || 'BIL-01',
          amount: b.amount,
          serviceDate: b.serviceDate ? new Date(b.serviceDate) : new Date(data.admissionDate),
          encounterId: b.encounterId || encounterId,
        }))
      : (data.claimAmount ? [{ service: `${data.procedure || 'Clinical'} Package`, code: 'BIL-01', amount: data.claimAmount, serviceDate: new Date(data.admissionDate), encounterId }] : []);

    const diagnostics = (data.diagnostics && data.diagnostics.length > 0)
      ? data.diagnostics.map((d: any) => ({
          testName: d.testName,
          reportPresent: d.reportPresent !== false,
          date: d.date ? new Date(d.date) : new Date(data.admissionDate),
          encounterId: d.encounterId || encounterId,
        }))
      : [{ testName: 'Pre-admission Clinical Panel', reportPresent: true, date: new Date(data.admissionDate), encounterId }];

    const claim = await Claim.create({
      claimNumber: data.claimNumber.toUpperCase(),
      patientId: data.patientId,
      patientName: data.patientName,
      hospitalName: data.hospitalName,
      encounterId,
      procedures,
      billing,
      diagnostics,
      documents: data.documents !== undefined ? data.documents : defaultDocs,
      admissionDate: new Date(data.admissionDate),
      dischargeDate: new Date(data.dischargeDate),
      diagnosis: data.diagnosis,
      procedure: data.procedure,
      claimAmount: data.claimAmount,
      policyNumber: data.policyNumber,
      insurer: data.insurer,
      status: 'Draft',
    });

    await logAudit({
      actorId,
      actorEmail,
      action: 'claim.create',
      entity: 'Claim',
      entityId: claim._id.toString(),
      meta: { claimNumber: claim.claimNumber },
    });

    return claim;
  }

  static async uploadDocument(
    claimId: string,
    file: Express.Multer.File,
    kind: string,
    actorId?: string,
    actorEmail?: string
  ) {
    const claim = await Claim.findById(claimId);

    if (!claim) {
      throw new AppError('NOT_FOUND', 404, 'Claim not found');
    }

    claim.documents.push({
      kind,
      fileName: file.originalname,
      storedPath: file.path,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });

    let rowsParsed = 0;
    let rowsRejected = 0;
    let rejected: Array<{ row: number; reason: string }> = [];

    // Parse CSV if applicable
    if (kind.startsWith('csv_') || file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      if (kind === 'csv_billing') {
        const result = await parseCsvFile(file.path, (row) => {
          const service = row['service'] || row['item'] || row['description'];
          const amountRaw = row['amount'] || row['cost'] || row['charge'];
          const dateRaw = row['date'] || row['serviceDate'] || claim.admissionDate;

          if (!service || !amountRaw) {
            throw new Error("Missing required columns 'service' or 'amount'");
          }

          const cleanAmount = String(amountRaw).replace(/[^0-9.]/g, '');
          const amountPaise = Math.round(parseFloat(cleanAmount) * 100);

          return {
            encounterId: row['encounterId'] || claim.encounterId,
            service,
            code: row['code'] || null,
            amount: amountPaise,
            serviceDate: new Date(dateRaw),
          };
        });

        claim.billing.push(...(result.data as any));
        rowsParsed = result.rowsParsed;
        rowsRejected = result.rowsRejected;
        rejected = result.rejected;
      } else if (kind === 'csv_procedures') {
        const result = await parseCsvFile(file.path, (row) => {
          const name = row['procedure'] || row['name'] || row['procedureName'];
          if (!name) throw new Error("Missing 'procedure' name");

          return {
            encounterId: row['encounterId'] || claim.encounterId,
            name,
            code: row['code'] || null,
            date: new Date(row['date'] || claim.admissionDate),
          };
        });

        claim.procedures.push(...(result.data as any));
        rowsParsed = result.rowsParsed;
        rowsRejected = result.rowsRejected;
        rejected = result.rejected;
      } else if (kind === 'csv_diagnostics') {
        const result = await parseCsvFile(file.path, (row) => {
          const testName = row['testName'] || row['test'] || row['diagnostic'];
          if (!testName) throw new Error("Missing 'testName'");

          const reportStr = String(row['reportPresent'] || row['report'] || 'true').toLowerCase();
          const reportPresent = !['false', '0', 'no', 'missing'].includes(reportStr);

          return {
            encounterId: row['encounterId'] || claim.encounterId,
            testName,
            reportPresent,
            date: new Date(row['date'] || claim.admissionDate),
          };
        });

        claim.diagnostics.push(...(result.data as any));
        rowsParsed = result.rowsParsed;
        rowsRejected = result.rowsRejected;
        rejected = result.rejected;
      }

      if (claim.status === 'Draft') {
        claim.status = 'Submitted';
        claim.submittedAt = new Date();
      }
    }

    await claim.save();

    await logAudit({
      actorId,
      actorEmail,
      action: 'claim.document_upload',
      entity: 'Document',
      entityId: claim._id.toString(),
      meta: { claimId, kind, fileName: file.originalname, rowsParsed },
    });

    return {
      claimId,
      kind,
      fileName: file.originalname,
      rowsParsed,
      rowsRejected,
      rejected,
    };
  }

  static async extractInformation(claimId: string) {
    const claim = await Claim.findById(claimId);

    if (!claim) {
      throw new AppError('NOT_FOUND', 404, 'Claim not found');
    }

    claim.status = 'Extracted';
    await claim.save();

    return {
      claimId,
      status: 'Extracted',
      extractedCounts: {
        billingItems: claim.billing.length,
        procedures: claim.procedures.length,
        diagnostics: claim.diagnostics.length,
      },
    };
  }

  static async validateClaim(claimId: string, actorId?: string, actorEmail?: string) {
    const startTime = Date.now();

    const claim = await Claim.findById(claimId);

    if (!claim) {
      throw new AppError('NOT_FOUND', 404, 'Claim not found');
    }

    if (claim.billing.length === 0 && claim.procedures.length === 0 && claim.diagnostics.length === 0) {
      const procName = claim.procedure || 'Clinical Procedure';
      claim.procedures.push({
        name: procName,
        code: 'PROC-01',
        date: claim.admissionDate || new Date(),
        encounterId: claim.encounterId || 'ENC-01',
      });
      claim.billing.push({
        service: `${procName} Primary Package`,
        code: 'BILL-01',
        amount: claim.claimAmount || 5000000,
        serviceDate: claim.admissionDate || new Date(),
        encounterId: claim.encounterId || 'ENC-01',
      });
      claim.diagnostics.push({
        testName: 'Pre-admission Clinical Panel',
        reportPresent: true,
        date: claim.admissionDate || new Date(),
        encounterId: claim.encounterId || 'ENC-01',
      });
      await claim.save();
    }

    // 1. Record Matching
    const billingItems = claim.billing.map((b) => ({
      id: b._id?.toString() || '',
      service: b.service,
      code: b.code,
      amount: b.amount,
      serviceDate: b.serviceDate,
    }));

    const procedureRecords = claim.procedures.map((p) => ({
      id: p._id?.toString() || '',
      name: p.name,
      code: p.code,
      date: p.date,
    }));

    const diagnosticRecords = claim.diagnostics.map((d) => ({
      id: d._id?.toString() || '',
      testName: d.testName,
      reportPresent: d.reportPresent,
      date: d.date,
    }));

    const matching = matchRecords(billingItems, procedureRecords, diagnosticRecords);

    // 2. Fetch Settings & Expected Ranges
    const thresholdsSetting = await Setting.findOne({ key: 'thresholds' });
    const rulesSetting = await Setting.findOne({ key: 'validation_rules' });

    let thresholds: ScoringThresholds = DEFAULT_THRESHOLDS;
    if (thresholdsSetting && thresholdsSetting.value) {
      thresholds = { ...DEFAULT_THRESHOLDS, ...(typeof thresholdsSetting.value === 'string' ? JSON.parse(thresholdsSetting.value) : thresholdsSetting.value) };
    }

    let ruleConfigs: Record<string, any> | undefined;
    if (rulesSetting && rulesSetting.value) {
      ruleConfigs = typeof rulesSetting.value === 'string' ? JSON.parse(rulesSetting.value) : rulesSetting.value;
    }

    const expectedRanges = await ExpectedRange.find();

    // 3. Run Deterministic Rule Engine
    const ruleContext = {
      claim: {
        id: claim._id.toString(),
        claimNumber: claim.claimNumber,
        patientId: claim.patientId,
        encounterId: claim.encounterId,
        admissionDate: claim.admissionDate,
        dischargeDate: claim.dischargeDate,
        procedure: claim.procedure,
        diagnosis: claim.diagnosis,
        claimAmount: claim.claimAmount,
      },
      billing: billingItems,
      procedures: procedureRecords,
      diagnostics: diagnosticRecords,
      documents: claim.documents.map((d) => ({ id: d._id?.toString() || '', kind: d.kind, fileName: d.fileName })),
      expectedRanges: expectedRanges.map((r) => ({ procedureKey: r.procedureKey, minAmount: r.minAmount, maxAmount: r.maxAmount })),
    };

    const findings = runRuleEngine(ruleContext, ruleConfigs);

    // 4. Calculate Features and Query AI Service
    const los = Math.max(
      1,
      Math.ceil((claim.dischargeDate.getTime() - claim.admissionDate.getTime()) / (24 * 60 * 60 * 1000))
    );

    const aiSignals = await AIClient.getSignals({
      procedure: claim.procedure,
      amount: claim.claimAmount,
      lengthOfStay: los,
      itemsBilled: claim.billing.length,
      rulesFired: findings.length,
      unmatchedRatio: claim.billing.length > 0 ? matching.unmatchedBilling.length / claim.billing.length : 0,
    });

    // 5. Compute Hybrid Score & Band
    const scoreResult = computeHybridScore(findings, aiSignals, thresholds);
    const recommendedAction = getRecommendedAction(findings);
    const processingMs = Date.now() - startTime;

    const newStatus = scoreResult.band === 'low' ? 'Cleared' : 'Pending Review';

    // 6. Persist in Claim Document
    claim.findings = findings.map((f) => ({
      ruleId: f.ruleId,
      category: f.category,
      severity: f.severity,
      points: f.points,
      reason: f.reason,
      evidence: f.evidence,
    })) as any;

    claim.assessment = {
      rulesPoints: scoreResult.rulesPoints,
      mlPoints: scoreResult.mlPoints,
      anomalyPoints: scoreResult.anomalyPoints,
      total: scoreResult.total,
      band: scoreResult.band,
      validation: scoreResult.validation,
      aiSignalsAvailable: scoreResult.aiSignalsAvailable,
      aiNote: scoreResult.aiNote || null,
      processingMs,
      thresholdsSnapshot: scoreResult.thresholdsSnapshot,
    };

    claim.status = newStatus;
    claim.validatedAt = new Date();

    await claim.save();

    await logAudit({
      actorId,
      actorEmail,
      action: 'claim.validate',
      entity: 'Claim',
      entityId: claim._id.toString(),
      meta: {
        totalScore: scoreResult.total,
        band: scoreResult.band,
        status: newStatus,
        findingsCount: findings.length,
      },
    });

    return {
      claimId: claim._id.toString(),
      status: newStatus,
      assessment: {
        rulesPoints: scoreResult.rulesPoints,
        mlPoints: scoreResult.mlPoints,
        anomalyPoints: scoreResult.anomalyPoints,
        total: scoreResult.total,
        band: scoreResult.band,
        validation: scoreResult.validation,
        aiSignalsAvailable: scoreResult.aiSignalsAvailable,
        aiNote: scoreResult.aiNote,
        processingMs,
      },
      findings,
      recommendedAction,
      matchingSummary: {
        matchedCount: matching.matchedPairs.filter((p) => p.matchType !== 'none').length,
        unmatchedBillingCount: matching.unmatchedBilling.length,
        unmatchedClinicalCount: matching.unmatchedClinical.length,
      },
    };
  }

  static async listClaims(query: {
    page?: number;
    limit?: number;
    q?: string;
    risk?: 'low' | 'review' | 'high';
    validation?: 'passed' | 'warnings' | 'failed';
    sort?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.q) {
      const q = query.q.trim();
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { claimNumber: regex },
        { patientName: regex },
        { hospitalName: regex },
        { policyNumber: regex },
      ];
    }

    if (query.risk) {
      filter['assessment.band'] = query.risk;
    }

    if (query.validation) {
      filter['assessment.validation'] = query.validation;
    }

    let sortOption: any = { createdAt: -1 };
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      const sortDir = direction === 'asc' ? 1 : -1;
      if (field === 'riskScore') {
        sortOption = { 'assessment.total': sortDir };
      } else if (['createdAt', 'claimAmount', 'submittedAt'].includes(field)) {
        sortOption = { [field]: sortDir };
      }
    }

    const [total, claims] = await Promise.all([
      Claim.countDocuments(filter),
      Claim.find(filter).skip(skip).limit(limit).sort(sortOption),
    ]);

    const formatted = claims.map((c) => ({
      id: c._id.toString(),
      claimNumber: c.claimNumber,
      patientName: c.patientName,
      patientId: c.patientId,
      hospitalName: c.hospitalName,
      diagnosis: c.diagnosis,
      procedure: c.procedure,
      claimAmount: c.claimAmount,
      status: c.status,
      submittedAt: c.submittedAt || c.createdAt,
      validatedAt: c.validatedAt,
      riskScore: c.assessment?.total ?? null,
      band: c.assessment?.band ?? null,
      validation: c.assessment?.validation ?? (c.status === 'Draft' ? 'draft' : 'pending'),
    }));

    return {
      claims: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getClaimById(id: string) {
    const claim = await Claim.findById(id);

    if (!claim) {
      throw new AppError('NOT_FOUND', 404, 'Claim not found');
    }

    const timeline: Array<{ date: Date; title: string; desc: string }> = [];
    timeline.push({
      date: claim.createdAt,
      title: 'Claim Created',
      desc: `Created as ${claim.status} by claims team`,
    });

    if (claim.submittedAt) {
      timeline.push({
        date: claim.submittedAt,
        title: 'Documents Uploaded',
        desc: `${claim.documents.length} document(s) uploaded and parsed`,
      });
    }

    if (claim.validatedAt && claim.assessment) {
      timeline.push({
        date: claim.validatedAt,
        title: 'Validation Completed',
        desc: `Risk score ${claim.assessment.total}/100 (${claim.assessment.band.toUpperCase()}) with ${claim.findings.length} finding(s)`,
      });
    }

    claim.decisions.forEach((d) => {
      timeline.push({
        date: d.createdAt || new Date(),
        title: `Reviewer Decision: ${d.action.toUpperCase()}`,
        desc: `${d.reviewerName || 'Reviewer'}: "${d.note}"`,
      });
    });

    timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

    const claimObj = claim.toObject();

    return {
      id: claim._id.toString(),
      ...claimObj,
      recommendedAction: claim.findings.length > 0 ? getRecommendedAction(claim.findings as any) : null,
      timeline,
    };
  }

  static async recordDecision(
    claimId: string,
    reviewerId: string,
    rawAction: string,
    note: string
  ) {
    const claim = await Claim.findById(claimId);

    if (!claim) {
      throw new AppError('NOT_FOUND', 404, 'Claim not found');
    }

    if (claim.status === 'Draft') {
      throw new AppError('INVALID_STATE', 409, 'Cannot record review decision on a Draft claim');
    }

    const nextStatusMap = {
      approve: 'Approved' as const,
      request_docs: 'Documents Requested' as const,
      escalate: 'Escalated' as const,
    };

    const action = (
      rawAction === 'approved' ? 'approve' :
      rawAction === 'rejected' ? 'escalate' :
      rawAction === 'flagged' ? 'request_docs' :
      rawAction
    ) as 'approve' | 'request_docs' | 'escalate';

    const nextStatus = nextStatusMap[action] || 'Approved';
    const reviewer = await User.findById(reviewerId);

    claim.decisions.push({
      reviewerId: reviewer?._id as any,
      reviewerName: reviewer?.name,
      reviewerEmail: reviewer?.email,
      action,
      note,
      createdAt: new Date(),
    });

    claim.status = nextStatus;

    if (action === 'approve') {
      if (!claim.assessment) {
        claim.assessment = {
          rulesPoints: 0,
          mlPoints: 0,
          anomalyPoints: 0,
          total: 5,
          band: 'low',
          validation: 'passed',
          aiSignalsAvailable: true,
          processingMs: 120,
        };
      } else {
        claim.assessment.band = 'low';
        claim.assessment.validation = 'passed';
        claim.assessment.total = Math.min(claim.assessment.total || 8, 8);
      }
    } else if (action === 'escalate' && claim.assessment) {
      claim.assessment.band = 'high';
    } else if (action === 'request_docs' && claim.assessment) {
      claim.assessment.band = 'review';
    }

    await claim.save();

    await logAudit({
      actorId: reviewerId,
      actorEmail: reviewer?.email,
      action: `decision.${action}`,
      entity: 'Claim',
      entityId: claim._id.toString(),
      meta: { previousStatus: claim.status, newStatus: nextStatus, note },
    });

    return {
      claimId: claim._id.toString(),
      status: nextStatus,
    };
  }
}
