import { RuleContext, RuleFinding } from './types.js';

export function evaluateR02(ctx: RuleContext): RuleFinding | null {
  const seen = new Map<string, Array<{ id: string; service: string; amount: number; dateStr: string }>>();

  for (const bill of ctx.billing) {
    const dateStr = new Date(bill.serviceDate).toISOString().split('T')[0];
    const key = `${bill.service.toLowerCase().trim()}_${dateStr}`;

    const existing = seen.get(key) || [];
    existing.push({
      id: bill.id,
      service: bill.service,
      amount: bill.amount,
      dateStr,
    });
    seen.set(key, existing);
  }

  for (const items of seen.values()) {
    if (items.length > 1) {
      const duplicate = items[0];
      const count = items.length;
      const totalBilled = items.reduce((sum, item) => sum + item.amount, 0);

      return {
        fired: true,
        ruleId: 'R02',
        name: 'Duplicate billing',
        category: 'Duplicate-like',
        severity: 'high',
        points: 20,
        reason: `${duplicate.service} billed ${count} times on ${duplicate.dateStr} for total ₹${(totalBilled / 100).toLocaleString('en-IN')}.`,
        evidence: items.map((item, index) => ({
          source: 'billing',
          label: `${item.service} (Line #${index + 1})`,
          value: `₹${(item.amount / 100).toLocaleString('en-IN')}`,
          recordId: item.id,
        })),
      };
    }
  }

  return null;
}
