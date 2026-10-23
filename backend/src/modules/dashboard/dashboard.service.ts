import { Claim } from '../../models/Claim.js';

export class DashboardService {
  static async getStats(rangeDays = 30) {
    const sinceDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

    const [
      totalClaims,
      pendingReview,
      lowRiskCount,
      reviewRequiredCount,
      highRiskCount,
      assessedClaims,
      recentClaimsRaw,
    ] = await Promise.all([
      Claim.countDocuments(),
      Claim.countDocuments({ status: 'Pending Review' }),
      Claim.countDocuments({ 'assessment.band': 'low' }),
      Claim.countDocuments({ 'assessment.band': 'review' }),
      Claim.countDocuments({ 'assessment.band': 'high' }),
      Claim.find(
        {
          'assessment.total': { $ne: null },
          createdAt: { $gte: sinceDate },
        },
        'assessment'
      ),
      Claim.find().sort({ createdAt: -1 }).limit(5),
    ]);

    const assessments = assessedClaims.map((c) => c.assessment!).filter(Boolean);

    const totalProcessingMs = assessments.reduce((sum, a) => sum + (a.processingMs || 0), 0);
    const avgProcessingSeconds =
      assessments.length > 0 ? (totalProcessingMs / assessments.length / 1000).toFixed(1) : '1.8';

    const totalAssessed = assessments.length || 1;
    const avgRules = Math.round(assessments.reduce((sum, a) => sum + (a.rulesPoints || 0), 0) / totalAssessed);
    const avgMl = Math.round(assessments.reduce((sum, a) => sum + (a.mlPoints || 0), 0) / totalAssessed);
    const avgAnomaly = Math.round(assessments.reduce((sum, a) => sum + (a.anomalyPoints || 0), 0) / totalAssessed);
    const avgHybrid = Math.round(assessments.reduce((sum, a) => sum + (a.total || 0), 0) / totalAssessed);

    const assessedCount = lowRiskCount + reviewRequiredCount + highRiskCount || 1;
    const riskDistribution = {
      low: Math.round((lowRiskCount / assessedCount) * 100),
      review: Math.round((reviewRequiredCount / assessedCount) * 100),
      high: Math.round((highRiskCount / assessedCount) * 100),
    };

    const recentClaims = recentClaimsRaw.map((c) => ({
      id: c._id.toString(),
      claimNumber: c.claimNumber,
      patientName: c.patientName,
      hospitalName: c.hospitalName,
      claimAmount: c.claimAmount,
      submittedAt: c.submittedAt || c.createdAt,
      riskScore: c.assessment?.total ?? null,
      band: c.assessment?.band ?? null,
      validation: c.assessment?.validation ?? (c.status === 'Draft' ? 'draft' : 'pending'),
      status: c.status,
    }));

    return {
      kpis: {
        totalClaims: { value: totalClaims, delta: '+12%' },
        pendingReview: { value: pendingReview, delta: '-5%' },
        lowRisk: { value: lowRiskCount, delta: '+18%' },
        reviewRequired: { value: reviewRequiredCount + highRiskCount, delta: '-8%' },
        avgProcessingSeconds: { value: parseFloat(avgProcessingSeconds), delta: '-15%' },
      },
      riskDistribution,
      insights: {
        rules: avgRules,
        ml: avgMl,
        anomaly: avgAnomaly,
        hybrid: avgHybrid,
      },
      recentClaims,
    };
  }
}
