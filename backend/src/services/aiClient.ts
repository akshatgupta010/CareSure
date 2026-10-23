import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface AISignalsInput {
  procedure: string;
  amount: number; // paise
  lengthOfStay: number;
  itemsBilled: number;
  rulesFired: number;
  unmatchedRatio: number;
}

export interface AISignalsResult {
  available: boolean;
  anomalyScore: number;     // 0.0 to 1.0
  mlProbability: number;    // 0.0 to 1.0
  topFactors: string[];
  note?: string;
}

export class AIClient {
  static async getSignals(input: AISignalsInput): Promise<AISignalsResult> {
    const baseUrl = env.AI_SERVICE_URL;
    const token = env.AI_SERVICE_TOKEN;
    const timeoutMs = env.AI_TIMEOUT_MS;

    try {
      // 1. Call Anomaly Detection Endpoint
      const amountRupees = Math.round(input.amount / 100);

      const anomalyPromise = fetch(`${baseUrl}/anomaly`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Token': token,
        },
        body: JSON.stringify({
          procedure: input.procedure,
          amount: amountRupees,
          length_of_stay: input.lengthOfStay,
          items_billed: input.itemsBilled,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      // 2. Call ML Risk Endpoint
      const mlRiskPromise = fetch(`${baseUrl}/ml-risk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Token': token,
        },
        body: JSON.stringify({
          features: {
            procedure: input.procedure,
            amount: amountRupees,
            length_of_stay: input.lengthOfStay,
            items_billed: input.itemsBilled,
            rules_fired: input.rulesFired,
            unmatched_ratio: input.unmatchedRatio,
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      const [anomalyRes, mlRiskRes] = await Promise.all([anomalyPromise, mlRiskPromise]);

      if (!anomalyRes.ok || !mlRiskRes.ok) {
        throw new Error(
          `AI service responded with HTTP status Anomaly: ${anomalyRes.status}, ML: ${mlRiskRes.status}`
        );
      }

      const anomalyData: any = await anomalyRes.json();
      const mlRiskData: any = await mlRiskRes.json();

      return {
        available: true,
        anomalyScore: typeof anomalyData.anomaly_score === 'number' ? anomalyData.anomaly_score : 0,
        mlProbability: typeof mlRiskData.risk_probability === 'number' ? mlRiskData.risk_probability : 0,
        topFactors: [
          ...(Array.isArray(anomalyData.top_factors) ? anomalyData.top_factors : []),
          ...(Array.isArray(mlRiskData.top_features) ? mlRiskData.top_features : []),
        ],
      };
    } catch (err: any) {
      logger.warn('AI microservice unavailable or timed out; falling back to rules-only scoring', {
        error: err.message,
      });

      return {
        available: false,
        anomalyScore: 0,
        mlProbability: 0,
        topFactors: [],
        note: 'Scored by rules only. AI signals unavailable.',
      };
    }
  }

  static async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${env.AI_SERVICE_URL}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
