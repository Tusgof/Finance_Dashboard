'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboard } from '../DashboardContext';
import CashFlowChart from '../charts/CashFlowChart';
import { DEFAULT_DASHBOARD_SETTINGS, fmt, loadDashboardSettings } from '@/lib/dataUtils';
import { calculateCashRunway, getCashAlerts, getCurrentCash, normalizeTransactions } from '@/lib/dashboardMetrics';

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

  return (
    <div className="page-stack">
      <div className="health-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <div className="health-card">
          <div className="health-label">Current Cash</div>
          <div className="health-value">฿{fmt(currentCash)}</div>
          <div className="health-status green">
            <span className="health-dot green"></span>
            Latest actual balance
          </div>
        </div>

        <div className="health-card">
          <div className="health-label">Cash Runway</div>
          <div className="health-value" style={{ color: `var(--accent-${runwayTone})` }}>
            {Number.isFinite(runway) ? `${runway.toFixed(1)} mo` : 'Infinite'}
          </div>
          <div className={`health-status ${runwayTone}`}>
            <span className={`health-dot ${runwayTone}`}></span>
            Based on recent actual deficit months
          </div>
        </div>
      </div>

      <div className="health-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {alertCards.map(item => (
          <div key={item.label} className="health-card" style={{ textAlign: 'left' }}>
            <div className="health-label">{item.label}</div>
            <div className="health-value" style={{ fontSize: 18, color: item.active ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {item.active ? 'Attention' : 'Normal'}
            </div>
            <div className={`health-status ${item.active ? 'red' : 'green'}`}>
              <span className={`health-dot ${item.active ? 'red' : 'green'}`}></span>
              {item.text}
            </div>
          </div>
        ))}
      </div>

      <CashFlowChart />
    </div>
  );
}
