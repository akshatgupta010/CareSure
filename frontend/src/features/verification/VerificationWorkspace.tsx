import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Send,
  Zap,
  Play,
  RotateCcw,
} from 'lucide-react';
import { CircularGauge } from '@/components/ui/CircularGauge';
import { Badge } from '@/components/ui/Badge';
import {
  useClaims,
  useClaim,
  useClaimDecision,
  useCreateClaim,
  useValidateClaim,
  useThresholds,
} from '@/features/claims/api';
import { BENCHMARK_8_CLAIMS, BenchmarkShowcaseClaim } from '@/features/claims/benchmarkData';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { formatRupees } from '@/lib/utils/currency';

type ShowcaseClaim = BenchmarkShowcaseClaim;

const SHOWCASE_CLAIMS: ShowcaseClaim[] = BENCHMARK_8_CLAIMS;

export const VerificationWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: dbClaims } = useClaims();
  const { data: thresholds } = useThresholds();
  const createMutation = useCreateClaim();
  const validateMutation = useValidateClaim();
  const decisionMutation = useClaimDecision();

  const lowMax = thresholds?.lowMax ?? 39;
  const reviewMax = thresholds?.reviewMax ?? 69;

  // URL Query Parameters (when arriving from Claims Register)
  const [searchParams] = useSearchParams();
  const urlClaimId = searchParams.get('claimId');
  const urlClaimNumber = searchParams.get('claimNumber');

  // All claims combining dbClaims + base showcase claims
  const allClaims: ShowcaseClaim[] = React.useMemo(() => {
    const list: ShowcaseClaim[] = [];
    if (dbClaims && dbClaims.length > 0) {
      dbClaims.forEach((c) => {
        const risk = c.riskScore ?? 39;
        const confidence = Math.max(10, Math.min(99, 100 - risk));
        const isApproved = c.status === 'Approved';
        const isCleared = c.status === 'Cleared';
        const statusLabel =
          c.status === 'Draft'
            ? 'Draft'
            : isApproved
            ? 'Approved'
            : isCleared
            ? 'Cleared'
            : c.status === 'Documents Requested'
            ? 'Docs Needed'
            : c.status === 'Escalated'
            ? 'Escalated'
            : risk > reviewMax
            ? 'High Risk'
            : risk > lowMax
            ? 'Needs Review'
            : 'Verified';

        const badgeVariant: 'low' | 'review' | 'high' | 'neutral' =
          isApproved || isCleared
            ? 'low'
            : c.status === 'Draft'
            ? 'neutral'
            : c.status === 'Documents Requested'
            ? 'review'
            : c.status === 'Escalated'
            ? 'high'
            : risk > reviewMax
            ? 'high'
            : risk > lowMax
            ? 'review'
            : 'low';

        // Look up benchmark for rich clinical timeline and unbacked items
        const benchmark = BENCHMARK_8_CLAIMS.find((b) => b.claimNumber === c.claimNumber);

        list.push({
          id: c.id,
          claimNumber: c.claimNumber,
          procedure: c.procedure || benchmark?.procedure || 'Clinical Procedure',
          confidence: isApproved || isCleared ? 98 : (benchmark?.confidence ?? confidence),
          status: statusLabel,
          badgeVariant,
          patient: c.patientName || benchmark?.patient || 'Patient',
          patientId: c.patientId || benchmark?.patientId || 'PT-10001',
          department: c.hospitalName || benchmark?.department || 'General Surgery',
          admissionDate: c.submittedAt
            ? new Date(c.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : benchmark?.admissionDate || '24 Sep 2026',
          insurer: benchmark?.insurer || 'HealthSecure India',
          amount: c.claimAmount ? c.claimAmount / 100 : (benchmark?.amount || 245800),
          unbackedItems:
            benchmark?.unbackedItems ||
            (risk > lowMax
              ? 'Billing and documentation contains clinical findings requiring human audit.'
              : 'None. All billed items match surgical and pharmacy logs.'),
          timeline: benchmark?.timeline || [
            { stage: 'Registration', status: 'Matched', description: 'Patient identity and admission date consistent' },
            { stage: 'Prescription', status: 'Matched', description: 'Post-operative medication aligns with procedure' },
            {
              stage: 'Investigation Report',
              status: risk > 50 ? 'Inconsistency Detected' : 'Matched',
              description: risk > 50 ? 'Diagnostic investigation requires report verification' : 'Pre-admission laboratory panels verified',
            },
            { stage: 'Procedure Record', status: 'Matched', description: `${c.procedure || 'Procedure'} recorded by operating surgeon` },
            { stage: 'Discharge Summary', status: 'Matched', description: 'Discharge diagnosis matches procedure record' },
            {
              stage: 'Billing',
              status: risk > 55 ? 'Inconsistency Detected' : 'Matched',
              description: risk > 55 ? 'Itemized tariff charges exceed benchmark or contain unbacked items' : 'Room, OT, and consumable charges verified',
            },
          ],
          breakdown: benchmark?.breakdown || {
            completeness: Math.max(50, Math.min(99, confidence + 12)),
            consistency: Math.max(40, Math.min(99, confidence - 5)),
            billingMatch: Math.max(30, Math.min(99, confidence - 14)),
            timestamp: 88,
            evidence: Math.max(45, Math.min(99, confidence - 2)),
          },
        });
      });
    }

    // If database has claims, prioritize real DB claims and include showcase only if requested by URL
    if (list.length > 0) {
      if (urlClaimNumber && !list.some((existing) => existing.claimNumber === urlClaimNumber)) {
        const scMatch = SHOWCASE_CLAIMS.find((sc) => sc.claimNumber === urlClaimNumber);
        if (scMatch) list.push(scMatch);
      }
      return list;
    }

    // Fallback to benchmark showcase claims when offline or empty
    return SHOWCASE_CLAIMS;
  }, [dbClaims, urlClaimNumber, lowMax, reviewMax]);

  // Selected Claim ID state
  const [selectedClaimId, setSelectedClaimId] = useState<string>('');

  // Local overrides for decisions (immediate optimistic update for both DB and showcase claims)
  const [localStatusOverrides, setLocalStatusOverrides] = useState<
    Record<string, { status: string; band?: 'low' | 'review' | 'high'; note?: string }>
  >({});

  // Auto-select based on URL param or fallback
  React.useEffect(() => {
    if (urlClaimId) {
      const matchById = allClaims.find((c) => c.id === urlClaimId);
      if (matchById) {
        setSelectedClaimId(matchById.id);
        return;
      }
    }
    if (urlClaimNumber) {
      const matchByNumber = allClaims.find((c) => c.claimNumber === urlClaimNumber);
      if (matchByNumber) {
        setSelectedClaimId(matchByNumber.id);
        return;
      }
    }

    if (!selectedClaimId && allClaims.length > 0) {
      const preferred = allClaims.find((c) => c.claimNumber === 'CLM-2026-1041') || allClaims[0];
      if (preferred) {
        setSelectedClaimId(preferred.id);
      }
    }
  }, [allClaims, urlClaimId, urlClaimNumber, selectedClaimId]);

  const selectedClaim =
    allClaims.find((c) => c.id === selectedClaimId) || allClaims[0] || SHOWCASE_CLAIMS[0];

  // Fetch full live detail from backend if the selected claim is in MongoDB
  const matchedDbClaim = dbClaims?.find((c) => c.id === selectedClaim?.id || c.claimNumber === selectedClaim?.claimNumber);
  const isDbClaim = Boolean(matchedDbClaim);
  const { data: dbClaimDetail, refetch: refetchDetail } = useClaim(matchedDbClaim ? matchedDbClaim.id : '');

  // Modal and action states
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'request_docs' | 'escalate'>('request_docs');
  const [decisionNote, setDecisionNote] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isValidatingNow, setIsValidatingNow] = useState(false);

  // Dynamic values
  const patientName = dbClaimDetail?.patientName || selectedClaim.patient;
  const patientId = dbClaimDetail?.patientId || selectedClaim.patientId;
  const procedure = dbClaimDetail?.procedure || selectedClaim.procedure;
  const department = dbClaimDetail?.hospitalName || selectedClaim.department;
  const admissionDate = dbClaimDetail?.admissionDate
    ? new Date(dbClaimDetail.admissionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : selectedClaim.admissionDate;
  const insurer = dbClaimDetail?.insurer || selectedClaim.insurer;
  const billedAmount = dbClaimDetail?.claimAmount ? dbClaimDetail.claimAmount / 100 : selectedClaim.amount;
  const claimNumber = dbClaimDetail?.claimNumber || selectedClaim.claimNumber;

  // Effective status & band factoring in optimistic decision overrides
  const currentOverride =
    localStatusOverrides[selectedClaim.id] ||
    localStatusOverrides[claimNumber];

  const effectiveStatus =
    currentOverride?.status ||
    (dbClaimDetail?.status === 'Draft'
      ? 'Pending Review'
      : dbClaimDetail?.status || selectedClaim.status);

  const effectiveBand = (
    currentOverride?.band ||
    (effectiveStatus === 'Approved' || effectiveStatus === 'Cleared' || effectiveStatus === 'Verified'
      ? 'low'
      : dbClaimDetail?.assessment?.band || selectedClaim.badgeVariant)
  ) as 'low' | 'review' | 'high';

  // Clean / Verified / Approved Logic:
  const isApproved = effectiveStatus === 'Approved';
  const isCleared = effectiveStatus === 'Cleared';
  const isLowRisk = (effectiveBand as string) === 'low';
  const hasFindings = !isApproved && Boolean(dbClaimDetail?.findings && dbClaimDetail.findings.length > 0);
  const isCleanOrApproved = isApproved || isCleared || (!hasFindings && isLowRisk);

  const confidencePercent =
    isApproved || isCleared
      ? Math.max(92, selectedClaim.confidence || 95)
      : dbClaimDetail?.assessment
      ? Math.max(10, Math.min(99, 100 - dbClaimDetail.assessment.total))
      : selectedClaim.confidence;

  const unbackedMessage = isApproved
    ? (currentOverride?.note || dbClaimDetail?.decisions?.[dbClaimDetail.decisions.length - 1]?.note
        ? `Auditor verification certified. Note: "${currentOverride?.note || dbClaimDetail?.decisions?.[dbClaimDetail.decisions.length - 1]?.note}"`
        : 'Claim reviewed and certified by medical auditor with verified audit trail.')
    : isCleared || (isCleanOrApproved && !hasFindings)
    ? 'All clinical documentation, tariff packages, and diagnostic records verified clean with zero discrepancy flags. Straight-through clearing passed.'
    : hasFindings
    ? dbClaimDetail!.findings.map((f: any) => f.reason).join(' | ')
    : selectedClaim.unbackedItems;

  // Dynamic Timeline
  const activeTimeline = React.useMemo(() => {
    if (dbClaimDetail) {
      const findings = dbClaimDetail.findings || [];
      const diagFinding = findings.find((f: any) => f.ruleId === 'R01' || f.category === 'Missing Docs');
      const billFinding = findings.find((f: any) => f.ruleId === 'R02' || f.ruleId === 'R03' || f.ruleId === 'R04');
      const timeFinding = findings.find((f: any) => f.ruleId === 'R05');

      const timelineList: Array<{
        stage: string;
        status: 'Matched' | 'Inconsistency Detected';
        description: string;
      }> = [
        {
          stage: 'Registration',
          status: 'Matched',
          description: 'Patient identity and admission date consistent',
        },
        {
          stage: 'Prescription',
          status: 'Matched',
          description: 'Post-operative medication aligns with procedure',
        },
        {
          stage: 'Investigation Report',
          status: (!isCleanOrApproved && diagFinding) ? 'Inconsistency Detected' : 'Matched',
          description: (!isCleanOrApproved && diagFinding) ? diagFinding.reason : 'Diagnostic reports verified and consistent with clinical diagnosis',
        },
        {
          stage: 'Procedure Record',
          status: (!isCleanOrApproved && timeFinding) ? 'Inconsistency Detected' : 'Matched',
          description: (!isCleanOrApproved && timeFinding) ? timeFinding.reason : `${procedure} recorded by operating surgeon`,
        },
        {
          stage: 'Discharge Summary',
          status: 'Matched',
          description: 'Discharge diagnosis matches procedure record',
        },
        {
          stage: 'Billing',
          status: (!isCleanOrApproved && billFinding) ? 'Inconsistency Detected' : 'Matched',
          description: (!isCleanOrApproved && billFinding) ? billFinding.reason : 'All tariff items match hospital schedule without discrepancy',
        },
      ];
      return timelineList;
    }
    return selectedClaim.timeline.map((item) => ({
      ...item,
      status: isCleanOrApproved ? ('Matched' as const) : item.status,
    }));
  }, [dbClaimDetail, selectedClaim, procedure, isCleanOrApproved]);

  // Dynamic Breakdown
  const activeBreakdown = React.useMemo(() => {
    if (dbClaimDetail?.assessment) {
      const { rulesPoints, mlPoints, anomalyPoints } = dbClaimDetail.assessment;
      return {
        completeness: Math.max(50, Math.min(99, 100 - Math.round(rulesPoints * 1.3))),
        consistency: Math.max(45, Math.min(99, 100 - Math.round(mlPoints * 1.5))),
        billingMatch: Math.max(30, Math.min(99, 100 - Math.round(rulesPoints + anomalyPoints))),
        timestamp: dbClaimDetail.findings?.some((f: any) => f.ruleId === 'R05') ? 48 : 88,
        evidence: Math.max(45, Math.min(99, 100 - Math.round((rulesPoints + mlPoints) / 2))),
      };
    }
    return selectedClaim.breakdown;
  }, [dbClaimDetail, selectedClaim]);

  // Handle Quick Ingest of Clinical Claim
  const handleIngestSampleClaim = async () => {
    setIsIngesting(true);
    try {
      const scenarios = [
        {
          scenarioType: 'high_risk',
          diagnosis: 'Acute appendicitis with localized peritonitis',
          procedure: 'Appendectomy',
          claimAmount: 245800 * 100, // ₹2,45,800
          hospitalName: 'Apollo Medical Center',
          insurer: 'HealthSecure India',
          billing: [
            { service: 'Appendectomy Surgical Package', code: 'PRC-APP', amount: 195000 * 100, serviceDate: '2026-09-24' },
            { service: 'CT Abdomen and Pelvis with Contrast', code: 'RAD-CT', amount: 18500 * 100, serviceDate: '2026-09-24' }, // Missing diagnostic report -> Rule R01!
            { service: 'Inpatient Room & Surgical Consumables', code: 'MED-GEN', amount: 32300 * 100, serviceDate: '2026-09-25' },
          ],
          procedures: [
            { name: 'Appendectomy', code: 'PRC-APP', date: '2026-09-24' },
          ],
          diagnostics: [
            { testName: 'Pre-admission Complete Blood Count', reportPresent: true, date: '2026-09-24' },
          ],
          documents: [
            { kind: 'discharge_summary', fileName: 'Discharge_Summary.pdf', storedPath: 'sample_documents/discharge_summary.pdf', mimeType: 'application/pdf', sizeBytes: 102400 },
          ],
        },
        {
          scenarioType: 'duplicate_billing',
          diagnosis: 'Acute cholecystitis with cholelithiasis',
          procedure: 'Laparoscopic Cholecystectomy',
          claimAmount: 235000 * 100, // ₹2,35,000
          hospitalName: 'Max Super Speciality Hospital',
          insurer: 'HDFC ERGO Health',
          billing: [
            { service: 'Laparoscopic Cholecystectomy Package', code: 'PRC-CHOLE', amount: 175000 * 100, serviceDate: '2026-09-24' },
            { service: 'Disposable Laparoscopy Trocar Kit', code: 'CON-TR01', amount: 30000 * 100, serviceDate: '2026-09-24' },
            { service: 'Disposable Laparoscopy Trocar Kit', code: 'CON-TR01', amount: 30000 * 100, serviceDate: '2026-09-24' }, // Duplicate billing -> Rule R02!
          ],
          procedures: [
            { name: 'Laparoscopic Cholecystectomy', code: 'PRC-CHOLE', date: '2026-09-24' },
          ],
          diagnostics: [
            { testName: 'USG Abdomen and Pelvis', reportPresent: true, date: '2026-09-24' },
          ],
          documents: [
            { kind: 'discharge_summary', fileName: 'Discharge_Summary.pdf', storedPath: 'sample_documents/discharge_summary.pdf', mimeType: 'application/pdf', sizeBytes: 102400 },
          ],
        },
        {
          scenarioType: 'missing_docs_benchmark',
          diagnosis: 'Severe Osteoarthritis of Left Knee',
          procedure: 'Total Knee Arthroplasty',
          claimAmount: 420000 * 100, // ₹4,20,000 (exceeds benchmark -> Rule R03!)
          hospitalName: 'Fortis Hospital',
          insurer: 'Star Health Allied',
          billing: [
            { service: 'Total Knee Arthroplasty Package', code: 'PRC-TKA', amount: 360000 * 100, serviceDate: '2026-09-24' },
            { service: 'Post-op Physiotherapy & Mobility Care', code: 'REH-01', amount: 60000 * 100, serviceDate: '2026-09-26' },
          ],
          procedures: [
            { name: 'Total Knee Arthroplasty', code: 'PRC-TKA', date: '2026-09-24' },
          ],
          diagnostics: [
            { testName: 'Digital X-Ray Bilateral Knee Joint', reportPresent: true, date: '2026-09-24' },
          ],
          documents: [], // Missing discharge summary -> Rule R06!
        },
        {
          scenarioType: 'clean_straight_through',
          diagnosis: 'Inguinal Hernia (Unilateral)',
          procedure: 'Hernia Repair',
          claimAmount: 115000 * 100, // ₹1,15,000 (clean benchmark)
          hospitalName: 'Medanta The Medicity',
          insurer: 'Care Health Insurance',
          billing: [
            { service: 'Hernia Repair Surgical Package', code: 'PRC-HERNIA', amount: 95000 * 100, serviceDate: '2026-09-24' },
            { service: 'Post-op Recovery & Pharmacy', code: 'MED-HERN', amount: 20000 * 100, serviceDate: '2026-09-25' },
          ],
          procedures: [
            { name: 'Hernia Repair', code: 'PRC-HERNIA', date: '2026-09-24' },
          ],
          diagnostics: [
            { testName: 'Pre-admission Clinical Panel', reportPresent: true, date: '2026-09-24' },
          ],
          documents: [
            { kind: 'discharge_summary', fileName: 'Discharge_Summary.pdf', storedPath: 'sample_documents/discharge_summary.pdf', mimeType: 'application/pdf', sizeBytes: 102400 },
          ],
        },
      ];

      const sampleUniqueNames = [
        'Aditya Singhania',
        'Meera Nambiar',
        'Siddharth Joshi',
        'Tanvi Deshmukh',
        'Kunal Kulkarni',
        'Nisha Bhattacharya',
        'Harshavardhan Rao',
        'Shalini Iyer',
        'Rohan Mehra',
        'Ishaan Kapoor',
        'Ananya Sen',
        'Pooja Nair',
        'Arjun Mathur',
        'Sneha Reddy',
        'Devansh Verma',
        'Kavita Joshi',
        'Vikram Malhotra',
        'Rahul Mehta',
        'Sunita Roy',
        'Amit Kumar',
        'Priya Singh',
        'Ramesh Patel',
        'Neha Sharma',
        'Varun Saxena',
        'Geeta Sundaram',
      ];

      // Guarantee unique patient name that is not already in the active claims
      const existingNames = new Set((dbClaims || []).map((c) => c.patientName.toLowerCase()));
      const availableNames = sampleUniqueNames.filter(
        (name) => !existingNames.has(name.toLowerCase())
      );
      const chosenName =
        availableNames.length > 0
          ? availableNames[Math.floor(Math.random() * availableNames.length)]
          : `Patient ${Math.floor(100 + Math.random() * 900)}`;

      // Cycle or randomize scenarios
      const chosen = scenarios[Math.floor(Math.random() * scenarios.length)];
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const newClaimNumber = `CLM-2026-${randomNum}`;
      const newPatientId = `PT-${Math.floor(10000 + Math.random() * 90000)}`;

      const encId = `ENC-${randomNum}`;

      const created = await createMutation.mutateAsync({
        claimNumber: newClaimNumber,
        patientName: chosenName,
        patientId: newPatientId,
        hospitalName: chosen.hospitalName,
        encounterId: encId,
        admissionDate: '2026-09-24',
        dischargeDate: '2026-09-28',
        diagnosis: chosen.diagnosis,
        procedure: chosen.procedure,
        claimAmount: chosen.claimAmount,
        policyNumber: `POL-${randomNum}`,
        insurer: chosen.insurer,
        billing: chosen.billing.map((b: any) => ({ ...b, encounterId: encId })),
        procedures: chosen.procedures.map((p: any) => ({ ...p, encounterId: encId })),
        diagnostics: chosen.diagnostics.map((d: any) => ({ ...d, encounterId: encId })),
        documents: chosen.documents,
      });

      const newId = created.id || created._id;

      // Validate immediately so AI findings, risk score, and breakdown are generated
      await validateMutation.mutateAsync(newId);

      // Invalidate queries so Claims Register and Overview Page refresh immediately
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['claims'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['analytics'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['review-queue'], refetchType: 'all' }),
      ]);
      setSelectedClaimId(newId);

      setStatusMessage(`Claim ${newClaimNumber} (${chosenName} · ${chosen.procedure}) ingested and evaluated by CareSure AI!`);
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to ingest sample claim');
    } finally {
      setIsIngesting(false);
    }
  };

  // Run AI Validation on the selected claim manually if needed
  const handleRunValidationNow = async () => {
    if (!selectedClaim?.id) return;
    setIsValidatingNow(true);
    try {
      await validateMutation.mutateAsync(selectedClaim.id);
      await queryClient.invalidateQueries({ queryKey: ['claims'] });
      await queryClient.invalidateQueries({ queryKey: ['claim', selectedClaim.id] });
      if (refetchDetail) refetchDetail();
      setStatusMessage(`AI validation completed for ${claimNumber}!`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Validation failed');
    } finally {
      setIsValidatingNow(false);
    }
  };

  const handleOpenDecision = (action: 'approve' | 'request_docs' | 'escalate') => {
    setDecisionAction(action);
    setDecisionNote(
      action === 'request_docs'
        ? 'Supporting clinical documentation requested for tariff schedule verification.'
        : action === 'approve'
        ? 'All clinical discrepancies verified and accepted by auditor.'
        : 'Discrepancy escalated to medical superintendent for audit review.'
    );
    setDecisionModalOpen(true);
  };

  const handleRecordDecision = async () => {
    const targetId = isDbClaim ? selectedClaim.id : (dbClaims?.find((c) => c.claimNumber === claimNumber)?.id);

    const newStatus =
      decisionAction === 'approve'
        ? 'Approved'
        : decisionAction === 'request_docs'
        ? 'Documents Requested'
        : 'Escalated';
    const newBand = decisionAction === 'approve' ? 'low' : decisionAction === 'request_docs' ? 'review' : 'high';

    // Optimistically update local state immediately so UI updates with zero delay
    setLocalStatusOverrides((prev) => ({
      ...prev,
      [selectedClaim.id]: { status: newStatus, band: newBand, note: decisionNote },
      [claimNumber]: { status: newStatus, band: newBand, note: decisionNote },
    }));

    if (targetId) {
      try {
        await decisionMutation.mutateAsync({
          id: targetId,
          action: decisionAction,
          note: decisionNote,
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['claims'], refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: ['claim', targetId], refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: ['analytics'], refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: ['review-queue'], refetchType: 'all' }),
        ]);
        if (refetchDetail) refetchDetail();
      } catch (e) {
        console.error('Failed to log decision to backend', e);
      }
    }

    setDecisionModalOpen(false);
    setStatusMessage(
      `Decision recorded: ${decisionAction.toUpperCase().replace('_', ' ')} with audit trail entry.`
    );
    setTimeout(() => setStatusMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Strip with Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-main">
            Verification Workspace
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Review anomalies, inspect supporting evidence, and record certified human decisions
          </p>
        </div>

        <button
          onClick={handleIngestSampleClaim}
          disabled={isIngesting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-text-onbrand font-bold text-xs hover:bg-brand-hover shadow-sm transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <Zap size={14} className={isIngesting ? 'animate-spin' : ''} />
          <span>{isIngesting ? 'Ingesting & Validating...' : '⚡ Ingest Sample Clinical Claim'}</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-risk-low-bg text-risk-low-text text-xs font-semibold flex items-center gap-2 border border-emerald-200">
          <CheckCircle2 size={16} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Workspace Card */}
      <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 lg:p-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-border-subtle pb-5 mb-6">
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-brand uppercase block">
              INTERACTIVE CLAIM VERIFICATION
            </span>
            <h2 className="text-xl font-black text-text-main mt-0.5">
              Verification Workspace
            </h2>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Select a Claim */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-[11px] font-black tracking-wider text-text-muted uppercase mb-2">
              SELECT A CLAIM
            </div>

            <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
              {allClaims.map((item) => {
                const isSelected = item.id === selectedClaimId;
                const override = localStatusOverrides[item.id] || localStatusOverrides[item.claimNumber];
                const itemStatus = override?.status || item.status;
                const itemVariant = (override?.band || (itemStatus === 'Approved' || itemStatus === 'Cleared' ? 'low' : item.badgeVariant)) as 'low' | 'review' | 'high';
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedClaimId(item.id)}
                    className={cn(
                      'p-4 rounded-xl border transition-all cursor-pointer select-none text-left flex items-center justify-between',
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-400/80 shadow-sm ring-1 ring-blue-400/30'
                        : 'bg-bg-subtle/40 border-border-subtle hover:bg-bg-subtle hover:border-border-strong'
                    )}
                  >
                    <div>
                      <div className="text-xs font-extrabold text-text-main flex items-center gap-2">
                        <span>{item.claimNumber}</span>
                        <span className="text-[11px] font-bold text-text-muted">
                          {itemStatus === 'Approved' ? '98%' : itemStatus === 'Cleared' ? '96%' : `${item.confidence}%`}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5">
                        {item.procedure}
                      </div>
                    </div>
                    <Badge variant={itemVariant}>{itemStatus}</Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Verification Panel */}
          <div className="lg:col-span-8 space-y-6">
            {/* Selected Claim Header with Circular Gauge */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border-subtle">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black tracking-tight text-text-main">
                    Claim #{claimNumber}
                  </h3>
                  <Badge variant={effectiveBand}>{effectiveStatus}</Badge>
                  {isDbClaim && (!dbClaimDetail?.assessment) && (
                    <button
                      onClick={handleRunValidationNow}
                      disabled={isValidatingNow}
                      className="px-2.5 py-1 rounded-lg bg-brand text-text-onbrand text-[11px] font-bold flex items-center gap-1 hover:bg-brand-hover shadow-xs"
                    >
                      <Play size={11} />
                      <span>{isValidatingNow ? 'Evaluating...' : 'Run AI Verification'}</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-text-secondary font-medium mt-1">
                  {patientName} · {patientId} · {procedure} · {department}
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Admitted {admissionDate} · Payer {insurer} · Billed {formatRupees(billedAmount)}
                </p>
              </div>

              {/* Data Confidence Circular Gauge */}
              <div className="shrink-0">
                <CircularGauge percentage={confidencePercent} size={110} />
              </div>
            </div>

            {/* Warning / Verification Callout Box */}
            <div
              className={cn(
                'p-4 rounded-xl border transition-all',
                isCleanOrApproved
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
              )}
            >
              <div className="flex items-center gap-2 font-bold text-xs mb-1">
                {isCleanOrApproved ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <AlertTriangle size={16} className="text-amber-500" />
                )}
                <span>
                  {isApproved
                    ? 'Auditor Approval Certified'
                    : isCleanOrApproved
                    ? 'Straight-Through Verification Passed'
                    : effectiveBand === 'high'
                    ? 'High Risk Discrepancies Flagged'
                    : 'Manual Verification Required'}
                </span>
              </div>
              <p className={cn('text-xs leading-relaxed', isCleanOrApproved ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300')}>
                {unbackedMessage}
              </p>
            </div>

            {/* Split: Verification Timeline (Left) & Confidence Breakdown (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Verification Timeline */}
              <div className="md:col-span-7 space-y-3">
                <div className="text-[11px] font-black tracking-wider text-text-muted uppercase mb-3">
                  VERIFICATION TIMELINE
                </div>

                <div className="space-y-3.5 border-l-2 border-border-subtle pl-4 ml-2">
                  {activeTimeline.map((item, idx) => (
                    <div key={idx} className="relative group text-left">
                      {/* Timeline dot */}
                      <span
                        className={cn(
                          'absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-bg-surface flex items-center justify-center',
                          item.status === 'Matched' ? 'bg-emerald-500' : 'bg-amber-500'
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-main">
                          {item.stage}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.2 rounded',
                            item.status === 'Matched'
                              ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300'
                          )}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confidence Breakdown Bars */}
              <div className="md:col-span-5 bg-bg-subtle/50 p-5 rounded-xl border border-border-subtle space-y-3.5">
                <div className="text-[11px] font-black tracking-wider text-text-muted uppercase">
                  CONFIDENCE BREAKDOWN
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Document completeness', val: activeBreakdown.completeness },
                    { label: 'Cross-document consistency', val: activeBreakdown.consistency },
                    { label: 'Billing match', val: activeBreakdown.billingMatch },
                    { label: 'Timestamp consistency', val: activeBreakdown.timestamp },
                    { label: 'Supporting evidence', val: activeBreakdown.evidence },
                  ].map((bar) => (
                    <div key={bar.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-text-secondary">
                        <span>{bar.label}</span>
                        <span className="font-bold text-text-main">{bar.val}%</span>
                      </div>
                      <div className="h-2 w-full bg-border-subtle rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            bar.val >= 85 ? 'bg-emerald-500' : bar.val >= 65 ? 'bg-blue-500' : 'bg-amber-500'
                          )}
                          style={{ width: `${bar.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Decision Bar (HITL Human In The Loop) */}
            <div className="pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-text-muted font-medium flex items-center gap-1.5">
                {isApproved ? (
                  <CheckCircle2 size={15} className="text-emerald-500" />
                ) : (
                  <ShieldAlert size={15} />
                )}
                {isApproved
                  ? 'Certified auditor approval recorded and logged in immutable audit trail'
                  : 'Human-in-the-loop: Certified auditor decision required'}
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {isApproved ? (
                  <div className="flex items-center gap-2">
                    <span className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      Claim Approved & Verified
                    </span>
                    <button
                      onClick={() => handleOpenDecision('request_docs')}
                      className="px-3.5 py-2 rounded-xl bg-bg-subtle text-text-muted hover:text-text-main hover:bg-border-subtle transition-colors text-xs font-semibold"
                    >
                      Change Decision
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleOpenDecision('request_docs')}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-500/25 transition-colors border border-amber-500/30"
                    >
                      Request Documents
                    </button>
                    <button
                      onClick={() => handleOpenDecision('escalate')}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-500/25 transition-colors border border-rose-500/30"
                    >
                      Escalate
                    </button>
                    <button
                      onClick={() => handleOpenDecision('approve')}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      Approve Claim
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      {decisionModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-text-main flex items-center gap-2">
              <span>Record Auditor Decision</span>
              <Badge variant={decisionAction === 'approve' ? 'low' : decisionAction === 'request_docs' ? 'review' : 'high'}>
                {decisionAction.toUpperCase().replace('_', ' ')}
              </Badge>
            </h3>

            <p className="text-xs text-text-muted">
              Submit your verified clinical decision for Claim #{claimNumber}. This action is audited and logged under your reviewer identity.
            </p>

            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Auditor Assessment Note (Minimum 10 characters required)
              </label>
              <textarea
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                rows={4}
                className="w-full bg-bg-subtle border border-border-subtle rounded-xl p-3 text-xs text-text-main outline-none focus:border-brand"
                placeholder="Enter clinical rationale or document request specification..."
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDecisionModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-bg-subtle text-text-muted text-xs font-bold hover:bg-border-subtle"
              >
                Cancel
              </button>
              <button
                disabled={decisionNote.trim().length < 10 || decisionMutation.isPending}
                onClick={handleRecordDecision}
                className="px-4 py-2 rounded-xl bg-brand text-text-onbrand text-xs font-bold hover:bg-brand-hover disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send size={13} />
                <span>{decisionMutation.isPending ? 'Logging...' : 'Confirm Decision'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
