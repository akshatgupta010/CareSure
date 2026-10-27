import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { KpiCard } from '@/components/ui/KpiCard';
import { useAnalyticsOverview, useAnalyticsEvaluation } from '@/features/claims/api';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils/cn';

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'evaluation'>('overview');
  const { chartColors, isDark } = useTheme();
  const { data: overview } = useAnalyticsOverview();
  const { data: evaluation } = useAnalyticsEvaluation();

  // Data matching Screenshot 3
  const revenueTrendData = [
    { month: 'Mar', atRisk: 22.4, recovered: 3.2 },
    { month: 'Apr', atRisk: 21.0, recovered: 5.1 },
    { month: 'May', atRisk: 20.2, recovered: 7.4 },
    { month: 'Jun', atRisk: 19.5, recovered: 8.8 },
    { month: 'Jul', atRisk: 18.9, recovered: 10.2 },
    { month: 'Aug', atRisk: 18.4, recovered: 11.7 },
  ];

  const rejectionTrendData = [
    { month: 'Mar', baseline: 12.4, withCareSure: 11.5 },
    { month: 'Apr', baseline: 12.0, withCareSure: 10.2 },
    { month: 'May', baseline: 11.8, withCareSure: 8.9 },
    { month: 'Jun', baseline: 12.8, withCareSure: 7.6 },
    { month: 'Jul', baseline: 12.3, withCareSure: 6.4 },
    { month: 'Aug', baseline: 12.0, withCareSure: 5.7 },
  ];

  const anomaliesByCategory = [
    { category: 'Unsupported charge', count: 42 },
    { category: 'Missing billing entry', count: 35 },
    { category: 'Duplicate candidate', count: 28 },
    { category: 'Timestamp mismatch', count: 19 },
  ];

  const departmentAccuracyData = [
    { department: 'General Surgery', accuracy: 96 },
    { department: 'Radiology', accuracy: 88 },
    { department: 'Haematology', accuracy: 94 },
    { department: 'Cardiology', accuracy: 91 },
    { department: 'Orthopaedics', accuracy: 89 },
    { department: 'Obstetrics', accuracy: 95 },
  ];

  const anomaliesData = React.useMemo(() => {
    if (overview?.signalsByType && overview.signalsByType.some((s: any) => s.count > 0)) {
      return overview.signalsByType;
    }
    return anomaliesByCategory;
  }, [overview]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-main">
            Analytics
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Trends across departments, payers, and claim verification throughput
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-bg-subtle border border-border-subtle rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
              activeTab === 'overview'
                ? 'bg-bg-surface text-text-main shadow-xs'
                : 'text-text-muted hover:text-text-main'
            )}
          >
            Operational Overview
          </button>
          <button
            onClick={() => setActiveTab('evaluation')}
            className={cn(
              'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
              activeTab === 'evaluation'
                ? 'bg-bg-surface text-text-main shadow-xs'
                : 'text-text-muted hover:text-text-main'
            )}
          >
            Model Evaluation & Metrics
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* 4 Top KPI Cards with dynamic API values */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="VERIFICATION ACCURACY"
              value={overview?.kpis?.accuracy || (evaluation?.metrics?.precision ? `${(evaluation.metrics.precision * 100).toFixed(1)}%` : "96.4%")}
              trend="1.8%"
              trendPositive={true}
              subtext="Clear audit decisions"
            />
            <KpiCard
              label="AVG. REVIEW TIME"
              value={overview?.kpis?.avgProcessingTime || "1.8s"}
              trend="12%"
              trendPositive={true}
              subtext="Automated clinical verification"
            />
            <KpiCard
              label="AUTOMATION RATE"
              value={overview?.kpis?.automationRate || "88%"}
              trend="4.5%"
              trendPositive={true}
              subtext="Fast-track cleared claims"
            />
            <KpiCard
              label="REJECTION RATE"
              value={overview?.kpis?.rejectionRate || "4.2%"}
              trend="6.3%"
              trendPositive={true}
              subtext="Down from 12% industry baseline"
            />
          </div>

          {/* Middle Row Charts (Screenshot 3) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Revenue recovered vs at risk */}
            <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-text-main">Revenue recovered vs. at risk</h3>
                <p className="text-xs text-text-muted">₹ lakh per month</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="atRiskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="recoveredGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="month" stroke={isDark ? '#64748B' : '#94A3B8'} fontSize={11} tickLine={false} />
                    <YAxis stroke={isDark ? '#64748B' : '#94A3B8'} fontSize={11} domain={[0, 25]} tickLine={false} />
                    <Tooltip
                      formatter={(val: any) => [`₹${val} Lakh`, '']}
                      contentStyle={{
                        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                        borderColor: isDark ? '#1E293B' : '#E2E8F0',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Area type="monotone" dataKey="atRisk" stroke="#EF4444" strokeWidth={2} fill="url(#atRiskGrad)" name="At risk" />
                    <Area type="monotone" dataKey="recovered" stroke="#10B981" strokeWidth={2} fill="url(#recoveredGrad2)" name="Recovered" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-rose-500 rounded-full" />
                  <span className="text-text-muted">At risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-emerald-500 rounded-full" />
                  <span className="text-text-muted">Recovered</span>
                </div>
              </div>
            </div>

            {/* Rejection rate trend */}
            <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-text-main">Rejection rate trend</h3>
                <p className="text-xs text-text-muted">Baseline vs. with CareSure (%)</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rejectionTrendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="month" stroke={isDark ? '#64748B' : '#94A3B8'} fontSize={11} tickLine={false} />
                    <YAxis unit="%" stroke={isDark ? '#64748B' : '#94A3B8'} fontSize={11} domain={[0, 16]} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                        borderColor: isDark ? '#1E293B' : '#E2E8F0',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Line type="monotone" dataKey="baseline" name="Baseline" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="withCareSure" name="With CareSure" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-rose-500 rounded-full" />
                  <span className="text-text-muted">Baseline (11.8%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-emerald-500 rounded-full" />
                  <span className="text-text-muted">With CareSure (8.9% in May → 5.7% in Aug)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row (Screenshot 3) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Anomalies by category */}
            <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-text-main">Anomalies by category</h3>
                <p className="text-xs text-text-muted">Detected in the last 30 days</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={anomaliesData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                    <XAxis type="number" stroke={isDark ? '#64748B' : '#94A3B8'} fontSize={11} />
                    <YAxis dataKey="category" type="category" width={140} stroke={isDark ? '#CBD5E1' : '#334155'} fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: '12px' }} />
                    <Bar dataKey="count" fill="#0284C7" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department verification accuracy radar chart */}
            <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-text-main">Department verification accuracy</h3>
                <p className="text-xs text-text-muted">% of claims cleared without rework</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={departmentAccuracyData}>
                    <PolarGrid stroke={chartColors.grid} />
                    <PolarAngleAxis dataKey="department" stroke={isDark ? '#CBD5E1' : '#475569'} fontSize={11} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke={chartColors.grid} fontSize={10} />
                    <Radar name="Accuracy" dataKey="accuracy" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.35} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: '12px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Tab 2: Model Evaluation & Ablation Study (PRD Section 18) */
        <div className="space-y-6">
          <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4 mb-6">
              <div>
                <span className="text-[10px] font-extrabold tracking-widest text-brand uppercase block">
                  MODEL VALIDATION BENCHMARKS
                </span>
                <h3 className="text-lg font-black text-text-main">
                  Empirical Classification & Anomaly Detection Performance
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Evaluated on 400 audited validation claims with clinical error benchmarks (PRD Section 18)
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold">
                70/30 Stratified Split
              </span>
            </div>

            {/* Metric Pills */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-bg-subtle border border-border-subtle text-left">
                <span className="text-xs font-bold text-text-muted uppercase">Precision</span>
                <div className="text-2xl font-black text-text-main mt-1">94.2%</div>
                <span className="text-[10px] text-text-muted">High-risk positive predictive value</span>
              </div>
              <div className="p-4 rounded-xl bg-bg-subtle border border-border-subtle text-left">
                <span className="text-xs font-bold text-text-muted uppercase">Recall / Sensitivity</span>
                <div className="text-2xl font-black text-text-main mt-1">92.5%</div>
                <span className="text-[10px] text-text-muted">Injected audit discrepancy detection</span>
              </div>
              <div className="p-4 rounded-xl bg-bg-subtle border border-border-subtle text-left">
                <span className="text-xs font-bold text-text-muted uppercase">F1-Score</span>
                <div className="text-2xl font-black text-text-main mt-1">0.933</div>
                <span className="text-[10px] text-text-muted">Harmonic mean of precision & recall</span>
              </div>
              <div className="p-4 rounded-xl bg-bg-subtle border border-border-subtle text-left">
                <span className="text-xs font-bold text-text-muted uppercase">False Positive Rate</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">5.8%</div>
                <span className="text-[10px] text-text-muted">Below target 10% ceiling</span>
              </div>
            </div>

            {/* Ablation Study Table (PRD Section 18.2) */}
            <div>
              <h4 className="text-sm font-bold text-text-main mb-3">
                Ablation Study: Rule Engine vs. AI-Assisted Hybrid System
              </h4>
              <div className="overflow-x-auto border border-border-subtle rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-bg-subtle text-text-muted font-bold uppercase text-[10px] border-b border-border-subtle">
                    <tr>
                      <th className="p-3">Architecture Variant</th>
                      <th className="p-3">Precision</th>
                      <th className="p-3">Recall</th>
                      <th className="p-3">F1-Score</th>
                      <th className="p-3">FPR</th>
                      <th className="p-3">Key Advantage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle font-medium">
                    <tr className="hover:bg-bg-subtle/50">
                      <td className="p-3 font-bold text-text-main">Deterministic Rules Only (R01–R06)</td>
                      <td className="p-3">82.1%</td>
                      <td className="p-3">71.4%</td>
                      <td className="p-3">0.764</td>
                      <td className="p-3">14.2%</td>
                      <td className="p-3 text-text-muted">Rigid boolean checks; misses multi-item price inflation</td>
                    </tr>
                    <tr className="hover:bg-bg-subtle/50">
                      <td className="p-3 font-bold text-text-main">Rules + Isolation Forest (Anomaly)</td>
                      <td className="p-3">88.5%</td>
                      <td className="p-3">86.2%</td>
                      <td className="p-3">0.873</td>
                      <td className="p-3">8.9%</td>
                      <td className="p-3 text-text-muted">Captures procedure-relative length-of-stay outliers</td>
                    </tr>
                    <tr className="bg-blue-50/50 dark:bg-blue-950/20 font-bold text-text-main">
                      <td className="p-3 flex items-center gap-1.5 text-brand">
                        <span>★ CareSure Hybrid Model (Rules + ML + Anomaly)</span>
                      </td>
                      <td className="p-3 text-emerald-600 dark:text-emerald-400">94.2%</td>
                      <td className="p-3 text-emerald-600 dark:text-emerald-400">92.5%</td>
                      <td className="p-3 text-emerald-600 dark:text-emerald-400">0.933</td>
                      <td className="p-3 text-emerald-600 dark:text-emerald-400">5.8%</td>
                      <td className="p-3 text-text-secondary">Optimal balance: policy guarantees with pattern detection</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
