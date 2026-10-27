import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/api/client';

export interface ClaimSummary {
  id: string;
  claimNumber: string;
  patientName: string;
  patientId: string;
  hospitalName: string;
  diagnosis: string;
  procedure: string;
  claimAmount: number; // in paise
  status: string;
  submittedAt: string | null;
  validatedAt: string | null;
  riskScore: number | null;
  band: 'low' | 'review' | 'high' | null;
  validation: 'passed' | 'warnings' | 'failed' | 'draft';
}

export interface ClaimDetail extends ClaimSummary {
  insurer: string;
  policyNumber: string;
  encounterId: string;
  admissionDate: string;
  dischargeDate: string;
  billing: Array<{
    id?: string;
    service: string;
    code?: string;
    amount: number;
    serviceDate: string;
  }>;
  procedures: Array<{
    id?: string;
    name: string;
    code?: string;
    date: string;
  }>;
  diagnostics: Array<{
    id?: string;
    testName: string;
    reportPresent: boolean;
    date: string;
  }>;
  documents: Array<{
    id?: string;
    kind: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    ocrConfidence?: number;
  }>;
  findings: Array<{
    ruleId: string;
    category: string;
    severity: 'low' | 'medium' | 'high';
    points: number;
    reason: string;
    evidence: Array<{ source: string; label: string; value: string; recordId?: string }>;
  }>;
  assessment?: {
    rulesPoints: number;
    mlPoints: number;
    anomalyPoints: number;
    total: number;
    band: 'low' | 'review' | 'high';
    validation: 'passed' | 'warnings' | 'failed';
    aiSignalsAvailable: boolean;
    aiNote?: string;
    processingMs: number;
  } | null;
  decisions: Array<{
    id?: string;
    reviewerId: string;
    action: string;
    note: string;
    createdAt: string;
  }>;
}

export interface DashboardStats {
  kpis: {
    total: number;
    pendingReview: number;
    lowRisk: number;
    verified?: number;
    reviewRequired: number;
    highRisk?: number;
    avgProcessingSeconds: number;
    revenueAtRiskPaise?: number;
    revenueRecoveredPaise?: number;
    deltas?: {
      totalDelta?: number;
      pendingDelta?: number;
      lowRiskDelta?: number;
      reviewDelta?: number;
      processingDelta?: number;
    };
  };
  riskDistribution: {
    low: { count: number; percentage: number };
    review: { count: number; percentage: number };
    high: { count: number; percentage: number };
  };
  insights: {
    rulesPointsAvg: number;
    mlPointsAvg: number;
    anomalyPointsAvg: number;
    hybridScoreAvg: number;
  };
  recentClaims: ClaimSummary[];
}

// ── Queries ──────────────────────────────────────────────────────────────────

export const useClaims = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: ['claims', params],
    queryFn: async () => {
      const { data } = await client.get('/claims', { params });
      return data.data as ClaimSummary[];
    },
  });
};

export const useClaim = (id: string) => {
  return useQuery({
    queryKey: ['claim', id],
    queryFn: async () => {
      const { data } = await client.get(`/claims/${id}`);
      return data.data as ClaimDetail;
    },
    enabled: !!id,
  });
};

export const useDashboardStats = (rangeDays = 30) => {
  return useQuery({
    queryKey: ['dashboard', rangeDays],
    queryFn: async () => {
      const { data } = await client.get('/dashboard/stats', { params: { rangeDays } });
      return data.data as DashboardStats;
    },
  });
};

export const useReviewQueue = () => {
  return useQuery({
    queryKey: ['review-queue'],
    queryFn: async () => {
      const { data } = await client.get('/review-queue/queue');
      return data.data as {
        counts: { audited: number; flagged: number; verifiedClean: number };
        items: Array<{
          claimId: string;
          claimNumber: string;
          patientName: string;
          procedure: string;
          riskScore: number;
          band: string;
          topReason: string;
          ageHours: number;
          claimAmount: number;
        }>;
      };
    },
  });
};

export const useAnalyticsOverview = () => {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => {
      const { data } = await client.get('/analytics/overview');
      return data.data;
    },
  });
};

export const useAnalyticsEvaluation = () => {
  return useQuery({
    queryKey: ['analytics', 'evaluation'],
    queryFn: async () => {
      const { data } = await client.get('/analytics/evaluation');
      return data.data;
    },
  });
};

export const useThresholds = () => {
  return useQuery({
    queryKey: ['settings', 'thresholds'],
    queryFn: async () => {
      const { data } = await client.get('/settings/thresholds');
      return data.data;
    },
  });
};

export const useRules = () => {
  return useQuery({
    queryKey: ['settings', 'rules'],
    queryFn: async () => {
      const { data } = await client.get('/settings/rules');
      return data.data as Record<string, { enabled: boolean; points: number; name: string; tolerance?: number }>;
    },
  });
};

export const useAuditLogs = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const { data } = await client.get('/audit-logs', { params });
      return data;
    },
  });
};

// ── Mutations ────────────────────────────────────────────────────────────────

export const useUpdateThresholds = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      lowMax: number;
      reviewMax: number;
      rulesCap: number;
      mlCap: number;
      anomalyCap: number;
    }) => {
      const { data } = await client.put('/settings/thresholds', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'thresholds'], refetchType: 'all' });
      qc.invalidateQueries({ queryKey: ['claims'], refetchType: 'all' });
      qc.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' });
      qc.invalidateQueries({ queryKey: ['review-queue'], refetchType: 'all' });
    },
  });
};

export const useUpdateRules = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { data } = await client.put('/settings/rules', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'rules'], refetchType: 'all' });
      qc.invalidateQueries({ queryKey: ['claims'], refetchType: 'all' });
      qc.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' });
      qc.invalidateQueries({ queryKey: ['review-queue'], refetchType: 'all' });
    },
  });
};

export const useCreateClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await client.post('/claims', payload);
      return data.data;
    },
    onSuccess: () => {
      ['claims', 'dashboard', 'review-queue', 'analytics'].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k], refetchType: 'all' })
      );
    },
  });
};

export const useValidateClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await client.post(`/claims/${id}/validate`);
      return data.data;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['claim', id], refetchType: 'all' });
      ['claims', 'dashboard', 'review-queue', 'analytics'].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k], refetchType: 'all' })
      );
    },
  });
};

export const useClaimDecision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: string; note: string }) => {
      const { data } = await client.post(`/claims/${id}/decision`, { action, note });
      return data.data;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['claim', id], refetchType: 'all' });
      ['claims', 'dashboard', 'review-queue', 'analytics'].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k], refetchType: 'all' })
      );
    },
  });
};
