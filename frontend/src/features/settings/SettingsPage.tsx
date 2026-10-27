import React, { useState } from 'react';
import { useTheme, THEME_PRESETS, CustomColors } from '@/context/ThemeContext';
import { contrastRatio, isAccessibleContrast } from '@/lib/utils/contrast';
import { useThresholds, useUpdateThresholds, useRules, useUpdateRules } from '../claims/api';
import { Badge } from '@/components/ui/Badge';
import {
  Palette,
  Sliders,
  ShieldCheck,
  Sun,
  Moon,
  Laptop,
  Check,
  RotateCcw,
  AlertTriangle,
  Info,
  Save,
  CheckCircle2,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'thresholds' | 'rules'>('appearance');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">System Settings & Configuration</h1>
        <p className="text-sm text-secondary mt-1">
          Manage application visual theme tokens, AI verification thresholds, and deterministic rules.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-subtle flex gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'appearance'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Palette className="w-4 h-4" />
          Appearance Studio
        </button>

        <button
          onClick={() => setActiveTab('thresholds')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'thresholds'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Risk Scoring Engine
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-brand text-brand font-semibold'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Validation Rules
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'appearance' && <AppearanceStudioTab />}
      {activeTab === 'thresholds' && <ThresholdsTab />}
      {activeTab === 'rules' && <RulesTab />}
    </div>
  );
};

// ── 1. Appearance Studio Tab ─────────────────────────────────────────────────

