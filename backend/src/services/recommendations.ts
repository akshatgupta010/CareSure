import { RuleFinding } from './rules/types.js';

export function getRecommendedAction(findings: RuleFinding[]): string {
  if (findings.length === 0) {
    return 'All checks passed. Claim is eligible for fast-track clearance.';
  }

  // Sort by severity (high > medium > low) and then points descending
  const severityRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const sorted = [...findings].sort((a, b) => {
    const diff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
    return diff !== 0 ? diff : b.points - a.points;
  });

  const topFinding = sorted[0];

  switch (topFinding.ruleId) {
    case 'R01':
      return 'Obtain the missing diagnostic report or confirm the service was not performed, then update billing.';
    case 'R02':
      return 'Verify whether the repeated charge is valid; remove the duplicate if not.';
    case 'R03':
      return 'Check the package/procedure code and the billed amount against the approved range.';
    case 'R04':
      return 'Confirm the service was delivered and add the missing billing line if it was.';
    case 'R05':
      return 'Correct the service date or confirm the encounter dates.';
    case 'R06':
      return 'Request the missing mandatory document before submission.';
    default:
      if (topFinding.ruleId === 'ANOMALY') {
        return 'Review procedure charges and length of stay against hospital departmental benchmarks.';
      }
      return 'Conduct manual clinical review of flagged discrepancies.';
  }
}
