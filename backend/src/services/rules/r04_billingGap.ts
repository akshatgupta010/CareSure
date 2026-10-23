import { RuleContext, RuleFinding } from './types.js';

export function evaluateR04(ctx: RuleContext): RuleFinding | null {
  for (const proc of ctx.procedures) {
    const procNameLower = proc.name.toLowerCase().trim();

    // Check if any billing item matches this procedure
    const billed = ctx.billing.some((b) => {
      const billServiceLower = b.service.toLowerCase().trim();
      return (
        billServiceLower.includes(procNameLower) ||
        procNameLower.includes(billServiceLower) ||
        (proc.code && b.code && proc.code === b.code)
      );
    });

    if (!billed) {
      return {
        fired: true,
        ruleId: 'R04',
        name: 'Billing gap (revenue leakage)',
        category: 'Data Mismatch',
        severity: 'medium',
        points: 10,
        reason: `Clinical procedure ${proc.name} was documented on ${new Date(proc.date).toISOString().split('T')[0]}, but no matching charge appears in billing.`,
        evidence: [
          {
            source: 'procedure',
            label: proc.name,
            value: `Documented on ${new Date(proc.date).toISOString().split('T')[0]}`,
            recordId: proc.id,
          },
          {
            source: 'billing',
            label: `${proc.name} charge`,
            value: 'missing / unbilled',
          },
        ],
      };
    }
  }

  return null;
}
