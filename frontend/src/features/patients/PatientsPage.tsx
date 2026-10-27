import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClaims } from '../claims/api';
import { BENCHMARK_8_CLAIM_SUMMARIES } from '../claims/benchmarkData';
import { Badge } from '@/components/ui/Badge';
import { formatPaise } from '@/lib/utils/currency';
import { Users, Search, ArrowRight, ShieldCheck, FileText } from 'lucide-react';

export const PatientsPage: React.FC = () => {
  const { data: claims } = useClaims();
  const [search, setSearch] = useState('');

  const activeClaims = (claims && claims.length > 0) ? claims : BENCHMARK_8_CLAIM_SUMMARIES;

  // Extract unique patients from claims
  const patientsMap = new Map<string, any>();
  activeClaims.forEach((c) => {
    if (!patientsMap.has(c.patientId)) {
      patientsMap.set(c.patientId, {
        id: c.patientId,
        name: c.patientName,
        hospital: c.hospitalName,
        claimsCount: 1,
        totalAmount: c.claimAmount,
        latestStatus: c.status,
        latestDiagnosis: c.diagnosis,
      });
    } else {
      const existing = patientsMap.get(c.patientId);
      existing.claimsCount += 1;
      existing.totalAmount += c.claimAmount;
    }
  });

  const patientList = Array.from(patientsMap.values()).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Patient Registry & Encounters</h1>
        <p className="text-sm text-secondary mt-1">
          Registered hospital patients, diagnostic records, and longitudinal claim history.
        </p>
      </div>

      <div className="bg-surface border border-subtle rounded-xl p-4 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient name or PMJAY ID..."
          className="bg-transparent text-xs text-primary placeholder-muted outline-none w-full"
        />
      </div>

      <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-subtle text-secondary font-semibold">
                <th className="py-2.5 px-3">Patient ID</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Hospital</th>
                <th className="py-2.5 px-3">Primary Diagnosis</th>
                <th className="py-2.5 px-3 text-center">Claims Filed</th>
                <th className="py-2.5 px-3 text-right">Total Claimed</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {patientList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No matching patients found.
                  </td>
                </tr>
              ) : (
                patientList.map((p) => (
                  <tr key={p.id} className="hover:bg-app transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-primary">{p.id}</td>
                    <td className="py-3 px-3 font-medium text-primary">{p.name}</td>
                    <td className="py-3 px-3 text-secondary">{p.hospital}</td>
                    <td className="py-3 px-3 text-muted">{p.latestDiagnosis}</td>
                    <td className="py-3 px-3 text-center font-mono">{p.claimsCount}</td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-primary">
                      {formatPaise(p.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to="/claims"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                      >
                        View Claims <ArrowRight className="w-3 h-3" />
                      </Link>
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
