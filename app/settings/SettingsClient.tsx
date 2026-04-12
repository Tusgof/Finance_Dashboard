'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type {
  DashboardSettings as ApiDashboardSettings,
  RevenueSourceMapping as ApiRevenueSourceMapping,
} from '@/lib/types';

type RevenueSourceMapping = {
  source: string;
  keywords: string[];
};

type CostClassificationKeywords = {
  fixed: string[];
  production: string[];
  onetime: string[];
};

type HealthThresholds = {
  runwayCriticalMonths: number;
  runwayWarningMonths: number;
  grossMarginHealthyPercent: number;
  grossMarginWarningPercent: number;
  hhiBalancedThreshold: number;
  hhiConcentratedThreshold: number;
  execRatioHealthyMax: number;
  execRatioWarningMax: number;
  breakEvenHealthyPercent: number;
  breakEvenWarningPercent: number;
};

type ScenarioDefaults = {
  revenueTarget: number;
  revenueTargetMin: number;
  revenueTargetMax: number;
  revenueTargetStep: number;
  execAdjustment: number;
  execAdjustmentMin: number;
  execAdjustmentMax: number;
  execAdjustmentStep: number;
  productionAdjustment: number;
  productionAdjustmentMin: number;
  productionAdjustmentMax: number;
  productionAdjustmentStep: number;
  projectionMonths: number;
};

type RefreshConfig = {
  sheetId: string;
  csvExportUrl: string;
  fallbackOpeningBalance: number;
};

type DashboardSettings = {
  revenueSourceMappings: RevenueSourceMapping[];
  costClassificationKeywords: CostClassificationKeywords;
  directCostKeywords: string[];
  healthThresholds: HealthThresholds;
  scenarioDefaults: ScenarioDefaults;
  refresh: RefreshConfig;
};

type SettingsApiResponse =
  | ApiDashboardSettings
  | {
      settings?: ApiDashboardSettings;
      data?: ApiDashboardSettings;
      updatedAt?: string;
      message?: string;
    };

const SETTINGS_DRAFT_KEY = 'easymoneyconcept-settings-draft';

function createDefaultSettings(): DashboardSettings {
  return {
    revenueSourceMappings: [
      { source: 'Eightcap', keywords: ['Eightcap'] },
      { source: 'InnovestX', keywords: ['InnovestX'] },
      { source: 'OceanLife', keywords: ['OceanLife'] },
      { source: 'Money Turbo', keywords: ['เงินเทอร์โบ', 'Money Turbo'] },
      { source: 'Webull', keywords: ['Webull'] },
      { source: 'Facebook Ads', keywords: ['Facebook', 'Facebook Ads'] },
      { source: 'TikTok', keywords: ['TikTok'] },
    ],
    costClassificationKeywords: {
      fixed: ['เงินเดือน', 'ChatGPT', 'Gemini', 'Claude', 'บัญชี', 'ธรรมเนียม'],
      production: ['ค่าจ้าง', 'พากย์เสียง', 'เขียนบท', 'ตัดต่อ', 'Production', 'ฟุตเทจ'],
      onetime: ['อุปกรณ์', 'ไมค์', 'จอมอนิเตอร์', 'ฟอนต์', 'Freepik', 'Vecteezy', 'ภาษี'],
    },
    directCostKeywords: [
      'พากย์เสียง',
      'เขียนบท',
      'ทำฟุตเทจ',
      'ตัดต่อ',
      'Production',
      'ค่าจ้าง',
      'ค่าจ้างจัดทำของ',
      'ค่าจ้างบริการ',
      'ค่าอุปกรณ์',
    ],
    healthThresholds: {
      runwayCriticalMonths: 3,
      runwayWarningMonths: 6,
      grossMarginHealthyPercent: 30,
      grossMarginWarningPercent: 0,
      hhiBalancedThreshold: 2500,
      hhiConcentratedThreshold: 5000,
      execRatioHealthyMax: 0.5,
      execRatioWarningMax: 1.5,
      breakEvenHealthyPercent: 0,
      breakEvenWarningPercent: -20,
    },
    scenarioDefaults: {
      revenueTarget: 34000,
      revenueTargetMin: 0,
      revenueTargetMax: 200000,
      revenueTargetStep: 1000,
      execAdjustment: 0,
      execAdjustmentMin: -50,
      execAdjustmentMax: 0,
      execAdjustmentStep: 1,
      productionAdjustment: 0,
      productionAdjustmentMin: -30,
      productionAdjustmentMax: 30,
      productionAdjustmentStep: 1,
      projectionMonths: 12,
    },
    refresh: {
      sheetId: '1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8',
      csvExportUrl: 'https://docs.google.com/spreadsheets/d/1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8/export?format=csv',
      fallbackOpeningBalance: 124331.84,
    },
  };
}

