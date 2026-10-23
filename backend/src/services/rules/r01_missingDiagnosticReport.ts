import { RuleContext, RuleFinding } from './types.js';

// Keywords indicating a diagnostic/imaging/laboratory test
const DIAGNOSTIC_KEYWORDS = [
  'ct scan',
  'computed tomography',
  'cat scan',
  'mri',
  'magnetic resonance',
  'ultrasound',
  'usg',
  'sonography',
  'x-ray',
  'xray',
  'radiology',
  'biopsy',
  'pathology',
  'histopathology',
  'cbc',
  'blood test',
  'lipid profile',
  'ecg',
  'echocardiogram',
  'echo',
  'endoscopy',
  'colonoscopy',
];

export function evaluateR01(ctx: RuleContext): RuleFinding | null {
  for (const bill of ctx.billing) {
    const serviceLower = bill.service.toLowerCase();
    const isDiagnosticService = DIAGNOSTIC_KEYWORDS.some((kw) => serviceLower.includes(kw));

    if (!isDiagnosticService) {
      continue;
    }

    // Check if there is an existing diagnostic record with a report present
    const diagnosticRecord = ctx.diagnostics.find((d) => {
      const diagName = d.testName.toLowerCase();
      const match =
        diagName.includes(serviceLower) ||
        serviceLower.includes(diagName) ||
        (bill.code && diagName.includes(bill.code.toLowerCase()));
      return match && d.reportPresent === true;
    });

    if (!diagnosticRecord) {
      // Rule R01 Fires!
      const formattedAmount = `₹${(bill.amount / 100).toLocaleString('en-IN')}`;

      return {
        fired: true,
        ruleId: 'R01',
        name: 'Missing diagnostic report',
        category: 'Missing Docs',
        severity: 'high',
        points: 25,
        reason: `${bill.service} is billed (${formattedAmount}) but no corresponding diagnostic report was found.`,
        evidence: [
          {
            source: 'billing',
            label: bill.service,
            value: formattedAmount,
            recordId: bill.id,
          },
          {
            source: 'diagnostic',
            label: `${bill.service} report`,
            value: 'not found',
          },
          {
            source: 'procedure',
            label: ctx.claim.procedure,
            value: 'recorded',
          },
        ],
      };
    }
  }

  return null;
}
