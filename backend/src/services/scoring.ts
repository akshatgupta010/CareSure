import { RuleFinding } from './rules/types.js';

export interface ScoringThresholds {
  lowMax: number;        // default 39
  reviewMax: number;     // default 69
  rulesCap: number;      // default 40
  mlCap: number;         // default 35
  anomalyCap: number;    // default 25
  minOcrConfidence?: number;
}

export const DEFAULT_THRESHOLDS: ScoringThresholds = {
  lowMax: 39,
  reviewMax: 69,
  rulesCap: 40,
  mlCap: 35,
  anomalyCap: 25,
  minOcrConfidence: 0.7,
};

export interface HybridScoreResult {
  rulesPoints: number;
  mlPoints: number;
  anomalyPoints: number;
  total: number;
  band: 'low' | 'review' | 'high';
  validation: 'passed' | 'warnings' | 'failed';
  aiSignalsAvailable: boolean;
  aiNote?: string;
  thresholdsSnapshot: ScoringThresholds;
}

export function computeHybridScore(
  findings: RuleFinding[],
  aiResult: {
    available: boolean;
    anomalyScore: number;
    mlProbability: number;
    note?: string;
  },
  thresholds: ScoringThresholds = DEFAULT_THRESHOLDS
): HybridScoreResult {
  // 1. Rules points calculation (capped at rulesCap)
  const rawRulesSum = findings.reduce((sum, f) => sum + f.points, 0);
  const rulesPoints = Math.min(rawRulesSum, thresholds.rulesCap);

  // 2. ML & Anomaly points calculation (0 if AI unavailable)
  let mlPoints = 0;
  let anomalyPoints = 0;

  if (aiResult.available) {
    mlPoints = Math.round(aiResult.mlProbability * thresholds.mlCap);
    anomalyPoints = Math.round(aiResult.anomalyScore * thresholds.anomalyCap);
  }

  // 3. Total hybrid score out of 100
  const total = Math.min(100, rulesPoints + mlPoints + anomalyPoints);

  // 4. Initial band assignment
  let band: 'low' | 'review' | 'high';
  let validation: 'passed' | 'warnings' | 'failed';

  if (total <= thresholds.lowMax) {
    band = 'low';
    validation = 'passed';
  } else if (total <= thresholds.reviewMax) {
    band = 'review';
    validation = 'warnings';
  } else {
    band = 'high';
    validation = 'failed';
  }

  // 5. Overrides:
  // - Any High severity rule fired forces at least 'review' band
  const hasHighSeverityRule = findings.some((f) => f.severity === 'high');
  if (hasHighSeverityRule && band === 'low') {
    band = 'review';
    validation = 'warnings';
  }

  // - If AI signals were unavailable, claim cannot be blindly cleared
  if (!aiResult.available && band === 'low') {
    band = 'review';
    validation = 'warnings';
  }

  return {
    rulesPoints,
    mlPoints,
    anomalyPoints,
    total,
    band,
    validation,
    aiSignalsAvailable: aiResult.available,
    aiNote: aiResult.note,
    thresholdsSnapshot: thresholds,
  };
}