function fromApiSettings(value: ApiDashboardSettings): DashboardSettings {
  return {
    revenueSourceMappings: value.revenueSources.map(item => ({
      source: item.label,
      keywords: item.keywords,
    })),
    costClassificationKeywords: {
      fixed: value.costClassification.fixed.keywords,
      production: value.costClassification.production.keywords,
      onetime: value.costClassification.onetime.keywords,
    },
    directCostKeywords: value.costClassification.directKeywords,
    healthThresholds: {
      runwayCriticalMonths: value.healthThresholds.cashRunwayMonths.cautionMin,
      runwayWarningMonths: value.healthThresholds.cashRunwayMonths.healthyMin,
      grossMarginHealthyPercent: value.healthThresholds.grossMarginPct.healthyMin,
      grossMarginWarningPercent: value.healthThresholds.grossMarginPct.cautionMin,
      hhiBalancedThreshold: value.healthThresholds.revenueHHI.diversifiedMax,
      hhiConcentratedThreshold: value.healthThresholds.revenueHHI.moderateMax,
      execRatioHealthyMax: value.healthThresholds.execToProdRatio.healthyMax,
      execRatioWarningMax: value.healthThresholds.execToProdRatio.cautionMax,
      breakEvenHealthyPercent: value.healthThresholds.breakEvenGapPct.surplusMin,
      breakEvenWarningPercent: value.healthThresholds.breakEvenGapPct.nearMin,
    },
    scenarioDefaults: {
      revenueTarget: value.scenario.revenueTarget.default,
      revenueTargetMin: value.scenario.revenueTarget.min,
      revenueTargetMax: value.scenario.revenueTarget.max,
      revenueTargetStep: value.scenario.revenueTarget.step,
      execAdjustment: value.scenario.execSalaryAdjustmentPct.default,
      execAdjustmentMin: value.scenario.execSalaryAdjustmentPct.min,
      execAdjustmentMax: value.scenario.execSalaryAdjustmentPct.max,
      execAdjustmentStep: value.scenario.execSalaryAdjustmentPct.step,
      productionAdjustment: value.scenario.productionCostAdjustmentPct.default,
      productionAdjustmentMin: value.scenario.productionCostAdjustmentPct.min,
      productionAdjustmentMax: value.scenario.productionCostAdjustmentPct.max,
      productionAdjustmentStep: value.scenario.productionCostAdjustmentPct.step,
      projectionMonths: value.scenario.projectionMonths,
    },
    refresh: value.refresh,
  };
}

