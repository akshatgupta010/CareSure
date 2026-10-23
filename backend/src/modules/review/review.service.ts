import { Claim } from '../../models/Claim.js';

export class ReviewService {
  static async getQueue() {
    const [audited, flagged, verifiedClean, pendingClaims] = await Promise.all([
      Claim.countDocuments({ 'assessment.total': { $ne: null } }),
      Claim.countDocuments({ status: 'Pending Review' }),
      Claim.countDocuments({ status: { $in: ['Cleared', 'Approved'] } }),
      Claim.find({ status: 'Pending Review' }).sort({ 'assessment.total': -1 }),
    ]);

    const items = pendingClaims.map((c) => {
      // Find top finding by points
      const sortedFindings = [...(c.findings || [])].sort((a, b) => b.points - a.points);
      const topFinding = sortedFindings[0];

      const ageHours = Math.max(
        0,
        Math.round((Date.now() - (c.validatedAt || c.createdAt).getTime()) / (60 * 60 * 1000))
      );

      return {
        claimId: c._id.toString(),
        claimNumber: c.claimNumber,
        patientName: c.patientName,
        hospitalName: c.hospitalName,
        claimAmount: c.claimAmount,
        procedure: c.procedure,
        riskScore: c.assessment?.total || 0,
        band: c.assessment?.band || 'review',
        topReason: topFinding?.reason || 'Requires manual review by claims officer',
        topRuleId: topFinding?.ruleId || 'REVIEW',
        ageHours,
      };
    });

    return {
      counts: {
        audited,
        flagged,
        verifiedClean,
      },
      items,
    };
  }
}
