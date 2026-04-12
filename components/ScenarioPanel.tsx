'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboard } from './DashboardContext';
import { DEFAULT_DASHBOARD_SETTINGS, fmt, loadDashboardSettings } from '@/lib/dataUtils';

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
    const actualMonths = Array.from(new Set(rawData.filter(d => d.status === 'Actual').map(d => d.month)));
    const numMonths = actualMonths.length || 1;
    const totalOutflow = rawData.filter(d => d.type === 'Outflow' && d.status === 'Actual').reduce((s, d) => s + d.amount, 0);
    const bec = rawData.filter(d => d.type === 'Outflow' && d.status === 'Actual' && d.entity === 'Administrative').reduce((s, d) => s + d.amount, 0) / numMonths;
    const bpc = rawData.filter(d => d.type === 'Outflow' && d.status === 'Actual' && d.entity === 'Video Production').reduce((s, d) => s + d.amount, 0) / numMonths;
    const boc = totalOutflow / numMonths - bec - bpc;
    const lb = rawData.length > 0 ? rawData[rawData.length - 1].balance : openingBalance;
    return { baseExecCost: bec, baseProdCost: bpc, baseOtherCost: boc, lastBalance: lb };
  }, [rawData, openingBalance]);

  const newExec = baseExecCost * (1 + execAdj / 100);
  const newProd = baseProdCost * (1 + prodAdj / 100);
  const newBurn = newExec + newProd + baseOtherCost;
  const netMonthly = revenueTarget - newBurn;
  const newRunway = netMonthly < 0 ? lastBalance / Math.abs(netMonthly) : 99;
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
          <label>Exec Salary Adjustment</label>
          <div className="slider-value">{execAdj}%</div>
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
          <label>Production Cost Adjustment</label>
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
            style={{ color: newRunway >= runwayThresholds.healthyMin ? 'var(--accent-green)' : newRunway >= runwayThresholds.cautionMin ? 'var(--accent-amber)' : 'var(--accent-red)' }}
          >
            {newRunway >= 99 ? 'Infinite' : `${newRunway.toFixed(1)} mo`}
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
