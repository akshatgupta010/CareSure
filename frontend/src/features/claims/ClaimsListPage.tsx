import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, ChevronRight, Activity, FileText } from 'lucide-react';
import { Badge, getRiskVariant } from '@/components/ui/Badge';
import { useClaims, useValidateClaim, useThresholds } from '@/features/claims/api';
import { BENCHMARK_8_CLAIM_SUMMARIES } from './benchmarkData';
import { formatPaise } from '@/lib/utils/currency';

export const ClaimsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: claims, isLoading } = useClaims();
  const { data: thresholds } = useThresholds();
  const validateMutation = useValidateClaim();

  const lowMax = thresholds?.lowMax ?? 39;
  const reviewMax = thresholds?.reviewMax ?? 69;

  const activeClaims = useMemo(() => {
    if (claims && claims.length > 0) return claims;
    return BENCHMARK_8_CLAIM_SUMMARIES;
  }, [claims]);

  const filteredClaims = useMemo(() => {
    return activeClaims
      .filter((c) => {
        const matchesSearch =
          search === '' ||
          (c.claimNumber || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.patientName || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.hospitalName || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.procedure || '').toLowerCase().includes(search.toLowerCase());

        const effectiveBand =
          c.status === 'Approved' || c.status === 'Cleared'
            ? 'low'
            : c.riskScore != null
            ? c.riskScore <= lowMax
              ? 'low'
              : c.riskScore <= reviewMax
              ? 'review'
              : 'high'
            : c.band;

        const matchesRisk = riskFilter === 'all' || effectiveBand === riskFilter;
        const matchesStatus = statusFilter === 'all' || c.status.toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesRisk && matchesStatus;
      })
      .slice(0, 8); // Strictly limit to at most 8 records in Claims Register
  }, [claims, search, riskFilter, statusFilter, lowMax, reviewMax]);

  const handleValidateNow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await validateMutation.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-main">
            Claims Register
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Search, filter, and inspect verified hospital insurance claims
          </p>
        </div>

        <Link
          to="/claims/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-text-onbrand font-bold text-xs hover:bg-brand-hover shadow-sm transition-all"
        >
          <Plus size={16} />
          <span>New Claim Intake</span>
        </Link>
      </div>

      {/* Filterbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-bg-surface p-3 rounded-2xl border border-border-subtle shadow-xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search claim ID, patient, hospital, procedure..."
            className="w-full bg-bg-subtle border border-border-subtle rounded-xl pl-9 pr-4 py-2 text-xs text-text-main placeholder:text-text-muted outline-none focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-bg-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs font-semibold text-text-secondary outline-none focus:border-brand"
          >
            <option value="all">All Risk Bands</option>
            <option value="low">Low Risk (0–{lowMax})</option>
            <option value="review">Review Required ({lowMax + 1}–{reviewMax})</option>
            <option value="high">High Risk ({reviewMax + 1}–100)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-bg-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs font-semibold text-text-secondary outline-none focus:border-brand"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending review">Pending Review</option>
            <option value="cleared">Cleared</option>
            <option value="documents requested">Documents Requested</option>
            <option value="approved">Approved</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-subtle text-text-muted font-bold uppercase text-[10px] tracking-wider border-b border-border-subtle">
              <tr>
                <th className="py-3.5 px-4">Claim ID</th>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Hospital & Procedure</th>
                <th className="py-3.5 px-4">Claim Amount</th>
                <th className="py-3.5 px-4">Submitted</th>
                <th className="py-3.5 px-4">Risk Score</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {isLoading && activeClaims.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    Loading claims from MongoDB Atlas...
                  </td>
                </tr>
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    No matching claims found.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr
                    key={claim.id}
                    onClick={() => navigate(`/verification?claimId=${claim.id}&claimNumber=${claim.claimNumber}`)}
                    className="hover:bg-bg-subtle/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-bold text-text-main">
                      {claim.claimNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-main">{claim.patientName}</div>
                      <div className="text-[10px] text-text-muted">{claim.patientId}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-main">{claim.procedure}</div>
                      <div className="text-[10px] text-text-muted">{claim.hospitalName}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-text-main">
                      {formatPaise(claim.claimAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      {claim.submittedAt ? new Date(claim.submittedAt).toLocaleDateString() : 'Draft'}
                    </td>
                    <td className="py-3.5 px-4">
                      {claim.riskScore != null ? (
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm">{claim.riskScore}</span>
                          <span className="text-[10px] text-text-muted">/100</span>
                        </div>
                      ) : (
                        <span className="text-text-muted italic">Unscored</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          claim.status === 'Approved' || claim.status === 'Cleared'
                            ? 'low'
                            : getRiskVariant(claim.riskScore, { lowMax, reviewMax })
                        }
                      >
                        {claim.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {claim.status === 'Draft' ? (
                        <button
                          onClick={(e) => handleValidateNow(claim.id, e)}
                          disabled={validateMutation.isPending}
                          className="px-2.5 py-1 rounded-lg bg-brand text-text-onbrand font-bold text-[11px] hover:bg-brand-hover shadow-xs"
                        >
                          Run Audit
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/verification?claimId=${claim.id}&claimNumber=${claim.claimNumber}`);
                          }}
                          className="inline-flex items-center gap-1 text-brand font-bold hover:underline"
                        >
                          <span>Review</span>
                          <ChevronRight size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