function toApiSettings(value: DashboardSettings): ApiDashboardSettings {
  const revenueSources: ApiRevenueSourceMapping[] = value.revenueSourceMappings.map(item => ({
    label: item.source,
    keywords: item.keywords,
  }));

  return {
    revenueSources,
    costClassification: {
      fixed: {
        label: 'Fixed',
        keywords: value.costClassificationKeywords.fixed,
      },
      production: {
        label: 'Production',
        keywords: value.costClassificationKeywords.production,
      },
      onetime: {
        label: 'One-time',
        keywords: value.costClassificationKeywords.onetime,
      },
      directKeywords: value.directCostKeywords,
    },
    healthThresholds: {
      cashRunwayMonths: {
        healthyMin: value.healthThresholds.runwayWarningMonths,
        cautionMin: value.healthThresholds.runwayCriticalMonths,
      },
      grossMarginPct: {
        healthyMin: value.healthThresholds.grossMarginHealthyPercent,
        cautionMin: value.healthThresholds.grossMarginWarningPercent,
      },
      revenueHHI: {
        diversifiedMax: value.healthThresholds.hhiBalancedThreshold,
        moderateMax: value.healthThresholds.hhiConcentratedThreshold,
      },
      execToProdRatio: {
        healthyMax: value.healthThresholds.execRatioHealthyMax,
        cautionMax: value.healthThresholds.execRatioWarningMax,
      },
      breakEvenGapPct: {
        surplusMin: value.healthThresholds.breakEvenHealthyPercent,
        nearMin: value.healthThresholds.breakEvenWarningPercent,
      },
    },
    scenario: {
      revenueTarget: {
        default: value.scenarioDefaults.revenueTarget,
        min: value.scenarioDefaults.revenueTargetMin,
        max: value.scenarioDefaults.revenueTargetMax,
        step: value.scenarioDefaults.revenueTargetStep,
      },
      execSalaryAdjustmentPct: {
        default: value.scenarioDefaults.execAdjustment,
        min: value.scenarioDefaults.execAdjustmentMin,
        max: value.scenarioDefaults.execAdjustmentMax,
        step: value.scenarioDefaults.execAdjustmentStep,
      },
      productionCostAdjustmentPct: {
        default: value.scenarioDefaults.productionAdjustment,
        min: value.scenarioDefaults.productionAdjustmentMin,
        max: value.scenarioDefaults.productionAdjustmentMax,
        step: value.scenarioDefaults.productionAdjustmentStep,
      },
      projectionMonths: value.scenarioDefaults.projectionMonths,
    },
    refresh: {
      sheetId: value.refresh.sheetId,
      csvExportUrl: value.refresh.csvExportUrl,
      fallbackOpeningBalance: value.refresh.fallbackOpeningBalance,
    },
  };
}

function normalizeKeywords(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map(item => item.trim()).filter(Boolean);
  }
  if (!value) return [];
  return value
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeKeywordsWithFallback(value: string[] | string | undefined, fallback: string[]): string[] {
  const normalized = normalizeKeywords(value);
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeSettings(input: unknown): DashboardSettings {
  const fallback = createDefaultSettings();
  if (!input || typeof input !== 'object') return fallback;

  const data = input as Partial<DashboardSettings> & {
    settings?: DashboardSettings;
    data?: DashboardSettings;
  };
  const source = data.settings ?? data.data ?? data;

  return {
    revenueSourceMappings: Array.isArray(source.revenueSourceMappings)
      ? source.revenueSourceMappings
          .map(item => ({
            source: String(item?.source ?? '').trim(),
            keywords: normalizeKeywords(item?.keywords),
          }))
          .filter(item => item.source.length > 0 || item.keywords.length > 0)
      : fallback.revenueSourceMappings,
    costClassificationKeywords: {
      fixed: normalizeKeywordsWithFallback(source.costClassificationKeywords?.fixed, fallback.costClassificationKeywords.fixed),
      production: normalizeKeywordsWithFallback(source.costClassificationKeywords?.production, fallback.costClassificationKeywords.production),
      onetime: normalizeKeywordsWithFallback(source.costClassificationKeywords?.onetime, fallback.costClassificationKeywords.onetime),
    },
    directCostKeywords: normalizeKeywordsWithFallback(source.directCostKeywords, fallback.directCostKeywords),
    healthThresholds: {
      runwayCriticalMonths: Number(source.healthThresholds?.runwayCriticalMonths ?? fallback.healthThresholds.runwayCriticalMonths),
      runwayWarningMonths: Number(source.healthThresholds?.runwayWarningMonths ?? fallback.healthThresholds.runwayWarningMonths),
      grossMarginHealthyPercent: Number(source.healthThresholds?.grossMarginHealthyPercent ?? fallback.healthThresholds.grossMarginHealthyPercent),
      grossMarginWarningPercent: Number(source.healthThresholds?.grossMarginWarningPercent ?? fallback.healthThresholds.grossMarginWarningPercent),
      hhiBalancedThreshold: Number(source.healthThresholds?.hhiBalancedThreshold ?? fallback.healthThresholds.hhiBalancedThreshold),
      hhiConcentratedThreshold: Number(source.healthThresholds?.hhiConcentratedThreshold ?? fallback.healthThresholds.hhiConcentratedThreshold),
      execRatioHealthyMax: Number(source.healthThresholds?.execRatioHealthyMax ?? fallback.healthThresholds.execRatioHealthyMax),
      execRatioWarningMax: Number(source.healthThresholds?.execRatioWarningMax ?? fallback.healthThresholds.execRatioWarningMax),
      breakEvenHealthyPercent: Number(source.healthThresholds?.breakEvenHealthyPercent ?? fallback.healthThresholds.breakEvenHealthyPercent),
      breakEvenWarningPercent: Number(source.healthThresholds?.breakEvenWarningPercent ?? fallback.healthThresholds.breakEvenWarningPercent),
    },
    scenarioDefaults: {
      revenueTarget: Number(source.scenarioDefaults?.revenueTarget ?? fallback.scenarioDefaults.revenueTarget),
      revenueTargetMin: Number(source.scenarioDefaults?.revenueTargetMin ?? fallback.scenarioDefaults.revenueTargetMin),
      revenueTargetMax: Number(source.scenarioDefaults?.revenueTargetMax ?? fallback.scenarioDefaults.revenueTargetMax),
      revenueTargetStep: Number(source.scenarioDefaults?.revenueTargetStep ?? fallback.scenarioDefaults.revenueTargetStep),
      execAdjustment: Number(source.scenarioDefaults?.execAdjustment ?? fallback.scenarioDefaults.execAdjustment),
      execAdjustmentMin: Number(source.scenarioDefaults?.execAdjustmentMin ?? fallback.scenarioDefaults.execAdjustmentMin),
      execAdjustmentMax: Number(source.scenarioDefaults?.execAdjustmentMax ?? fallback.scenarioDefaults.execAdjustmentMax),
      execAdjustmentStep: Number(source.scenarioDefaults?.execAdjustmentStep ?? fallback.scenarioDefaults.execAdjustmentStep),
      productionAdjustment: Number(source.scenarioDefaults?.productionAdjustment ?? fallback.scenarioDefaults.productionAdjustment),
      productionAdjustmentMin: Number(source.scenarioDefaults?.productionAdjustmentMin ?? fallback.scenarioDefaults.productionAdjustmentMin),
      productionAdjustmentMax: Number(source.scenarioDefaults?.productionAdjustmentMax ?? fallback.scenarioDefaults.productionAdjustmentMax),
      productionAdjustmentStep: Number(source.scenarioDefaults?.productionAdjustmentStep ?? fallback.scenarioDefaults.productionAdjustmentStep),
      projectionMonths: Number(source.scenarioDefaults?.projectionMonths ?? fallback.scenarioDefaults.projectionMonths),
    },
    refresh: {
      sheetId: String(source.refresh?.sheetId ?? fallback.refresh.sheetId),
      csvExportUrl: String(source.refresh?.csvExportUrl ?? fallback.refresh.csvExportUrl),
      fallbackOpeningBalance: Number(source.refresh?.fallbackOpeningBalance ?? fallback.refresh.fallbackOpeningBalance),
    },
  };
}

function keywordListText(values: string[]): string {
  return values.join(', ');
}

function clampNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="settings-field">
      <span className="settings-label">{label}</span>
      {children}
      {help ? <span className="settings-help">{help}</span> : null}
    </label>
  );
}

