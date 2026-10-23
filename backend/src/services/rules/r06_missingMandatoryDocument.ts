import { RuleContext, RuleFinding } from './types.js';

export function evaluateR06(ctx: RuleContext): RuleFinding | null {
  const hasDischargeSummary = ctx.documents.some((d) => {
    const k = d.kind.toLowerCase();
    const fn = d.fileName.toLowerCase();
    return (
      k.includes('discharge') ||
      fn.includes('discharge') ||
      k.includes('summary') ||
      fn.includes('summary')
    );
  });

  if (!hasDischargeSummary) {
    return {
      fired: true,
      ruleId: 'R06',
      name: 'Missing mandatory document',
      category: 'Missing Docs',
      severity: 'medium',
      points: 10,
      reason: 'Mandatory discharge summary document is missing from claim submission.',
      evidence: [
        {
          source: 'discharge',
          label: 'Discharge Summary',
          value: 'Not provided',
        },
        {
          source: 'system',
          label: 'Required Documents',
          value: 'Discharge Summary, Detailed Final Bill',
        },
      ],
    };
  }

  return null;
}
