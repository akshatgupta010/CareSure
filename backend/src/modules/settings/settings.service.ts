import { Setting } from '../../models/Setting.js';
import { Claim } from '../../models/Claim.js';
import { AppError } from '../../utils/errors.js';
import { logAudit } from '../../services/audit.js';
import { DEFAULT_THRESHOLDS, ScoringThresholds } from '../../services/scoring.js';

export class SettingsService {
  static async getThresholds(): Promise<ScoringThresholds> {
    const setting = await Setting.findOne({ key: 'thresholds' });
    if (!setting || !setting.value) {
      return DEFAULT_THRESHOLDS;
    }
    return { ...DEFAULT_THRESHOLDS, ...(typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value) };
  }

  static async updateThresholds(data: Partial<ScoringThresholds>, actorId?: string, actorEmail?: string) {
    const current = await this.getThresholds();
    const updated: ScoringThresholds = { ...current, ...data };

    if (updated.lowMax >= updated.reviewMax) {
      throw new AppError('VALIDATION_ERROR', 400, 'lowMax must be strictly less than reviewMax', {
        lowMax: ['Must be less than reviewMax'],
      });
    }

    const capsSum = updated.rulesCap + updated.mlCap + updated.anomalyCap;
    if (capsSum > 100) {
      throw new AppError('VALIDATION_ERROR', 400, `Caps sum (${capsSum}) cannot exceed 100`, {
        caps: ['rulesCap + mlCap + anomalyCap must be <= 100'],
      });
    }

    await Setting.findOneAndUpdate(
      { key: 'thresholds' },
      { key: 'thresholds', value: updated, updatedBy: actorId },
      { upsert: true, returnDocument: 'after' }
    );

    // Dynamically reclassify all active (non-approved/non-cleared) claims based on new cutoffs
    const activeClaims = await Claim.find({
      status: { $nin: ['Cleared', 'Approved'] },
      'assessment.total': { $ne: null },
    });

    for (const c of activeClaims) {
      if (c.assessment && c.assessment.total != null) {
        if (c.assessment.total <= updated.lowMax) {
          c.assessment.band = 'low';
          c.assessment.validation = 'passed';
        } else if (c.assessment.total <= updated.reviewMax) {
          c.assessment.band = 'review';
          c.assessment.validation = 'warnings';
        } else {
          c.assessment.band = 'high';
          c.assessment.validation = 'failed';
        }
        await c.save();
      }
    }

    await logAudit({
      actorId,
      actorEmail,
      action: 'settings.update_thresholds',
      entity: 'Setting',
      entityId: 'thresholds',
      meta: { thresholds: updated, reclassifiedClaims: activeClaims.length },
    });

    return updated;
  }

  static async getRules() {
    const setting = await Setting.findOne({ key: 'validation_rules' });
    const defaultRules = {
      R01: { enabled: true, points: 25, name: 'Missing diagnostic report' },
      R02: { enabled: true, points: 20, name: 'Duplicate billing' },
      R03: { enabled: true, points: 15, name: 'Amount outside expected range', tolerance: 10 },
      R04: { enabled: true, points: 10, name: 'Billing gap (revenue leakage)' },
      R05: { enabled: true, points: 15, name: 'Date inconsistency' },
      R06: { enabled: true, points: 10, name: 'Missing mandatory document' },
    };

    if (!setting || !setting.value) return defaultRules;
    return { ...defaultRules, ...(typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value) };
  }

  static async updateRules(data: Record<string, any>, actorId?: string, actorEmail?: string) {
    await Setting.findOneAndUpdate(
      { key: 'validation_rules' },
      { key: 'validation_rules', value: data, updatedBy: actorId },
      { upsert: true, returnDocument: 'after' }
    );

    await logAudit({
      actorId,
      actorEmail,
      action: 'settings.update_rules',
      entity: 'Setting',
      entityId: 'validation_rules',
      meta: { rules: data },
    });

    return data;
  }
}