export default function SettingsClient() {
  const [settings, setSettings] = useState<DashboardSettings>(createDefaultSettings);
  const [initialSnapshot, setInitialSnapshot] = useState(JSON.stringify(createDefaultSettings()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('Loading settings from /api/settings...');
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const isDirty = useMemo(() => JSON.stringify(settings) !== initialSnapshot, [settings, initialSnapshot]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setLoading(true);
      setError(null);
      setStatus('Loading settings from /api/settings...');

      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`GET /api/settings failed (${res.status})`);
        }
        const json = (await res.json()) as SettingsApiResponse;
        const apiSettings = 'settings' in json || 'data' in json ? json.settings ?? json.data : json;
        const next = normalizeSettings(fromApiSettings(apiSettings as ApiDashboardSettings));
        if (!cancelled) {
          setSettings(next);
          setInitialSnapshot(JSON.stringify(next));
          setStatus('Loaded from API');
          setLastSaved(new Date().toISOString());
        }
      } catch (err) {
        const draft = typeof window !== 'undefined' ? window.localStorage.getItem(SETTINGS_DRAFT_KEY) : null;
        let next = createDefaultSettings();
        if (draft) {
          try {
            next = normalizeSettings(JSON.parse(draft));
          } catch {
            next = createDefaultSettings();
          }
        }
        if (!cancelled) {
          setSettings(next);
          setInitialSnapshot(JSON.stringify(next));
          setError(err instanceof Error ? err.message : 'Unable to load settings');
          setStatus(draft ? 'Loaded local draft' : 'Using default settings');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    try {
      window.localStorage.setItem(SETTINGS_DRAFT_KEY, JSON.stringify(settings));
    } catch {
      // Ignore localStorage failures; API is the source of truth when available.
    }
  }, [settings, loading]);

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setStatus('Saving to /api/settings...');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: toApiSettings(settings) }),
      });

      if (!res.ok) {
        throw new Error(`POST /api/settings failed (${res.status})`);
      }

      const json = (await res.json().catch(() => null)) as SettingsApiResponse | null;
      const apiSettings = json && ('settings' in json || 'data' in json) ? json.settings ?? json.data : json;
      const next = normalizeSettings(apiSettings ? fromApiSettings(apiSettings as ApiDashboardSettings) : settings);
      setSettings(next);
      setInitialSnapshot(JSON.stringify(next));
      setLastSaved(new Date().toISOString());
      setStatus('Saved to API');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings');
      setStatus('Save failed; local draft kept');
    } finally {
      setSaving(false);
    }
  };

  const reloadSettings = async () => {
    setLoading(true);
    setStatus('Reloading settings from /api/settings...');
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`GET /api/settings failed (${res.status})`);
      }
      const json = (await res.json()) as SettingsApiResponse;
      const apiSettings = 'settings' in json || 'data' in json ? json.settings ?? json.data : json;
      const next = normalizeSettings(fromApiSettings(apiSettings as ApiDashboardSettings));
      setSettings(next);
      setInitialSnapshot(JSON.stringify(next));
      setError(null);
      setLastSaved(new Date().toISOString());
      setStatus('Reloaded from API');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reload settings');
      setStatus('Reload failed');
    } finally {
      setLoading(false);
    }
  };

  const resetDefaults = () => {
    const next = createDefaultSettings();
    setSettings(next);
    setError(null);
    setStatus('Reset to defaults');
  };

  const updateRevenueMapping = (index: number, patch: Partial<RevenueSourceMapping>) => {
    setSettings(prev => ({
      ...prev,
      revenueSourceMappings: prev.revenueSourceMappings.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      ),
    }));
  };

  const addRevenueMapping = () => {
    setSettings(prev => ({
      ...prev,
      revenueSourceMappings: [...prev.revenueSourceMappings, { source: '', keywords: [] }],
    }));
  };

  const removeRevenueMapping = (index: number) => {
    setSettings(prev => ({
      ...prev,
      revenueSourceMappings: prev.revenueSourceMappings.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const updateKeywordGroup = (group: keyof CostClassificationKeywords, value: string) => {
    setSettings(prev => ({
      ...prev,
      costClassificationKeywords: {
        ...prev.costClassificationKeywords,
        [group]: normalizeKeywords(value),
      },
    }));
  };

  const updateDirectKeywords = (value: string) => {
    setSettings(prev => ({ ...prev, directCostKeywords: normalizeKeywords(value) }));
  };

  const updateHealthThreshold = (key: keyof HealthThresholds, value: string) => {
    setSettings(prev => ({
      ...prev,
      healthThresholds: {
        ...prev.healthThresholds,
        [key]: clampNumber(value, prev.healthThresholds[key]),
      },
    }));
  };

  const updateScenario = (key: keyof ScenarioDefaults, value: string) => {
    setSettings(prev => ({
      ...prev,
      scenarioDefaults: {
        ...prev.scenarioDefaults,
        [key]: clampNumber(value, prev.scenarioDefaults[key]),
      },
    }));
  };

  const updateRefresh = (key: keyof RefreshConfig, value: string) => {
    setSettings(prev => ({
      ...prev,
      refresh: {
        ...prev.refresh,
        [key]: key === 'fallbackOpeningBalance' ? clampNumber(value, prev.refresh.fallbackOpeningBalance) : value,
      },
    }));
  };

  const sectionLinks = [
    { href: '#revenue-mappings', label: 'Revenue mappings' },
    { href: '#cost-classification', label: 'Cost classification' },
    { href: '#direct-costs', label: 'Direct cost keywords' },
    { href: '#health-thresholds', label: 'Health thresholds' },
    { href: '#scenario-defaults', label: 'Scenario defaults' },
    { href: '#refresh-source', label: 'Refresh source' },
  ];

  const payloadPreview = useMemo(
    () =>
      JSON.stringify(toApiSettings(settings), null, 2),
    [settings]
  );

  return (
    <div className="settings-page">
      <header className="settings-hero">
        <div className="settings-hero-copy">
          <div className="settings-eyebrow">Dashboard Settings</div>
          <h1>Manage rules from the browser</h1>
          <p>Edit revenue matching, cost classification, health thresholds, and scenario defaults without changing code.</p>
        </div>

        <div className="settings-toolbar">
          <Link href="/" className="settings-secondary-link">
            Back to dashboard
          </Link>
          <Link href="/backups" className="settings-secondary-link">
            Backups
          </Link>
          <button type="button" className="refresh-btn" onClick={reloadSettings} disabled={loading || saving}>
            Reload
          </button>
          <button type="button" className="backup-link" onClick={resetDefaults} disabled={loading || saving}>
            Reset defaults
          </button>
          <button type="button" className="settings-save-btn" onClick={saveSettings} disabled={loading || saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </header>

      <div className="settings-status-row" aria-live="polite">
        <span className="settings-chip">{status}</span>
        <span className={`settings-chip ${isDirty ? 'dirty' : 'clean'}`}>{isDirty ? 'Unsaved changes' : 'In sync'}</span>
        <span className="settings-chip">API: /api/settings</span>
        <span className="settings-chip">
          {lastSaved ? `Last saved ${new Date(lastSaved).toLocaleString('th-TH')}` : 'Not saved yet'}
        </span>
      </div>

      {error ? (
        <div className="warning-banner settings-warning">
          <div className="text">
            <h4>Settings notice</h4>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      <div className="settings-shell">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-card">
            <div className="settings-sidebar-title">Sections</div>
            <nav className="settings-nav">
              {sectionLinks.map(link => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="settings-sidebar-card">
            <div className="settings-sidebar-title">Saved payload</div>
            <p className="settings-help">The form posts this object to <code>/api/settings</code>.</p>
            <pre className="settings-preview">{payloadPreview}</pre>
          </div>
        </aside>

        <main className="settings-content">
          <section id="revenue-mappings" className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <h2>Revenue source mappings</h2>
                <p>Map a source name to one or more keywords that should roll up into the same revenue segment.</p>
              </div>
              <button type="button" className="settings-ghost-btn" onClick={addRevenueMapping} disabled={loading || saving}>
                Add source
              </button>
            </div>

            <div className="settings-list">
              {settings.revenueSourceMappings.map((row, index) => (
                <div key={`${row.source || 'source'}-${index}`} className="settings-list-row">
                  <div className="settings-list-row-grid">
                    <Field label="Source name" help="Shown in charts and reports.">
                      <input
                        className="settings-input"
                        value={row.source}
                        onChange={e => updateRevenueMapping(index, { source: e.target.value })}
                        placeholder="Webull"
                      />
                    </Field>
                    <Field label="Keywords" help="Comma-separated keywords or aliases.">
                      <textarea
                        className="settings-textarea"
                        rows={3}
                        value={keywordListText(row.keywords)}
                        onChange={e => updateRevenueMapping(index, { keywords: normalizeKeywords(e.target.value) })}
                        placeholder="Webull, WB, Webull Thailand"
                      />
                    </Field>
                  </div>
                  <div className="settings-row-actions">
                    <button
                      type="button"
                      className="settings-ghost-btn"
                      onClick={() => removeRevenueMapping(index)}
                      disabled={settings.revenueSourceMappings.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="cost-classification" className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <h2>Cost classification keywords</h2>
                <p>These keywords decide whether a cost is treated as fixed, production, or one-time.</p>
              </div>
            </div>

            <div className="settings-grid-3">
              <Field label="Fixed" help="Recurring overhead and subscriptions.">
                <textarea
                  className="settings-textarea"
                  rows={7}
                  value={keywordListText(settings.costClassificationKeywords.fixed)}
                  onChange={e => updateKeywordGroup('fixed', e.target.value)}
                />
              </Field>
              <Field label="Production" help="Directly tied to content or delivery.">
                <textarea
                  className="settings-textarea"
                  rows={7}
                  value={keywordListText(settings.costClassificationKeywords.production)}
                  onChange={e => updateKeywordGroup('production', e.target.value)}
                />
              </Field>
              <Field label="One-time" help="Equipment, tax, or isolated purchases.">
                <textarea
                  className="settings-textarea"
                  rows={7}
                  value={keywordListText(settings.costClassificationKeywords.onetime)}
                  onChange={e => updateKeywordGroup('onetime', e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section id="direct-costs" className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <h2>Direct cost keywords</h2>
                <p>Used for direct vs indirect split in the Video Production section.</p>
              </div>
            </div>

            <Field label="Direct cost keywords" help="Use commas or line breaks.">
              <textarea
                className="settings-textarea"
                rows={6}
                value={keywordListText(settings.directCostKeywords)}
                onChange={e => updateDirectKeywords(e.target.value)}
                placeholder="Production, ค่าจ้าง, ตัดต่อ"
              />
            </Field>
          </section>

          <section id="health-thresholds" className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <h2>Health thresholds</h2>
                <p>Controls the warning states used across Financial Health &amp; Survival cards.</p>
              </div>
            </div>

            <div className="settings-grid-4">
              <Field label="Runway critical months">
                <input
                  className="settings-input"
                  type="number"
                  value={settings.healthThresholds.runwayCriticalMonths}
                  onChange={e => updateHealthThreshold('runwayCriticalMonths', e.target.value)}
                />
              </Field>
              <Field label="Runway warning months">
                <input
                  className="settings-input"
                  type="number"
                  value={settings.healthThresholds.runwayWarningMonths}
                  onChange={e => updateHealthThreshold('runwayWarningMonths', e.target.value)}
                />
              </Field>
              <Field label="Gross margin healthy %">
                <input
                  className="settings-input"
                  type="number"
                  step="0.1"
                  value={settings.healthThresholds.grossMarginHealthyPercent}
                  onChange={e => updateHealthThreshold('grossMarginHealthyPercent', e.target.value)}
                />
              </Field>
              <Field label="Gross margin warning %">
                <input
                  className="settings-input"
                  type="number"
                  step="0.1"
                  value={settings.healthThresholds.grossMarginWarningPercent}
                  onChange={e => updateHealthThreshold('grossMarginWarningPercent', e.target.value)}
                />
              </Field>
              <Field label="HHI balanced threshold">
                <input
                  className="settings-input"
                  type="number"
                  value={settings.healthThresholds.hhiBalancedThreshold}
                  onChange={e => updateHealthThreshold('hhiBalancedThreshold', e.target.value)}
                />
              </Field>
              <Field label="HHI concentrated threshold">
                <input
                  className="settings-input"
                  type="number"
                  value={settings.healthThresholds.hhiConcentratedThreshold}
                  onChange={e => updateHealthThreshold('hhiConcentratedThreshold', e.target.value)}
                />
              </Field>
              <Field label="Exec ratio healthy max">
                <input
                  className="settings-input"
                  type="number"
                  step="0.1"
                  value={settings.healthThresholds.execRatioHealthyMax}
                  onChange={e => updateHealthThreshold('execRatioHealthyMax', e.target.value)}
                />
              </Field>
              <Field label="Exec ratio warning max">
                <input
                  className="settings-input"
                  type="number"
                  step="0.1"
                  value={settings.healthThresholds.execRatioWarningMax}
                  onChange={e => updateHealthThreshold('execRatioWarningMax', e.target.value)}
                />
              </Field>
              <Field label="Break-even healthy %">
                <input
                  className="settings-input"
                  type="number"
                  step="0.1"
                  value={settings.healthThresholds.breakEvenHealthyPercent}
                  onChange={e => updateHealthThreshold('breakEvenHealthyPercent', e.target.value)}
                />
              </Field>
              <Field label="Break-even warning %">
                <input
                  className="settings-input"
                  type="number"
                  step="0.1"
                  value={settings.healthThresholds.breakEvenWarningPercent}
                  onChange={e => updateHealthThreshold('breakEvenWarningPercent', e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section id="scenario-defaults" className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <h2>Scenario defaults and ranges</h2>
                <p>These values shape the What-If Scenario Analysis sliders and starting points.</p>
              </div>
            </div>

            <div className="settings-grid-4">
              <Field label="Monthly revenue target">
                <input
                  className="settings-input"
                  type="number"
                  step="1000"
                  value={settings.scenarioDefaults.revenueTarget}
                  onChange={e => updateScenario('revenueTarget', e.target.value)}
                />
              </Field>
              <Field label="Revenue target min">
                <input
                  className="settings-input"
                  type="number"
                  step="1000"
                  value={settings.scenarioDefaults.revenueTargetMin}
                  onChange={e => updateScenario('revenueTargetMin', e.target.value)}
                />
              </Field>
              <Field label="Revenue target max">
                <input
                  className="settings-input"
                  type="number"
                  step="1000"
                  value={settings.scenarioDefaults.revenueTargetMax}
                  onChange={e => updateScenario('revenueTargetMax', e.target.value)}
                />
              </Field>
              <Field label="Revenue target step">
                <input
                  className="settings-input"
                  type="number"
                  step="100"
                  value={settings.scenarioDefaults.revenueTargetStep}
                  onChange={e => updateScenario('revenueTargetStep', e.target.value)}
                />
              </Field>
              <Field label="Exec adjustment default">
                <input
                  className="settings-input"
                  type="number"
                  value={settings.scenarioDefaults.execAdjustment}
                  onChange={e => updateScenario('execAdjustment', e.target.value)}
                />
              </Field>
              <Field label="Exec adjustment min">
                <input
                  className="settings-input"
                  type="number"
                  value={settings.scenarioDefaults.execAdjustmentMin}
                  onChange={e => updateScenario('execAdjustmentMin', e.target.value)}
                />
              </Field>
              <Field label="Exec adjustment max">
                <input
                  className="settings-input"
                  type="number"
                  value={settings.scenarioDefaults.execAdjustmentMax}
                  onChange={e => updateScenario('execAdjustmentMax', e.target.value)}
                />
              </Field>
              <Field label="Exec adjustment step">
                <input
                  className="settings-input"
                  type="number"
                  value={settings.scenarioDefaults.execAdjustmentStep}
                  onChange={e => updateScenario('execAdjustmentStep', e.target.value)}
                />
              </Field>
              <Field label="Production adjustment default">
                <input
                  className="settings-input"
                  type="number"
                  value={settings.scenarioDefaults.productionAdjustment}
                  onChange={e => updateScenario('productionAdjustment', e.target.value)}
                />
              </Field>
              <Field label="Production adjustment min">
                <input
                  className="settings-input"
                  type="number"
                  value={settings.scenarioDefaults.productionAdjustmentMin}
                  onChange={e => updateScenario('productionAdjustmentMin', e.target.value)}
                />
              </Field>
              <Field label="Production adjustment max">
                <input
                  className="settings-input"
                  type="number"
                  value={settings.scenarioDefaults.productionAdjustmentMax}
                  onChange={e => updateScenario('productionAdjustmentMax', e.target.value)}
                />
              </Field>
              <Field label="Production adjustment step">
                <input
                  className="settings-input"
                  type="number"
                  value={settings.scenarioDefaults.productionAdjustmentStep}
                  onChange={e => updateScenario('productionAdjustmentStep', e.target.value)}
                />
              </Field>
              <Field label="Projection months">
                <input
                  className="settings-input"
                  type="number"
                  value={settings.scenarioDefaults.projectionMonths}
                  onChange={e => updateScenario('projectionMonths', e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section id="refresh-source" className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <h2>Refresh source</h2>
                <p>These values control which Google Sheet the Refresh button reads from.</p>
              </div>
            </div>

            <div className="settings-grid-3">
              <Field label="Google Sheet ID">
                <input
                  className="settings-input"
                  value={settings.refresh.sheetId}
                  onChange={e => updateRefresh('sheetId', e.target.value)}
                />
              </Field>
              <Field label="CSV export URL">
                <input
                  className="settings-input"
                  value={settings.refresh.csvExportUrl}
                  onChange={e => updateRefresh('csvExportUrl', e.target.value)}
                />
              </Field>
              <Field label="Fallback opening balance">
                <input
                  className="settings-input"
                  type="number"
                  step="0.01"
                  value={settings.refresh.fallbackOpeningBalance}
                  onChange={e => updateRefresh('fallbackOpeningBalance', e.target.value)}
                />
              </Field>
            </div>
          </section>

          <div className="settings-footer">
            <div className="settings-footer-note">
              Changes are posted to <code>/api/settings</code>. If the endpoint is unavailable, the draft stays in the browser.
            </div>
            <button type="button" className="settings-save-btn" onClick={saveSettings} disabled={loading || saving}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
