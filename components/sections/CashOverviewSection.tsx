'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboard } from '../DashboardContext';
import CashFlowChart from '../charts/CashFlowChart';
import { DEFAULT_DASHBOARD_SETTINGS, fmt, loadDashboardSettings } from '@/lib/dataUtils';
import { buildScenarioProjection, calculateCashRunway, getCashAlerts, getCurrentCash, normalizeTransactions, type ScenarioProjectionRow } from '@/lib/dashboardMetrics';

type ScenarioCaseKey = 'base' | 'bull' | 'bear';

function money(value: number): string {
  return `THB ${fmt(value)}`;
}

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(new Date(`${month}-01`));
}

function firstNegativeMonth(projection: ScenarioProjectionRow[], key: ScenarioCaseKey): string {
  const field = `${key}Balance` as const;
  const month = projection.find(row => row[field] !== null && row[field] < 0)?.month;
  return month ? monthLabel(month) : 'No negative month';
}

export default function CashOverviewSection() {
  const { rawData, openingBalance } = useDashboard();
  const [settings, setSettings] = useState(DEFAULT_DASHBOARD_SETTINGS);

  useEffect(() => {
    let active = true;
    void loadDashboardSettings().then(next => {
      if (active) setSettings(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const normalized = useMemo(() => normalizeTransactions(rawData, settings), [rawData, settings]);
  const currentCash = getCurrentCash(normalized, openingBalance);
  const runway = calculateCashRunway(normalized, openingBalance, settings);
  const alerts = getCashAlerts(normalized, openingBalance, settings);
  const scenarioProjection = useMemo(
    () => buildScenarioProjection(normalized, openingBalance, settings).filter(row => row.baseBalance !== null),
    [normalized, openingBalance, settings]
  );
  const scenarioLatest = scenarioProjection.at(-1);
  const scenarioStartingCash =
    scenarioProjection[0]?.baseBalance !== null && scenarioProjection[0]?.baseBalance !== undefined
      ? scenarioProjection[0].baseBalance - scenarioProjection[0].baseNet
      : currentCash;
  const bullMonthlyCashLabel = `THB ${settings.scenario.bullMonthlyCash.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const bullCreditTermMonths = settings.scenario.bullCreditTermMonths;

  const runwayTone =
    !Number.isFinite(runway) || runway >= settings.healthThresholds.cashRunwayMonths.healthyMin
      ? 'green'
      : runway >= settings.healthThresholds.cashRunwayMonths.cautionMin
        ? 'amber'
        : 'red';

  const alertCards = [
    {
      label: 'Cash Runway',
      active: alerts.runwayLow,
      text: alerts.runwayLow ? 'Cash runway is below the caution threshold.' : 'Cash runway is above the danger zone.',
    },
    {
      label: 'Monthly Loss',
      active: alerts.monthlyLoss,
      text: alerts.monthlyLoss ? 'Latest work month is running at a loss.' : 'Latest work month is not loss-making.',
    },
    {
      label: 'Revenue Drop',
      active: alerts.revenueDrop,
      text: alerts.revenueDrop ? 'Revenue dropped by more than 50% threshold.' : 'Revenue has not dropped beyond the warning threshold.',
    },
  ];

  const activeAlertCount = alertCards.filter(item => item.active).length;
  const pressureTone = activeAlertCount === 0 ? 'green' : activeAlertCount === 1 ? 'amber' : 'red';
  const pressureLabel = activeAlertCount === 0 ? 'Clear' : activeAlertCount === 1 ? 'Watch' : 'Attention';
  const pressureNote = activeAlertCount === 0 ? 'Signals are quiet' : `${activeAlertCount} of 3 signals need review`;
  const scenarioCases = [
    {
      key: 'base' as const,
      label: 'Base',
      balance: scenarioLatest?.baseBalance ?? scenarioStartingCash,
      cue: firstNegativeMonth(scenarioProjection, 'base'),
      tone: 'amber',
    },
    {
      key: 'bull' as const,
      label: 'Bull',
      balance: scenarioLatest?.bullBalance ?? scenarioStartingCash,
      cue: scenarioLatest ? `+${bullMonthlyCashLabel}/mo after ${bullCreditTermMonths} mo` : `+${bullMonthlyCashLabel}/mo`,
      tone: 'green',
    },
    {
      key: 'bear' as const,
      label: 'Bear',
      balance: scenarioLatest?.bearBalance ?? scenarioStartingCash,
      cue: firstNegativeMonth(scenarioProjection, 'bear'),
      tone: 'red',
    },
  ];

  return (
    <div className="page-stack">
      <div className="cash-overview-band">
        <div className="cash-overview-copy">
          <div className="section-eyebrow">Cash truth</div>
          <div className="cash-overview-title">Weekly and monthly read</div>
          <div className="cash-overview-subtitle">Weekly: current cash and runway. Monthly: the trend chart and active signals.</div>
        </div>

        <div className="cash-summary-grid">
          <div className="cash-summary-card">
            <div className="cash-summary-label">Current Cash</div>
            <div className="cash-summary-value">THB {fmt(currentCash)}</div>
            <div className="cash-summary-note">Latest actual balance</div>
          </div>

          <div className="cash-summary-card">
            <div className="cash-summary-label">Cash Runway</div>
            <div className="cash-summary-value" style={{ color: `var(--accent-${runwayTone})` }}>
              {Number.isFinite(runway) ? `${runway.toFixed(1)} mo` : 'Infinite'}
            </div>
            <div className="cash-summary-note">Based on recent actual deficit months</div>
          </div>

          <div className="cash-summary-card">
            <div className="cash-summary-label">Pressure</div>
            <div className="cash-summary-value" style={{ color: `var(--accent-${pressureTone})` }}>
              {pressureLabel}
            </div>
            <div className="cash-summary-note">{pressureNote}</div>
          </div>
        </div>
      </div>

      <div className="cash-signal-strip" aria-label="Cash signals">
        {alertCards.map(item => (
          <div key={item.label} className={`cash-signal-item ${item.active ? 'active' : 'quiet'}`}>
            <div className="cash-signal-label">{item.label}</div>
            <div className="cash-signal-value" style={{ color: item.active ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {item.active ? 'Attention' : 'Normal'}
            </div>
            <div className="cash-signal-note">{item.text}</div>
          </div>
        ))}
      </div>

      <div className="scenario-preview" aria-label="Scenario preview">
        <div className="scenario-preview-header">
          <div>
            <div className="scenario-preview-label">Scenario preview</div>
            <div className="scenario-preview-subtitle">Base, Bull, and Bear end balances from the current projection.</div>
          </div>
          <div className="scenario-preview-note">Use this to check downside risk before opening the full scenario page.</div>
        </div>

        <div className="scenario-preview-strip">
          {scenarioCases.map(item => (
            <div key={item.key} className="scenario-preview-item">
              <div className="scenario-preview-item-top">
                <div className="scenario-preview-case">{item.label}</div>
                <div className={`scenario-preview-cue ${item.tone}`}>{item.cue}</div>
              </div>
              <div className="scenario-preview-balance" style={{ color: item.balance < 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                {money(item.balance)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <CashFlowChart />
    </div>
  );
}