const AppearanceStudioTab: React.FC = () => {
  const {
    mode,
    isDark,
    activePresetId,
    customColors,
    setMode,
    setPreset,
    setCustomColor,
    resetTheme,
  } = useTheme();

  // Active brand primary for contrast preview
  const effectiveBrandPrimary =
    activePresetId === 'custom' && customColors.brandPrimary
      ? customColors.brandPrimary
      : (THEME_PRESETS.find((p) => p.id === activePresetId)?.brandPrimary || '#8FA9FF');

  // Calculate contrast with dark ink (#0A192F) and white (#FFFFFF)
  const contrastWithDark = contrastRatio(effectiveBrandPrimary, '#0A192F');
  const contrastWithWhite = contrastRatio(effectiveBrandPrimary, '#FFFFFF');
  const inkColor = contrastWithDark >= 4.5 ? '#0A192F' : '#FFFFFF';
  const passesAALarge = isAccessibleContrast(effectiveBrandPrimary, inkColor, false);
  const passesAANormal = isAccessibleContrast(effectiveBrandPrimary, inkColor, true);

  return (
    <div className="space-y-8">
      {/* Mode Switcher */}
      <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-primary mb-1">Color Mode</h2>
        <p className="text-xs text-secondary mb-4">
          Select between light theme, dark theme, or synchronize with system preference. Uses zero-white-flash boot script.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { id: 'light', label: 'Light Mode', icon: Sun, desc: 'High readability medical slate' },
            { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'High contrast deep clinical navy' },
            { id: 'system', label: 'System Default', icon: Laptop, desc: 'Syncs with OS preferences' },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = mode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setMode(item.id as any)}
                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  isSelected
                    ? 'border-brand bg-brand/5 ring-2 ring-brand/30 shadow-sm'
                    : 'border-subtle bg-app hover:border-brand/40'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-brand text-onbrand' : 'bg-surface text-secondary border border-subtle'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">{item.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-brand" />}
                  </div>
                  <span className="text-xs text-muted mt-0.5 block">{item.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Palettes */}
      <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-primary">Curated Enterprise Presets</h2>
          <button
            onClick={resetTheme}
            className="text-xs text-secondary hover:text-brand flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to PRD Default
          </button>
        </div>
        <p className="text-xs text-secondary mb-4">
          CareSure includes pre-calculated medical palettes engineered to exceed WCAG AA contrast guidelines.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {THEME_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setPreset(preset.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-brand bg-brand/5 ring-2 ring-brand/30 shadow-sm'
                    : 'border-subtle bg-app hover:border-brand/40'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border border-black/10 shadow-inner"
                      style={{ backgroundColor: preset.brandPrimary }}
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-black/10 shadow-inner -ml-3"
                      style={{ backgroundColor: preset.brandAccent }}
                    />
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand" />}
                </div>
                <div className="text-sm font-semibold text-primary">{preset.name}</div>
                <div className="text-xs text-muted mt-1 line-clamp-2">{preset.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Custom Token Pickers & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Color Customizer Panel */}
        <div className="lg:col-span-7 bg-surface border border-subtle rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-primary">Live Token Customizer</h2>
              <p className="text-xs text-secondary">
                Directly tune primary brand, accent, and background tokens across the app.
              </p>
            </div>
            {activePresetId === 'custom' && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-brand/10 text-brand border border-brand/20">
                Custom Mode Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Primary Brand */}
            <ColorPickerField
              label="Primary Brand Color"
              description="Buttons, active tabs, gauges, key metrics"
              value={customColors.brandPrimary || effectiveBrandPrimary}
              onChange={(hex) => setCustomColor('brandPrimary', hex)}
            />

            {/* Brand Accent */}
            <ColorPickerField
              label="Accent / Highlight Color"
              description="Secondary badges, gradients, sparklines"
              value={customColors.brandAccent || '#38BDF8'}
              onChange={(hex) => setCustomColor('brandAccent', hex)}
            />

            {/* App Background */}
            <ColorPickerField
              label="Application Background"
              description="Main page canvas behind cards"
              value={customColors.bgApp || (isDark ? '#060D19' : '#F8FAFC')}
              onChange={(hex) => setCustomColor('bgApp', hex)}
            />

            {/* Surface Background */}
            <ColorPickerField
              label="Card / Surface Background"
              description="Panels, modals, table rows, headers"
              value={customColors.bgSurface || (isDark ? '#0C1B30' : '#FFFFFF')}
              onChange={(hex) => setCustomColor('bgSurface', hex)}
            />
          </div>

          {/* WCAG AA Automated Compliance Indicator */}
          <div className="p-4 rounded-xl bg-app border border-subtle mt-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  passesAANormal ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                }`}
              >
                {passesAANormal ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary">Automated WCAG AA Contrast Audit</span>
                  <Badge variant={passesAANormal ? 'passed' : 'review'}>
                    {contrastWithDark >= contrastWithWhite
                      ? `${contrastWithDark.toFixed(2)}:1 on Dark`
                      : `${contrastWithWhite.toFixed(2)}:1 on White`}
                  </Badge>
                </div>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {passesAANormal
                    ? `Passes WCAG AA standard (>= 4.5:1) for standard text and UI elements. High legibility guaranteed.`
                    : passesAALarge
                    ? `Passes WCAG AA for large text (>= 3.0:1) and graphical UI controls.`
                    : `Warning: Insufficient contrast against background. Recommend adjusting lightness.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 bg-surface border border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-primary">Live React Component Preview</h2>
              <span className="text-[11px] uppercase tracking-wider text-muted font-bold">Real-time</span>
            </div>
            <p className="text-xs text-secondary mb-4">
              This simulated CareSure claim verification widget reacts instantaneously as you tweak tokens above.
            </p>

            {/* Simulated Card */}
            <div className="p-4 rounded-xl border border-subtle bg-app shadow-inner space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted font-mono">#CS-10482</div>
                  <div className="text-sm font-semibold text-primary">Rajesh Kumar • Appendectomy</div>
                </div>
                <Badge variant="passed">Low Risk</Badge>
              </div>

              <div className="p-3 rounded-lg bg-surface border border-subtle flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted">Claim Verified Amount</div>
                  <div className="text-base font-bold text-primary">₹78,400</div>
                </div>
                <div
                  className="px-2.5 py-1 rounded text-xs font-semibold"
                  style={{ backgroundColor: effectiveBrandPrimary, color: inkColor }}
                >
                  94% Match
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold shadow-sm transition-opacity hover:opacity-95"
                  style={{ backgroundColor: effectiveBrandPrimary, color: inkColor }}
                >
                  Approve Claim
                </button>
                <button
                  type="button"
                  className="py-2 px-3 rounded-lg text-xs font-semibold bg-surface border border-subtle text-secondary hover:text-primary transition-colors"
                >
                  Flag Rule R04
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-subtle flex items-center gap-2 text-[11px] text-muted">
            <Info className="w-3.5 h-3.5 text-brand" />
            Tokens persist in browser storage and apply across all routes.
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Color Picker Subcomponent ──

interface ColorPickerFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (hex: string) => void;
}

const ColorPickerField: React.FC<ColorPickerFieldProps> = ({ label, description, value, onChange }) => {
  return (
    <div className="p-3 rounded-xl border border-subtle bg-app space-y-2">
      <div>
        <label className="text-xs font-semibold text-primary block">{label}</label>
        <span className="text-[11px] text-muted block">{description}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#8FA9FF'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer border border-subtle bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-surface border border-subtle rounded-lg px-2.5 py-1.5 text-xs font-mono text-primary focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="#8FA9FF"
        />
      </div>
    </div>
  );
};

// ── 2. Risk Engine Thresholds Tab ─────────────────────────────────────────────

const ThresholdsTab: React.FC = () => {
  const { data: thresholds, isLoading } = useThresholds();
  const updateMutation = useUpdateThresholds();

  const [form, setForm] = useState({
    lowMax: 39,
    reviewMax: 69,
    rulesCap: 40,
    mlCap: 35,
    anomalyCap: 25,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (thresholds) {
      setForm({
        lowMax: thresholds.lowMax ?? 39,
        reviewMax: thresholds.reviewMax ?? 69,
        rulesCap: thresholds.rulesCap ?? 40,
        mlCap: thresholds.mlCap ?? 35,
        anomalyCap: thresholds.anomalyCap ?? 25,
      });
    }
  }, [thresholds]);

  const capsSum = form.rulesCap + form.mlCap + form.anomalyCap;
  const isInvalidCaps = capsSum > 100;
  const isInvalidBands = form.lowMax >= form.reviewMax;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSavedSuccess(false);

    if (isInvalidBands) {
      setErrorMsg('Low Risk cutoff must be strictly less than Review Required cutoff.');
      return;
    }
    if (isInvalidCaps) {
      setErrorMsg(`Caps sum (${capsSum}) cannot exceed 100.`);
      return;
    }

    try {
      await updateMutation.mutateAsync(form);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to update thresholds.');
    }
  };

  if (isLoading) {
    return <div className="text-sm text-secondary py-8 text-center">Loading thresholds...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-semibold text-primary">Risk Score Classification Cutoffs</h2>
          <p className="text-xs text-secondary mt-1">
            Determines how CareSure partitions composite risk scores into Low Risk, Review Required, and High Risk.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-xl border border-subtle bg-app space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-primary">Low Risk Maximum Cutoff</label>
              <span className="text-xs font-mono font-bold text-success">0 - {form.lowMax}</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              value={form.lowMax}
              onChange={(e) => setForm({ ...form, lowMax: Number(e.target.value) })}
              className="w-full accent-brand"
            />
            <p className="text-[11px] text-muted">Claims below this threshold are eligible for straight-through approval.</p>
          </div>

          <div className="p-4 rounded-xl border border-subtle bg-app space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-primary">Review Required Cutoff</label>
              <span className="text-xs font-mono font-bold text-warning">{form.lowMax + 1} - {form.reviewMax}</span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              value={form.reviewMax}
              onChange={(e) => setForm({ ...form, reviewMax: Number(e.target.value) })}
              className="w-full accent-brand"
            />
            <p className="text-[11px] text-muted">Claims between {form.lowMax + 1} and {form.reviewMax} route to human audit.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-subtle">
          <h2 className="text-base font-semibold text-primary">Hybrid Model Score Caps (Max Sum: 100)</h2>
          <p className="text-xs text-secondary mt-1">
            CareSure computes composite score: <code className="text-xs font-mono font-semibold">Score = Rules + ML + Anomaly</code>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-3 rounded-xl border border-subtle bg-app space-y-2">
              <label className="text-xs font-semibold text-primary block">Deterministic Rules Cap</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.rulesCap}
                onChange={(e) => setForm({ ...form, rulesCap: Number(e.target.value) })}
                className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-sm text-primary font-mono focus:ring-1 focus:ring-brand outline-none"
              />
              <span className="text-[11px] text-muted block">Max contribution from R01-R06</span>
            </div>

            <div className="p-3 rounded-xl border border-subtle bg-app space-y-2">
              <label className="text-xs font-semibold text-primary block">Supervised ML Model Cap</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.mlCap}
                onChange={(e) => setForm({ ...form, mlCap: Number(e.target.value) })}
                className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-sm text-primary font-mono focus:ring-1 focus:ring-brand outline-none"
              />
              <span className="text-[11px] text-muted block">Random Forest prediction weight</span>
            </div>

            <div className="p-3 rounded-xl border border-subtle bg-app space-y-2">
              <label className="text-xs font-semibold text-primary block">Isolation Forest Anomaly Cap</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.anomalyCap}
                onChange={(e) => setForm({ ...form, anomalyCap: Number(e.target.value) })}
                className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-sm text-primary font-mono focus:ring-1 focus:ring-brand outline-none"
              />
              <span className="text-[11px] text-muted block">Unsupervised outlier weight</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 p-3 rounded-lg bg-app border border-subtle">
            <span className="text-xs font-medium text-secondary">Total Combined Cap:</span>
            <span
              className={`text-sm font-bold font-mono ${
                capsSum > 100 ? 'text-danger' : capsSum === 100 ? 'text-success' : 'text-primary'
              }`}
            >
              {capsSum} / 100
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {savedSuccess && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-xs text-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Thresholds successfully updated and applied dynamically across Claims Register & Verification Workspace.
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={updateMutation.isPending || isInvalidCaps || isInvalidBands}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-brand text-onbrand hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Saving...' : 'Save Scoring Thresholds'}
          </button>
        </div>
      </div>
    </form>
  );
};

// ── 3. Deterministic Validation Rules Tab ──────────────────────────────────────

const RulesTab: React.FC = () => {
  const { data: rules, isLoading } = useRules();
  const updateMutation = useUpdateRules();

  const [ruleState, setRuleState] = useState<Record<string, { enabled: boolean; points: number; name: string; tolerance?: number }>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    if (rules) {
      setRuleState(rules);
    }
  }, [rules]);

  const handleToggle = (id: string) => {
    setRuleState((prev) => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled },
    }));
  };

  const handlePointsChange = (id: string, points: number) => {
    setRuleState((prev) => ({
      ...prev,
      [id]: { ...prev[id], points: Math.max(0, points) },
    }));
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(ruleState);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // handled
    }
  };

  if (isLoading) {
    return <div className="text-sm text-secondary py-8 text-center">Loading validation rules...</div>;
  }

  const ruleDescriptions: Record<string, string> = {
    R01: 'Diagnostic report missing for billed procedure (high risk leakage)',
    R02: 'Duplicate billing of identical service code within same encounter window',
    R03: 'Billed amount deviates from expected hospital tariff book tolerance',
    R04: 'Clinical procedure documented in discharge summary but omitted in billing',
    R05: 'Date of service occurs outside admitted encounter window',
    R06: 'Mandatory discharge summary or doctor prescription missing from payload',
  };

  return (
    <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-primary">Pre-submission Deterministic Rules (R01–R06)</h2>
          <p className="text-xs text-secondary mt-1">
            Enable or configure base penalty penalty points for deterministic audit checks.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-brand text-onbrand hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? 'Saving...' : 'Save Rule Weights'}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Rules successfully saved and activated in live verification pipeline.
        </div>
      )}

      <div className="space-y-3">
        {Object.entries(ruleState).map(([ruleId, rule]) => (
          <div
            key={ruleId}
            className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
              rule.enabled ? 'border-subtle bg-app' : 'border-dashed border-subtle bg-app/50 opacity-60'
            }`}
          >
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => handleToggle(ruleId)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  rule.enabled ? 'bg-brand' : 'bg-muted'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    rule.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-primary">{ruleId}</span>
                  <span className="text-sm font-semibold text-primary">{rule.name}</span>
                </div>
                <p className="text-xs text-secondary mt-0.5">{ruleDescriptions[ruleId] || 'Deterministic validation check'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-muted">Penalty Points:</label>
              <input
                type="number"
                min="0"
                max="50"
                value={rule.points}
                onChange={(e) => handlePointsChange(ruleId, Number(e.target.value))}
                className="w-16 bg-surface border border-subtle rounded-lg px-2.5 py-1 text-xs text-primary font-mono text-center focus:ring-1 focus:ring-brand outline-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
