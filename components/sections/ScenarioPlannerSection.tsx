'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboard } from '../DashboardContext';
import ScenarioPanel from '../ScenarioPanel';
import ScenarioForecastChart from '../charts/ScenarioForecastChart';
import { DEFAULT_DASHBOARD_SETTINGS, fmt, loadDashboardSettings } from '@/lib/dataUtils';
import { buildScenarioForecast, normalizeTransactions } from '@/lib/dashboardMetrics';

export default function ScenarioPlannerSection() {
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
  const scenario = useMemo(() => buildScenarioForecast(normalized, openingBalance, settings), [normalized, openingBalance, settings]);

  return (
    <div className="page-stack">
      <div className="health-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div className="health-card">
          <div className="health-label">Break-even Revenue</div>
          <div className="health-value">฿{fmt(scenario.breakEvenRevenue)}</div>
          <div className="health-status amber"><span className="health-dot amber"></span>Average recent monthly outflow</div>
        </div>
        <div className="health-card">
          <div className="health-label">Best Case Ending Cash</div>
          <div className="health-value">฿{fmt(scenario.best.endingCash)}</div>
          <div className="health-status green"><span className="health-dot green"></span>{scenario.best.monthlyNet >= 0 ? 'Positive monthly net' : 'Negative monthly net'}</div>
        </div>
        <div className="health-card">
          <div className="health-label">Base Case Ending Cash</div>
          <div className="health-value">฿{fmt(scenario.base.endingCash)}</div>
          <div className="health-status amber"><span className="health-dot amber"></span>{scenario.base.monthlyNet >= 0 ? 'Positive monthly net' : 'Negative monthly net'}</div>
        </div>
        <div className="health-card">
          <div className="health-label">Worst Case Ending Cash</div>
          <div className="health-value">฿{fmt(scenario.worst.endingCash)}</div>
          <div className="health-status red"><span className="health-dot red"></span>{scenario.worst.monthlyNet >= 0 ? 'Positive monthly net' : 'Negative monthly net'}</div>
        </div>
      </div>

      <ScenarioForecastChart settings={settings} />
      <ScenarioPanel />
    </div>
  );
}
