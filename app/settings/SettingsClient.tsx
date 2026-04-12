'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DashboardSettings, RevenueSourceMapping } from '@/lib/types';
import { DEFAULT_DASHBOARD_SETTINGS } from '@/lib/settingsDefaults';

type SettingsApiResponse =
  | DashboardSettings
  | { settings?: DashboardSettings; data?: DashboardSettings; updatedAt?: string; message?: string };

function splitList(value: string): string[] {
  return value.split(/[\n,]/).map(item => item.trim()).filter(Boolean);
}

function joinList(value: string[]): string {
  return value.join(', ');
}

function num(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="settings-field">
      <span className="settings-label">{label}</span>
      {children}
      {help ? <span className="settings-help">{help}</span> : null}
    </label>
  );
}

function normalizeResponse(payload: SettingsApiResponse | null): DashboardSettings {
  if (!payload) return DEFAULT_DASHBOARD_SETTINGS;
  if ('settings' in payload || 'data' in payload) {
    return (payload.settings ?? payload.data ?? DEFAULT_DASHBOARD_SETTINGS) as DashboardSettings;
  }
  return payload as DashboardSettings;
}

export default function SettingsClient() {
  const [settings, setSettings] = useState(DEFAULT_DASHBOARD_SETTINGS);
  const [initialSnapshot, setInitialSnapshot] = useState(JSON.stringify(DEFAULT_DASHBOARD_SETTINGS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('Loading settings...');
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const isDirty = useMemo(() => JSON.stringify(settings) !== initialSnapshot, [settings, initialSnapshot]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        if (!res.ok) throw new Error(`GET /api/settings failed (${res.status})`);
        const payload = normalizeResponse((await res.json()) as SettingsApiResponse);
        if (cancelled) return;
        setSettings(payload);
        setInitialSnapshot(JSON.stringify(payload));
        setLastSaved(new Date().toISOString());
        setStatus('Loaded from API');
      } catch (err) {
        if (cancelled) return;
        setSettings(DEFAULT_DASHBOARD_SETTINGS);
        setInitialSnapshot(JSON.stringify(DEFAULT_DASHBOARD_SETTINGS));
        setError(err instanceof Error ? err.message : 'Unable to load settings');
        setStatus('Using defaults');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = async (nextSettings: DashboardSettings, nextStatus: string) => {
    setSaving(true);
    setError(null);
    setStatus(nextStatus);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: nextSettings }),
      });
      if (!res.ok) throw new Error(`POST /api/settings failed (${res.status})`);
      const payload = normalizeResponse((await res.json().catch(() => null)) as SettingsApiResponse | null);
      setSettings(payload);
      setInitialSnapshot(JSON.stringify(payload));
      setLastSaved(new Date().toISOString());
      setStatus('Saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings');
      setStatus('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const reloadSettings = async () => {
    setLoading(true);
    setStatus('Reloading...');
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (!res.ok) throw new Error(`GET /api/settings failed (${res.status})`);
      const payload = normalizeResponse((await res.json()) as SettingsApiResponse);
      setSettings(payload);
      setInitialSnapshot(JSON.stringify(payload));
      setLastSaved(new Date().toISOString());
      setError(null);
      setStatus('Reloaded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reload settings');
      setStatus('Reload failed');
    } finally {
      setLoading(false);
    }
  };

  const resetDefaults = () => {
    setSettings(DEFAULT_DASHBOARD_SETTINGS);
    setInitialSnapshot(JSON.stringify(DEFAULT_DASHBOARD_SETTINGS));
    setError(null);
    setStatus('Reset to defaults');
  };

  const updateRevenue = (index: number, patch: Partial<RevenueSourceMapping>) => {
    setSettings(prev => ({
      ...prev,
      revenueSources: prev.revenueSources.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  const updateCostList = (
    key: 'fixed' | 'production' | 'onetime' | 'directKeywords' | 'peopleCostKeywords',
    value: string
  ) => {
    setSettings(prev => ({
      ...prev,
      costClassification: {
        ...prev.costClassification,
        [key]:
          key === 'fixed' || key === 'production' || key === 'onetime'
            ? { ...prev.costClassification[key], keywords: splitList(value) }
            : splitList(value),
      },
    }));
  };

  const updateThreshold = (
    section: 'cashRunwayMonths' | 'grossMarginPct' | 'revenueHHI' | 'revenueDropRatio' | 'headcountCostRatio' | 'execToProdRatio' | 'breakEvenGapPct',
    key: string,
    value: string
  ) => {
    setSettings(prev => ({
      ...prev,
      healthThresholds: {
        ...prev.healthThresholds,
        [section]:
          section === 'cashRunwayMonths'
            ? {
                ...prev.healthThresholds.cashRunwayMonths,
                [key]: num(value, (prev.healthThresholds.cashRunwayMonths as Record<string, number>)[key]),
              }
            : section === 'grossMarginPct'
              ? {
                  ...prev.healthThresholds.grossMarginPct,
                  [key]: num(value, (prev.healthThresholds.grossMarginPct as Record<string, number>)[key]),
                }
              : section === 'revenueHHI'
                ? {
                    ...prev.healthThresholds.revenueHHI,
                    [key]: num(value, (prev.healthThresholds.revenueHHI as Record<string, number>)[key]),
                  }
                : section === 'revenueDropRatio'
                  ? {
                      ...prev.healthThresholds.revenueDropRatio,
                      [key]: num(value, (prev.healthThresholds.revenueDropRatio as Record<string, number>)[key]),
                    }
                  : section === 'headcountCostRatio'
                    ? {
                        ...prev.healthThresholds.headcountCostRatio,
                        [key]: num(value, (prev.healthThresholds.headcountCostRatio as Record<string, number>)[key]),
                      }
                    : section === 'execToProdRatio'
                      ? {
                          ...prev.healthThresholds.execToProdRatio,
                          [key]: num(value, (prev.healthThresholds.execToProdRatio as Record<string, number>)[key]),
                        }
                      : {
                          ...prev.healthThresholds.breakEvenGapPct,
                          [key]: num(value, (prev.healthThresholds.breakEvenGapPct as Record<string, number>)[key]),
                        },
      },
    }));
  };

  const updateScenarioRange = (
    section: 'revenueTarget' | 'execSalaryAdjustmentPct' | 'productionCostAdjustmentPct' | 'variableCostReductionPct' | 'newDealRevenue',
    key: 'default' | 'min' | 'max' | 'step',
    value: string
  ) => {
    setSettings(prev => ({
      ...prev,
      scenario: {
        ...prev.scenario,
        [section]: {
          ...prev.scenario[section],
          [key]: num(value, prev.scenario[section][key]),
        },
      },
    }));
  };

  const updateScenarioNumber = (
    key: 'bestCaseRevenueLiftPct' | 'worstCaseRevenueHaircutPct' | 'projectionMonths' | 'breakEvenLookbackMonths' | 'runwayLookbackMonths',
    value: string
  ) => {
    setSettings(prev => ({
      ...prev,
      scenario: {
        ...prev.scenario,
        [key]: num(value, prev.scenario[key]),
      },
    }));
  };

  const updateRefresh = (key: keyof DashboardSettings['refresh'], value: string) => {
    setSettings(prev => ({
      ...prev,
      refresh: {
        ...prev.refresh,
        [key]: key === 'fallbackOpeningBalance' ? num(value, prev.refresh.fallbackOpeningBalance) : value,
      },
    }));
  };

  const payloadPreview = useMemo(() => JSON.stringify(settings, null, 2), [settings]);

  const sectionLinks = [
    { href: '#revenue-mappings', label: 'Revenue mappings' },
    { href: '#cost-classification', label: 'Cost keywords' },
    { href: '#management-thresholds', label: 'Management thresholds' },
    { href: '#scenario-defaults', label: 'Scenario assumptions' },
    { href: '#refresh-source', label: 'Refresh source' },
  ];

  return (
    <div className="settings-page">
      <header className="settings-hero">
        <div className="settings-hero-copy">
          <div className="settings-eyebrow">Dashboard Settings</div>
          <h1>Practical rules, editable in one place</h1>
          <p>Keep the dashboard driven by transaction data while editing the mappings, thresholds, and source assumptions from the browser.</p>
        </div>

        <div className="settings-toolbar">
          <Link href="/" className="settings-secondary-link">Back to dashboard</Link>
          <Link href="/backups" className="settings-secondary-link">Backups</Link>
          <button type="button" className="refresh-btn" onClick={reloadSettings} disabled={loading || saving}>Reload</button>
          <button type="button" className="backup-link" onClick={resetDefaults} disabled={loading || saving}>Reset defaults</button>
          <button type="button" className="settings-save-btn" onClick={() => persist(settings, 'Saving...')} disabled={loading || saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </header>

      <div className="settings-status-row" aria-live="polite">
        <span className="settings-chip">{status}</span>
        <span className={`settings-chip ${isDirty ? 'dirty' : 'clean'}`}>{isDirty ? 'Unsaved changes' : 'In sync'}</span>
        <span className="settings-chip">API: /api/settings</span>
        <span className="settings-chip">{lastSaved ? `Last saved ${new Date(lastSaved).toLocaleString('th-TH')}` : 'Not saved yet'}</span>
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
                <a key={link.href} href={link.href}>{link.label}</a>
              ))}
            </nav>
          </div>

          <div className="settings-sidebar-card">
            <div className="settings-sidebar-title">Payload preview</div>
            <p className="settings-help">This is the object saved to <code>/api/settings</code>.</p>
            <pre className="settings-preview">{payloadPreview}</pre>
          </div>
        </aside>

        <main className="settings-content">
          <section id="revenue-mappings" className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <h2>Revenue mappings</h2>
                <p>Map sponsor or revenue source names to the labels used in the dashboard.</p>
              </div>
            </div>

            <div className="settings-list">
              {settings.revenueSources.map((row, index) => (
                <div key={`${row.label || 'source'}-${index}`} className="settings-list-row">
                  <div className="settings-list-row-grid">
                    <Field label="Source label">
                      <input className="settings-input" value={row.label} onChange={e => updateRevenue(index, { label: e.target.value })} />
                    </Field>
                    <Field label="Keywords">
                      <textarea className="settings-textarea" rows={3} value={joinList(row.keywords)} onChange={e => updateRevenue(index, { keywords: splitList(e.target.value) })} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="cost-classification" className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <h2>Cost keywords</h2>
                <p>These keywords drive fixed, production, one-time, and people-cost splits.</p>
              </div>
            </div>

            <div className="settings-grid-3">
              <Field label="Fixed costs"><textarea className="settings-textarea" rows={7} value={joinList(settings.costClassification.fixed.keywords)} onChange={e => updateCostList('fixed', e.target.value)} /></Field>
              <Field label="Production costs"><textarea className="settings-textarea" rows={7} value={joinList(settings.costClassification.production.keywords)} onChange={e => updateCostList('production', e.target.value)} /></Field>
              <Field label="One-time costs"><textarea className="settings-textarea" rows={7} value={joinList(settings.costClassification.onetime.keywords)} onChange={e => updateCostList('onetime', e.target.value)} /></Field>
            </div>

            <div className="settings-grid-3" style={{ marginTop: 14 }}>
              <Field label="Direct cost keywords" help="Used by the video production direct/indirect split.">
                <textarea className="settings-textarea" rows={5} value={joinList(settings.costClassification.directKeywords)} onChange={e => updateCostList('directKeywords', e.target.value)} />
              </Field>
              <Field label="People cost keywords" help="Used for headcount cost ratio.">
                <textarea className="settings-textarea" rows={5} value={joinList(settings.costClassification.peopleCostKeywords)} onChange={e => updateCostList('peopleCostKeywords', e.target.value)} />
              </Field>
            </div>
          </section>

          <section id="management-thresholds" className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <h2>Management thresholds</h2>
                <p>Controls the warning states shown in the health cards and trend indicators.</p>
              </div>
            </div>

            <div className="settings-grid-4">
              <Field label="Runway healthy months"><input className="settings-input" type="number" value={settings.healthThresholds.cashRunwayMonths.healthyMin} onChange={e => updateThreshold('cashRunwayMonths', 'healthyMin', e.target.value)} /></Field>
              <Field label="Runway caution months"><input className="settings-input" type="number" value={settings.healthThresholds.cashRunwayMonths.cautionMin} onChange={e => updateThreshold('cashRunwayMonths', 'cautionMin', e.target.value)} /></Field>
              <Field label="Gross margin healthy %"><input className="settings-input" type="number" step="0.1" value={settings.healthThresholds.grossMarginPct.healthyMin} onChange={e => updateThreshold('grossMarginPct', 'healthyMin', e.target.value)} /></Field>
              <Field label="Gross margin caution %"><input className="settings-input" type="number" step="0.1" value={settings.healthThresholds.grossMarginPct.cautionMin} onChange={e => updateThreshold('grossMarginPct', 'cautionMin', e.target.value)} /></Field>
              <Field label="HHI diversified max"><input className="settings-input" type="number" value={settings.healthThresholds.revenueHHI.diversifiedMax} onChange={e => updateThreshold('revenueHHI', 'diversifiedMax', e.target.value)} /></Field>
              <Field label="HHI concentrated max"><input className="settings-input" type="number" value={settings.healthThresholds.revenueHHI.moderateMax} onChange={e => updateThreshold('revenueHHI', 'moderateMax', e.target.value)} /></Field>
              <Field label="Revenue drop warning %"><input className="settings-input" type="number" step="0.1" value={settings.healthThresholds.revenueDropRatio.warningMax} onChange={e => updateThreshold('revenueDropRatio', 'warningMax', e.target.value)} /></Field>
              <Field label="Headcount healthy max"><input className="settings-input" type="number" step="0.1" value={settings.healthThresholds.headcountCostRatio.healthyMax} onChange={e => updateThreshold('headcountCostRatio', 'healthyMax', e.target.value)} /></Field>
              <Field label="Headcount caution max"><input className="settings-input" type="number" step="0.1" value={settings.healthThresholds.headcountCostRatio.cautionMax} onChange={e => updateThreshold('headcountCostRatio', 'cautionMax', e.target.value)} /></Field>
              <Field label="Exec:Prod healthy max"><input className="settings-input" type="number" step="0.1" value={settings.healthThresholds.execToProdRatio.healthyMax} onChange={e => updateThreshold('execToProdRatio', 'healthyMax', e.target.value)} /></Field>
              <Field label="Exec:Prod caution max"><input className="settings-input" type="number" step="0.1" value={settings.healthThresholds.execToProdRatio.cautionMax} onChange={e => updateThreshold('execToProdRatio', 'cautionMax', e.target.value)} /></Field>
              <Field label="Break-even surplus min"><input className="settings-input" type="number" step="0.1" value={settings.healthThresholds.breakEvenGapPct.surplusMin} onChange={e => updateThreshold('breakEvenGapPct', 'surplusMin', e.target.value)} /></Field>
              <Field label="Break-even near min"><input className="settings-input" type="number" step="0.1" value={settings.healthThresholds.breakEvenGapPct.nearMin} onChange={e => updateThreshold('breakEvenGapPct', 'nearMin', e.target.value)} /></Field>
            </div>
          </section>

          <section id="scenario-defaults" className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <h2>Scenario assumptions</h2>
                <p>These values drive the What-If Scenario Analysis sliders and forecast defaults.</p>
              </div>
            </div>

            <div className="settings-grid-4">
              <Field label="Revenue target default"><input className="settings-input" type="number" step="1000" value={settings.scenario.revenueTarget.default} onChange={e => updateScenarioRange('revenueTarget', 'default', e.target.value)} /></Field>
              <Field label="Revenue target min"><input className="settings-input" type="number" step="1000" value={settings.scenario.revenueTarget.min} onChange={e => updateScenarioRange('revenueTarget', 'min', e.target.value)} /></Field>
              <Field label="Revenue target max"><input className="settings-input" type="number" step="1000" value={settings.scenario.revenueTarget.max} onChange={e => updateScenarioRange('revenueTarget', 'max', e.target.value)} /></Field>
              <Field label="Revenue target step"><input className="settings-input" type="number" step="100" value={settings.scenario.revenueTarget.step} onChange={e => updateScenarioRange('revenueTarget', 'step', e.target.value)} /></Field>
              <Field label="Exec adjustment default"><input className="settings-input" type="number" step="1" value={settings.scenario.execSalaryAdjustmentPct.default} onChange={e => updateScenarioRange('execSalaryAdjustmentPct', 'default', e.target.value)} /></Field>
              <Field label="Exec adjustment min"><input className="settings-input" type="number" step="1" value={settings.scenario.execSalaryAdjustmentPct.min} onChange={e => updateScenarioRange('execSalaryAdjustmentPct', 'min', e.target.value)} /></Field>
              <Field label="Exec adjustment max"><input className="settings-input" type="number" step="1" value={settings.scenario.execSalaryAdjustmentPct.max} onChange={e => updateScenarioRange('execSalaryAdjustmentPct', 'max', e.target.value)} /></Field>
              <Field label="Exec adjustment step"><input className="settings-input" type="number" step="1" value={settings.scenario.execSalaryAdjustmentPct.step} onChange={e => updateScenarioRange('execSalaryAdjustmentPct', 'step', e.target.value)} /></Field>
              <Field label="Prod adjustment default"><input className="settings-input" type="number" step="1" value={settings.scenario.productionCostAdjustmentPct.default} onChange={e => updateScenarioRange('productionCostAdjustmentPct', 'default', e.target.value)} /></Field>
              <Field label="Prod adjustment min"><input className="settings-input" type="number" step="1" value={settings.scenario.productionCostAdjustmentPct.min} onChange={e => updateScenarioRange('productionCostAdjustmentPct', 'min', e.target.value)} /></Field>
              <Field label="Prod adjustment max"><input className="settings-input" type="number" step="1" value={settings.scenario.productionCostAdjustmentPct.max} onChange={e => updateScenarioRange('productionCostAdjustmentPct', 'max', e.target.value)} /></Field>
              <Field label="Prod adjustment step"><input className="settings-input" type="number" step="1" value={settings.scenario.productionCostAdjustmentPct.step} onChange={e => updateScenarioRange('productionCostAdjustmentPct', 'step', e.target.value)} /></Field>
              <Field label="Variable reduction default"><input className="settings-input" type="number" value={settings.scenario.variableCostReductionPct.default} onChange={e => updateScenarioRange('variableCostReductionPct', 'default', e.target.value)} /></Field>
              <Field label="Variable reduction min"><input className="settings-input" type="number" value={settings.scenario.variableCostReductionPct.min} onChange={e => updateScenarioRange('variableCostReductionPct', 'min', e.target.value)} /></Field>
              <Field label="Variable reduction max"><input className="settings-input" type="number" value={settings.scenario.variableCostReductionPct.max} onChange={e => updateScenarioRange('variableCostReductionPct', 'max', e.target.value)} /></Field>
              <Field label="Variable reduction step"><input className="settings-input" type="number" value={settings.scenario.variableCostReductionPct.step} onChange={e => updateScenarioRange('variableCostReductionPct', 'step', e.target.value)} /></Field>
              <Field label="New deal revenue default"><input className="settings-input" type="number" step="1000" value={settings.scenario.newDealRevenue.default} onChange={e => updateScenarioRange('newDealRevenue', 'default', e.target.value)} /></Field>
              <Field label="New deal revenue min"><input className="settings-input" type="number" step="1000" value={settings.scenario.newDealRevenue.min} onChange={e => updateScenarioRange('newDealRevenue', 'min', e.target.value)} /></Field>
              <Field label="New deal revenue max"><input className="settings-input" type="number" step="1000" value={settings.scenario.newDealRevenue.max} onChange={e => updateScenarioRange('newDealRevenue', 'max', e.target.value)} /></Field>
              <Field label="New deal revenue step"><input className="settings-input" type="number" step="100" value={settings.scenario.newDealRevenue.step} onChange={e => updateScenarioRange('newDealRevenue', 'step', e.target.value)} /></Field>
              <Field label="Best case lift %"><input className="settings-input" type="number" step="1" value={settings.scenario.bestCaseRevenueLiftPct} onChange={e => updateScenarioNumber('bestCaseRevenueLiftPct', e.target.value)} /></Field>
              <Field label="Worst case haircut %"><input className="settings-input" type="number" step="1" value={settings.scenario.worstCaseRevenueHaircutPct} onChange={e => updateScenarioNumber('worstCaseRevenueHaircutPct', e.target.value)} /></Field>
              <Field label="Projection months"><input className="settings-input" type="number" step="1" value={settings.scenario.projectionMonths} onChange={e => updateScenarioNumber('projectionMonths', e.target.value)} /></Field>
              <Field label="Break-even lookback months"><input className="settings-input" type="number" step="1" value={settings.scenario.breakEvenLookbackMonths} onChange={e => updateScenarioNumber('breakEvenLookbackMonths', e.target.value)} /></Field>
              <Field label="Runway lookback months"><input className="settings-input" type="number" step="1" value={settings.scenario.runwayLookbackMonths} onChange={e => updateScenarioNumber('runwayLookbackMonths', e.target.value)} /></Field>
            </div>
          </section>

          <section id="refresh-source" className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <h2>Refresh source</h2>
                <p>These values control which Google Sheet and supporting files the refresh endpoint uses.</p>
              </div>
            </div>

            <div className="settings-grid-3">
              <Field label="Google Sheet ID"><input className="settings-input" value={settings.refresh.sheetId} onChange={e => updateRefresh('sheetId', e.target.value)} /></Field>
              <Field label="CSV export URL"><input className="settings-input" value={settings.refresh.csvExportUrl} onChange={e => updateRefresh('csvExportUrl', e.target.value)} /></Field>
              <Field label="Opening balance"><input className="settings-input" type="number" step="0.01" value={settings.refresh.fallbackOpeningBalance} onChange={e => updateRefresh('fallbackOpeningBalance', e.target.value)} /></Field>
              <Field label="Production summary path"><input className="settings-input" value={settings.refresh.productionSummaryPath} onChange={e => updateRefresh('productionSummaryPath', e.target.value)} /></Field>
              <Field label="Sponsor pipeline path"><input className="settings-input" value={settings.refresh.sponsorPipelinePath} onChange={e => updateRefresh('sponsorPipelinePath', e.target.value)} /></Field>
            </div>
          </section>

          <div className="settings-footer">
            <div className="settings-footer-note">Changes are posted to <code>/api/settings</code>. The refresh route reads from the saved settings file.</div>
            <button type="button" className="settings-save-btn" onClick={() => persist(settings, 'Saving...')} disabled={loading || saving}>{saving ? 'Saving...' : 'Save settings'}</button>
          </div>
        </main>
      </div>
    </div>
  );
}


