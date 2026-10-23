import { RuleContext, RuleFinding } from './types.js';

export function evaluateR05(ctx: RuleContext): RuleFinding | null {
  const admission = new Date(ctx.claim.admissionDate).getTime();
  const discharge = new Date(ctx.claim.dischargeDate).getTime();

  if (discharge < admission) {
    return {
      fired: true,
      ruleId: 'R05',
      name: 'Date inconsistency',
      category: 'Policy Issue',
      severity: 'medium',
      points: 15,
      reason: `Discharge date (${new Date(discharge).toISOString().split('T')[0]}) precedes admission date (${new Date(admission).toISOString().split('T')[0]}).`,
      evidence: [
        {
          source: 'discharge',
          label: 'Discharge Date',
          value: new Date(discharge).toISOString().split('T')[0],
        },
        {
          source: 'discharge',
          label: 'Admission Date',
          value: new Date(admission).toISOString().split('T')[0],
        },
      ],
    };
  }

  for (const bill of ctx.billing) {
    const sDate = new Date(bill.serviceDate).getTime();
    if (sDate < admission || sDate > discharge) {
      return {
        fired: true,
        ruleId: 'R05',
        name: 'Date inconsistency',
        category: 'Policy Issue',
        severity: 'medium',
        points: 15,
        reason: `Billed service ${bill.service} date (${new Date(sDate).toISOString().split('T')[0]}) falls outside admission (${new Date(admission).toISOString().split('T')[0]}) to discharge (${new Date(discharge).toISOString().split('T')[0]}) encounter span.`,
        evidence: [
          {
            source: 'billing',
            label: bill.service,
            value: new Date(sDate).toISOString().split('T')[0],
            recordId: bill.id,
          },
          {
            source: 'discharge',
            label: 'Encounter Span',
            value: `${new Date(admission).toISOString().split('T')[0]} to ${new Date(discharge).toISOString().split('T')[0]}`,
          },
        ],
      };
    }
  }

  return null;
}
