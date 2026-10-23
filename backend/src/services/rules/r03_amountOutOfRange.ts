import { RuleContext, RuleFinding } from './types.js';

export function evaluateR03(ctx: RuleContext): RuleFinding | null {
  const procedureNorm = ctx.claim.procedure.toLowerCase().trim();
  const tolerance = (ctx.tolerancePercent ?? 10) / 100; // default 10%

  // Find expected range for procedure
  const range = ctx.expectedRanges.find((r) => {
    const key = r.procedureKey.toLowerCase().trim();
    return procedureNorm.includes(key) || key.includes(procedureNorm);
  });

  if (!range) {
    return null;
  }

  const allowedMax = Math.round(range.maxAmount * (1 + tolerance));

  if (ctx.claim.claimAmount > allowedMax) {
    const formattedBilled = `₹${(ctx.claim.claimAmount / 100).toLocaleString('en-IN')}`;
    const formattedRange = `₹${(range.minAmount / 100).toLocaleString('en-IN')} - ₹${(range.maxAmount / 100).toLocaleString('en-IN')}`;
    const formattedCap = `₹${(allowedMax / 100).toLocaleString('en-IN')}`;

    return {
      fired: true,
      ruleId: 'R03',
      name: 'Amount outside expected range',
      category: 'Unusual Amount',
      severity: 'medium',
      points: 15,
      reason: `Claim amount ${formattedBilled} exceeds approved benchmark range (${formattedRange}) by more than ${(tolerance * 100)}% tolerance.`,
      evidence: [
        {
          source: 'billing',
          label: 'Total Claim Amount',
          value: formattedBilled,
        },
        {
          source: 'system',
          label: 'Benchmark Range',
          value: formattedRange,
        },
        {
          source: 'system',
          label: 'Max Allowed with Tolerance',
          value: formattedCap,
        },
      ],
    };
  }

  return null;
}
