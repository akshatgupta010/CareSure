import React from 'react';
import { useAuditLogs } from '../claims/api';
import { History, ShieldCheck, Search } from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const { data: auditResponse, isLoading } = useAuditLogs({ limit: 50 });
  const logs = auditResponse?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Enterprise Compliance Audit Trail</h1>
        <p className="text-sm text-secondary mt-1">
          Complete forensic activity log for all claim submissions, deterministic rule evaluations, and HITL overrides.
        </p>
      </div>

      <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-secondary">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-secondary">No audit entries found in active cluster.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-subtle text-secondary font-semibold">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor Email / Principal</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity Target</th>
                  <th className="py-2.5 px-3">Entity ID</th>
                  <th className="py-2.5 px-3">Event Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-app transition-colors">
                    <td className="py-3 px-3 font-mono text-muted whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-medium text-primary">{log.actorEmail || log.actorId || 'System'}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-brand/10 text-brand">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-secondary">{log.entity}</td>
                    <td className="py-3 px-3 font-mono text-muted">{log.entityId}</td>
                    <td className="py-3 px-3 font-mono text-muted max-w-sm truncate">
                      {log.meta ? JSON.stringify(log.meta) : '—'}
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
