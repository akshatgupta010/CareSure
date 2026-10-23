import { RuleContext, RuleFinding } from './types.js';
import { evaluateR01 } from './r01_missingDiagnosticReport.js';
import { evaluateR02 } from './r02_duplicateBilling.js';
import { evaluateR03 } from './r03_amountOutOfRange.js';
import { evaluateR04 } from './r04_billingGap.js';
import { evaluateR05 } from './r05_dateInconsistency.js';
import { evaluateR06 } from './r06_missingMandatoryDocument.js';

export interface RuleConfig {
  enabled: boolean;
  points: number;
}

export type RuleConfigs = Record<string, RuleConfig>;

export function runRuleEngine(
  ctx: RuleContext,
  ruleConfigs?: RuleConfigs
): RuleFinding[] {
  const findings: RuleFinding[] = [];

  const evaluators = [
    { id: 'R01', fn: evaluateR01 },
    { id: 'R02', fn: evaluateR02 },
    { id: 'R03', fn: evaluateR03 },
    { id: 'R04', fn: evaluateR04 },
    { id: 'R05', fn: evaluateR05 },
    { id: 'R06', fn: evaluateR06 },
  ];

  for (const { id, fn } of evaluators) {
    const config = ruleConfigs?.[id];
    if (config && config.enabled === false) {
      continue; // Skip disabled rule
    }

    const finding = fn(ctx);
    if (finding) {
      if (config && typeof config.points === 'number') {
        finding.points = config.points;
      }
      findings.push(finding);
    }
  }

  return findings;
}
