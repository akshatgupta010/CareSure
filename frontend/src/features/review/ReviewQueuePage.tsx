import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useReviewQueue, useClaimDecision } from '../claims/api';
import { BENCHMARK_8_CLAIMS } from '../claims/benchmarkData';
import { Badge } from '@/components/ui/Badge';
import { formatPaise } from '@/lib/utils/currency';
import {
  ShieldAlert,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Check,
  X,
} from 'lucide-react';

export const ReviewQueuePage: React.FC = () => {
  const { data: queueData, isLoading } = useReviewQueue();
  const decisionMutation = useClaimDecision();

  const handleQuickDecision = (id: string, action: string) => {
    decisionMutation.mutate({
      id,
      action,
      note: `Quick ${action} from auditor triage queue`,
    });
  };

  const fallbackQueueItems = useMemo(() => {
    return BENCHMARK_8_CLAIMS
      .filter((c) => c.status !== 'Approved' && c.status !== 'Cleared')
      .map((c) => ({
        claimId: c.id,
        claimNumber: c.claimNumber,
        patientName: c.patient,
        procedure: c.procedure,
        ageHours: 4,
        topReason: c.unbackedItems.slice(0, 75) + '...',
        claimAmount: c.amount * 100,
        riskScore: 100 - c.confidence,
        band: c.badgeVariant === 'high' ? ('high' as const) : ('review' as const),
      }));
  }, []);

  const items = (queueData?.items && queueData.items.length > 0) ? queueData.items : fallbackQueueItems;
  const counts = queueData?.counts || {
    flagged: items.length,
    audited: 1, // Ananya Sen approved
    verifiedClean: 1, // Amit Kumar straight-through cleared
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Auditor Review Queue</h1>
        <p className="text-sm text-secondary mt-1">
          Prioritized human-in-the-loop triage for high-risk claims, unbilled procedures, and tariff anomalies.
        </p>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-subtle rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-secondary font-medium">Pending Auditor Review</span>
            <div className="text-2xl font-bold text-primary font-mono mt-1">{counts.flagged}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-risk-high-bg text-risk-high-text flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-subtle rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-secondary font-medium">Audited & Resolved (Today)</span>
            <div className="text-2xl font-bold text-primary font-mono mt-1">{counts.audited}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-success/15 text-success flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-subtle rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-secondary font-medium">Straight-Through Verified Clean</span>
            <div className="text-2xl font-bold text-primary font-mono mt-1">{counts.verifiedClean}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">Triage Queue Items</h2>
          <span className="text-xs text-secondary">{items.length} claims awaiting action</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-secondary">Loading review queue...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
            <div className="text-sm font-semibold text-primary">All Claims Cleared</div>
            <div className="text-xs text-secondary mt-1">
              There are no pending claims requiring auditor intervention right now.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-subtle text-secondary font-semibold">
                  <th className="py-2.5 px-3">Claim Number</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Procedure</th>
                  <th className="py-2.5 px-3">Age</th>
                  <th className="py-2.5 px-3">Primary Discrepancy</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Risk Score</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {items.map((item) => (
                  <tr key={item.claimId} className="hover:bg-app transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-primary">
                      <Link
                        to={`/verification?claimId=${item.claimId}&claimNumber=${item.claimNumber}`}
                        className="hover:text-brand hover:underline flex items-center gap-1.5"
                      >
                        {item.claimNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-3 font-medium text-primary">{item.patientName}</td>
                    <td className="py-3 px-3 text-secondary">{item.procedure}</td>
                    <td className="py-3 px-3 text-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {item.ageHours}h ago
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-warning/10 text-warning border border-warning/20">
                        {item.topReason}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-primary">
                      {formatPaise(item.claimAmount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={item.band === 'high' ? 'high' : 'review'}>
                        {item.riskScore} pts
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleQuickDecision(item.claimId, 'approved')}
                          title="Quick Approve"
                          className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleQuickDecision(item.claimId, 'rejected')}
                          title="Quick Reject"
                          className="p-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          to={`/verification?claimId=${item.claimId}&claimNumber=${item.claimNumber}`}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-brand text-onbrand flex items-center gap-1 hover:opacity-90 transition-opacity"
                        >
                          Verify <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
