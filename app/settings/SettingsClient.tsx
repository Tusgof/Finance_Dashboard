'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DashboardSettings } from '@/lib/types';
import { DEFAULT_DASHBOARD_SETTINGS } from '@/lib/settingsDefaults';

type SettingsApiResponse =
  | DashboardSettings
  | { settings?: DashboardSettings; data?: DashboardSettings; updatedAt?: string; message?: string };

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

  const updateCashSignal = (
    section: 'cashRunwayMonths' | 'revenueDropRatio',
    key: 'healthyMin' | 'cautionMin' | 'warningMax',
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
            : {
                ...prev.healthThresholds.revenueDropRatio,
                [key]: num(value, (prev.healthThresholds.revenueDropRatio as Record<string, number>)[key]),
              },
      },
    }));
  };

  const updateBullScenario = (key: 'bullMonthlyCash' | 'bullCreditTermMonths', value: string) => {
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

  return (
    <div className="settings-page">
      <header className="settings-hero">
        <div className="settings-hero-copy">
          <div className="settings-eyebrow">Dashboard Settings</div>
          <h1>Lean controls for cash and scenario decisions</h1>
          <p>Only the inputs that change live cash alerts, scenario balance, or refresh source stay editable here.</p>
        </div>

        <div className="settings-toolbar">
          <Link href="/" className="settings-secondary-link">Back to dashboard</Link>
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

      <div className="settings-content">
        <section className="settings-panel">
          <div className="settings-panel-header">
            <div>
              <h2>Refresh source</h2>
              <p>These values keep the dashboard pointed at the right sheet and local support files.</p>
            </div>
          </div>

          <div className="settings-grid-3">
            <Field label="Google Sheet ID">
              <input className="settings-input" value={settings.refresh.sheetId} onChange={e => updateRefresh('sheetId', e.target.value)} />
            </Field>
            <Field label="CSV export URL">
              <input className="settings-input" value={settings.refresh.csvExportUrl} onChange={e => updateRefresh('csvExportUrl', e.target.value)} />
            </Field>
            <Field label="Opening balance">
              <input className="settings-input" type="number" step="0.01" value={settings.refresh.fallbackOpeningBalance} onChange={e => updateRefresh('fallbackOpeningBalance', e.target.value)} />
            </Field>
            <Field label="Production summary path">
              <input className="settings-input" value={settings.refresh.productionSummaryPath} onChange={e => updateRefresh('productionSummaryPath', e.target.value)} />
            </Field>
            <Field label="Sponsor pipeline path">
              <input className="settings-input" value={settings.refresh.sponsorPipelinePath} onChange={e => updateRefresh('sponsorPipelinePath', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="settings-panel">
          <div className="settings-panel-header">
            <div>
              <h2>Cash signals</h2>
              <p>These thresholds drive the runway tone and the revenue-drop warning on the cash page.</p>
            </div>
          </div>

          <div className="settings-grid-3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <Field label="Runway healthy months">
              <input className="settings-input" type="number" value={settings.healthThresholds.cashRunwayMonths.healthyMin} onChange={e => updateCashSignal('cashRunwayMonths', 'healthyMin', e.target.value)} />
            </Field>
            <Field label="Runway caution months">
              <input className="settings-input" type="number" value={settings.healthThresholds.cashRunwayMonths.cautionMin} onChange={e => updateCashSignal('cashRunwayMonths', 'cautionMin', e.target.value)} />
            </Field>
            <Field label="Revenue drop warning %">
              <input className="settings-input" type="number" step="0.1" value={settings.healthThresholds.revenueDropRatio.warningMax} onChange={e => updateCashSignal('revenueDropRatio', 'warningMax', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="settings-panel">
          <div className="settings-panel-header">
            <div>
              <h2>Bull scenario</h2>
              <p>Only the Bull path inputs remain editable because they change the scenario projection and preview.</p>
            </div>
          </div>

          <div className="settings-grid-3" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <Field label="Bull monthly cash">
              <input className="settings-input" type="number" step="1000" value={settings.scenario.bullMonthlyCash} onChange={e => updateBullScenario('bullMonthlyCash', e.target.value)} />
            </Field>
            <Field label="Bull credit term months">
              <input className="settings-input" type="number" step="1" value={settings.scenario.bullCreditTermMonths} onChange={e => updateBullScenario('bullCreditTermMonths', e.target.value)} />
            </Field>
          </div>
        </section>

        <div className="settings-footer">
          <div className="settings-footer-note">Only cash, scenario, and refresh settings are editable here. Everything else stays at the default saved schema.</div>
          <button type="button" className="settings-save-btn" onClick={() => persist(settings, 'Saving...')} disabled={loading || saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
