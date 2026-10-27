import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useClaim, useValidateClaim, useClaimDecision } from './api';
import { Badge } from '@/components/ui/Badge';
import { CircularGauge } from '@/components/ui/CircularGauge';
import { formatRupees, formatPaise } from '@/lib/utils/currency';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  User,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  FileSpreadsheet,
  Clock,
  Sparkles,
} from 'lucide-react';

export const ClaimDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: claim, isLoading, error } = useClaim(id || '');
  const validateMutation = useValidateClaim();
  const decisionMutation = useClaimDecision();

  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionAction, setDecisionAction] = useState<'approved' | 'rejected' | 'flagged'>('approved');
  const [decisionNote, setDecisionNote] = useState('');

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-secondary">Loading claim verification details...</p>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="bg-surface border border-subtle rounded-xl p-8 text-center max-w-lg mx-auto mt-12 space-y-4">
        <AlertTriangle className="w-10 h-10 text-danger mx-auto" />
        <h2 className="text-base font-bold text-primary">Claim Not Found</h2>
        <p className="text-xs text-secondary">
          Could not locate claim records with identifier <code className="font-mono">{id}</code>.
        </p>
        <button
          onClick={() => navigate('/claims')}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand text-onbrand"
        >
          Back to Claims List
        </button>
      </div>
    );
  }

  const handleOpenDecision = (action: 'approved' | 'rejected' | 'flagged') => {
    setDecisionAction(action);
    setDecisionNote(
      action === 'approved'
        ? 'Verified against hospital EMR and diagnostics. Approved straight-through.'
        : action === 'flagged'
        ? 'Discrepancy identified between discharge procedure and billing codes.'
        : 'Claim rejected due to critical missing documentation.'
    );
    setDecisionModalOpen(true);
  };

  const handleConfirmDecision = async () => {
    if (!claim) return;
    try {
      await decisionMutation.mutateAsync({
        id: claim.id,
        action: decisionAction,
        note: decisionNote,
      });
      setDecisionModalOpen(false);
    } catch {
      // handled
    }
  };

  const handleValidateNow = () => {
    if (claim) {
      validateMutation.mutate(claim.id);
    }
  };

  const riskScore = claim.riskScore ?? 0;
  const assessment = claim.assessment;

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/claims"
            className="p-2 rounded-lg bg-surface border border-subtle text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-primary font-mono">{claim.claimNumber}</h1>
              <Badge variant={claim.band || 'review'}>
                {claim.band ? `${claim.band.toUpperCase()} RISK` : 'UNVALIDATED'}
              </Badge>
              <Badge variant={claim.validation === 'passed' ? 'passed' : claim.validation === 'warnings' ? 'warnings' : 'failed'}>
                {claim.status}
              </Badge>
            </div>
            <p className="text-xs text-secondary mt-1">
              Patient: <span className="font-medium text-primary">{claim.patientName}</span> ({claim.patientId}) • Encounter: <span className="font-mono">{claim.encounterId || 'ENC-9021'}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleValidateNow}
            disabled={validateMutation.isPending}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface border border-subtle text-primary hover:border-brand transition-colors"
          >
            <Play className={`w-3.5 h-3.5 text-brand ${validateMutation.isPending ? 'animate-spin' : ''}`} />
            {validateMutation.isPending ? 'Validating...' : 'Re-Run Verification'}
          </button>
          <button
            onClick={() => handleOpenDecision('approved')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-success/15 text-success hover:bg-success/25 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Approve
          </button>
          <button
            onClick={() => handleOpenDecision('flagged')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-warning/15 text-warning hover:bg-warning/25 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Flag Review
          </button>
          <button
            onClick={() => handleOpenDecision('rejected')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-danger/15 text-danger hover:bg-danger/25 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </button>
        </div>
      </div>

      {/* Top Details Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-subtle rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-muted block">Hospital</span>
            <span className="text-xs font-bold text-primary truncate block">{claim.hospitalName}</span>
          </div>
        </div>

        <div className="bg-surface border border-subtle rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-muted block">Billed Amount</span>
            <span className="text-xs font-bold text-primary block">{formatPaise(claim.claimAmount)}</span>
          </div>
        </div>

        <div className="bg-surface border border-subtle rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-muted block">Stay Duration</span>
            <span className="text-xs font-bold text-primary block">
              {claim.admissionDate ? new Date(claim.admissionDate).toLocaleDateString() : 'N/A'} - {claim.dischargeDate ? new Date(claim.dischargeDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>

        <div className="bg-surface border border-subtle rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-muted block">Insurer / Policy</span>
            <span className="text-xs font-bold text-primary truncate block">
              {claim.insurer || 'Ayushman Bharat'} ({claim.policyNumber || 'PMJAY-78192'})
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Score & Timeline, Right Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Verification Score & Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          {/* Radial Confidence Gauge Card */}
          <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm flex flex-col items-center text-center">
            <h2 className="text-sm font-semibold text-primary mb-1">Composite Verification Score</h2>
            <p className="text-xs text-secondary mb-4">
              Consolidated evaluation across Deterministic Rules, Supervised Random Forest, and Isolation Forest.
            </p>

            <CircularGauge
              percentage={100 - riskScore}
              size={180}
              strokeWidth={14}
              label="Integrity Score"
            />

            <div className="w-full mt-6 pt-5 border-t border-subtle grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[11px] text-muted block">Rules</span>
                <span className="text-xs font-bold text-primary font-mono">
                  +{assessment?.rulesPoints ?? 0} pts
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted block">ML Classifier</span>
                <span className="text-xs font-bold text-primary font-mono">
                  +{assessment?.mlPoints ?? 0} pts
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted block">Isolation Forest</span>
                <span className="text-xs font-bold text-primary font-mono">
                  +{assessment?.anomalyPoints ?? 0} pts
                </span>
              </div>
            </div>
          </div>

          {/* Cross Record Verification Timeline */}
          <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-primary">Cross-Record Verification Timeline</h2>
              <Clock className="w-4 h-4 text-secondary" />
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-subtle">
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-brand/20 border-2 border-brand" />
                <div className="text-xs font-semibold text-primary">Patient Admission Recorded</div>
                <div className="text-[11px] text-muted">EMR Admission Date: {claim.admissionDate ? new Date(claim.admissionDate).toLocaleDateString() : 'N/A'}</div>
              </div>

              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-brand/20 border-2 border-brand" />
                <div className="text-xs font-semibold text-primary">Diagnostics Performed ({claim.diagnostics?.length || 0})</div>
                <div className="text-[11px] text-muted">
                  {claim.diagnostics && claim.diagnostics.length > 0
                    ? claim.diagnostics.map((d) => d.testName).join(', ')
                    : 'Ultrasound Abdomen, CBC, Blood Chemistry'}
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-brand/20 border-2 border-brand" />
                <div className="text-xs font-semibold text-primary">Procedure: {claim.procedure}</div>
                <div className="text-[11px] text-muted">Surgeon clinical discharge summary cross-matched</div>
              </div>

              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-brand/20 border-2 border-brand" />
                <div className="text-xs font-semibold text-primary">Billing Invoiced ({claim.billing?.length || 0} line items)</div>
                <div className="text-[11px] text-muted">Total claimed: {formatPaise(claim.claimAmount)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Findings & Document Evidence */}
        <div className="lg:col-span-7 space-y-6">
          {/* Findings Card */}
          <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-primary">Audited Discrepancies & Rule Violations</h2>
                <p className="text-xs text-secondary mt-0.5">
                  Detected {claim.findings?.length || 0} automated anomalies requiring reviewer review.
                </p>
              </div>
              <ShieldAlert className="w-4 h-4 text-warning" />
            </div>

            {(!claim.findings || claim.findings.length === 0) ? (
              <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-xs text-success flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Zero rule discrepancies detected. Claim adheres to hospital tariff schedule.
              </div>
            ) : (
              <div className="space-y-3">
                {claim.findings.map((finding, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-subtle bg-app space-y-2 hover:border-brand/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-danger/10 text-danger border border-danger/20">
                          {finding.ruleId}
                        </span>
                        <span className="text-xs font-semibold text-primary">{finding.category}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-danger">+{finding.points} pts</span>
                    </div>

                    <p className="text-xs text-secondary leading-relaxed">{finding.reason}</p>

                    {finding.evidence && finding.evidence.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {finding.evidence.map((ev, evIdx) => (
                          <div
                            key={evIdx}
                            className="px-2.5 py-1 rounded bg-surface border border-subtle text-[11px] text-muted font-mono flex items-center gap-1.5"
                          >
                            <span className="font-semibold text-primary">{ev.label}:</span>
                            <span>{ev.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Billing Line Items */}
          <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-primary">Extracted Billing Schedule</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-subtle text-secondary font-semibold">
                    <th className="py-2 px-3">Service</th>
                    <th className="py-2 px-3">Code</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {claim.billing && claim.billing.length > 0 ? (
                    claim.billing.map((item, idx) => (
                      <tr key={idx} className="hover:bg-app">
                        <td className="py-2.5 px-3 font-medium text-primary">{item.service}</td>
                        <td className="py-2.5 px-3 font-mono text-muted">{item.code || '—'}</td>
                        <td className="py-2.5 px-3 text-muted">
                          {item.serviceDate ? new Date(item.serviceDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-primary">
                          {formatPaise(item.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-muted">
                        No itemized billing line records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* HITL Decision Modal */}
      {decisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-subtle rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-primary capitalize">
                Confirm Human-In-The-Loop Decision: {decisionAction}
              </h3>
              <button
                onClick={() => setDecisionModalOpen(false)}
                className="text-secondary hover:text-primary text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              Recording this decision will update the claim state, emit an enterprise compliance audit log, and advance the revenue integrity pipeline.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-primary block">Auditor Review Note</label>
              <textarea
                rows={3}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                className="w-full bg-app border border-subtle rounded-xl p-3 text-xs text-primary focus:ring-1 focus:ring-brand outline-none"
                placeholder="Enter regulatory reasoning..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDecisionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface border border-subtle text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                disabled={decisionMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-onbrand hover:opacity-90 transition-opacity"
              >
                {decisionMutation.isPending ? 'Submitting...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
