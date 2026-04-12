'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboard } from './DashboardContext';
import { DEFAULT_DASHBOARD_SETTINGS, fmt, loadDashboardSettings } from '@/lib/dataUtils';
import { buildMonthlyPnLRows, getCurrentCash, normalizeTransactions } from '@/lib/dashboardMetrics';

export default function ScenarioPanel() {
  const { rawData, openingBalance } = useDashboard();
  const [settings, setSettings] = useState(DEFAULT_DASHBOARD_SETTINGS);
  const [revenueTarget, setRevenueTarget] = useState(DEFAULT_DASHBOARD_SETTINGS.scenario.revenueTarget.default);
  const [execAdj, setExecAdj] = useState(DEFAULT_DASHBOARD_SETTINGS.scenario.execSalaryAdjustmentPct.default);
  const [prodAdj, setProdAdj] = useState(DEFAULT_DASHBOARD_SETTINGS.scenario.productionCostAdjustmentPct.default);

  useEffect(() => {
    let active = true;
    void loadDashboardSettings().then(next => {
      if (!active) return;
      setSettings(next);
      setRevenueTarget(next.scenario.revenueTarget.default);
      setExecAdj(next.scenario.execSalaryAdjustmentPct.default);
      setProdAdj(next.scenario.productionCostAdjustmentPct.default);
    });
    return () => {
      active = false;
    };
  }, []);

  const { baseExecCost, baseProdCost, baseOtherCost, lastBalance } = useMemo(() => {
    const normalized = normalizeTransactions(rawData, settings);
    const pnlRows = buildMonthlyPnLRows(normalized, settings);
    const recentRows = pnlRows
      .filter(row => row.revenue > 0 || row.cogs > 0 || row.opEx > 0 || row.capEx > 0)
      .slice(-settings.scenario.breakEvenLookbackMonths);
    const months = recentRows.length || 1;
    const totalPeopleCost = recentRows.reduce((sum, row) => sum + row.peopleCost, 0);
    const totalProductionCost = recentRows.reduce((sum, row) => sum + row.cogs, 0);
    const totalOutflow = recentRows.reduce((sum, row) => sum + row.cogs + row.opEx + row.capEx, 0);

    return {
      baseExecCost: totalPeopleCost / months,
      baseProdCost: totalProductionCost / months,
      baseOtherCost: Math.max(totalOutflow / months - totalPeopleCost / months - totalProductionCost / months, 0),
      lastBalance: getCurrentCash(normalized, openingBalance),
    };
  }, [rawData, openingBalance, settings]);

  const newExec = baseExecCost * (1 + execAdj / 100);
  const newProd = baseProdCost * (1 + prodAdj / 100);
  const newBurn = newExec + newProd + baseOtherCost;
  const netMonthly = revenueTarget - newBurn;
  const newRunway = netMonthly < 0 ? lastBalance / Math.abs(netMonthly) : null;
  const projectionMonths = settings.scenario.projectionMonths;
  const balAtProjection = lastBalance + netMonthly * projectionMonths;
  const runwayThresholds = settings.healthThresholds.cashRunwayMonths;

  return (
    <div className="scenario-panel">
      <h3>What-If Scenario Analysis</h3>
      <div className="slider-grid">
        <div className="slider-group">
          <label>Monthly Revenue Target</label>
          <div className="slider-value">฿{fmt(revenueTarget)}</div>
          <input
            type="range"
            min={settings.scenario.revenueTarget.min}
            max={settings.scenario.revenueTarget.max}
            step={settings.scenario.revenueTarget.step}
            value={revenueTarget}
            onChange={e => setRevenueTarget(+e.target.value)}
          />
        </div>

        <div className="slider-group">
          <label>People Cost Adjustment</label>
          <div className="slider-value">{execAdj >= 0 ? '+' : ''}{execAdj}%</div>
          <input
            type="range"
            min={settings.scenario.execSalaryAdjustmentPct.min}
            max={settings.scenario.execSalaryAdjustmentPct.max}
            step={settings.scenario.execSalaryAdjustmentPct.step}
            value={execAdj}
            onChange={e => setExecAdj(+e.target.value)}
          />
        </div>

        <div className="slider-group">
          <label>COGS Adjustment</label>
          <div className="slider-value">{prodAdj >= 0 ? '+' : ''}{prodAdj}%</div>
          <input
            type="range"
            min={settings.scenario.productionCostAdjustmentPct.min}
            max={settings.scenario.productionCostAdjustmentPct.max}
            step={settings.scenario.productionCostAdjustmentPct.step}
            value={prodAdj}
            onChange={e => setProdAdj(+e.target.value)}
          />
        </div>
      </div>

      <div className="scenario-results">
        <div className="scenario-result">
          <div className="sr-label">Monthly Burn Rate</div>
          <div className="sr-value" style={{ color: 'var(--accent-red)' }}>฿{fmt(newBurn)}</div>
        </div>
        <div className="scenario-result">
          <div className="sr-label">Cash Runway</div>
          <div
            className="sr-value"
            style={{
              color:
                newRunway === null || newRunway >= runwayThresholds.healthyMin
                  ? 'var(--accent-green)'
                  : newRunway >= runwayThresholds.cautionMin
                    ? 'var(--accent-amber)'
                    : 'var(--accent-red)',
            }}
          >
            {newRunway === null ? 'Infinite' : `${newRunway.toFixed(1)} mo`}
          </div>
        </div>
        <div className="scenario-result">
          <div className="sr-label">Break-Even Revenue</div>
          <div className="sr-value" style={{ color: 'var(--accent-blue)' }}>฿{fmt(newBurn)}</div>
        </div>
        <div className="scenario-result">
          <div className="sr-label">Balance at Month {projectionMonths}</div>
          <div className="sr-value" style={{ color: balAtProjection >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            ฿{fmt(balAtProjection)}
          </div>
        </div>
      </div>
    </div>
  );
}
