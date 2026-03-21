'use client';

import { useState, useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { fmt } from '@/lib/dataUtils';

export default function ScenarioPanel() {
  const { rawData, openingBalance } = useDashboard();

  const [revenueTarget, setRevenueTarget] = useState(34000);
  const [execAdj, setExecAdj] = useState(0);
  const [prodAdj, setProdAdj] = useState(0);

  const { baseExecCost, baseProdCost, baseOtherCost, lastBalance } = useMemo(() => {
    const actualMonths = Array.from(new Set(rawData.filter(d => d.status === 'Actual').map(d => d.month)));
    const numMonths = actualMonths.length || 1;
    const totalOutflow = rawData.filter(d => d.type === 'Outflow' && d.status === 'Actual').reduce((s, d) => s + d.amount, 0);
    const bec = rawData.filter(d => d.type === 'Outflow' && d.status === 'Actual' && d.entity === 'Administrative').reduce((s, d) => s + d.amount, 0) / numMonths;
    const bpc = rawData.filter(d => d.type === 'Outflow' && d.status === 'Actual' && d.entity === 'Video Production').reduce((s, d) => s + d.amount, 0) / numMonths;
    const boc = totalOutflow / numMonths - bec - bpc;
    const lb = rawData.length > 0 ? rawData[rawData.length - 1].balance : openingBalance;
    return {
      baseExecCost: bec,
      baseProdCost: bpc,
      baseOtherCost: boc,
      lastBalance: lb,
    };
  }, [rawData, openingBalance]);

  const newExec = baseExecCost * (1 + execAdj / 100);
  const newProd = baseProdCost * (1 + prodAdj / 100);
  const newBurn = newExec + newProd + baseOtherCost;
  const netMonthly = revenueTarget - newBurn;
  const newRunway = netMonthly < 0 ? lastBalance / Math.abs(netMonthly) : 99;
  const balAt6 = lastBalance + netMonthly * 6;

  return (
    <div className="scenario-panel">
      <h3>🔬 What-If Scenario Analysis</h3>
      <div className="slider-grid">
        <div className="slider-group">
          <label>Monthly Revenue Target</label>
          <div className="slider-value">฿{fmt(revenueTarget)}</div>
          <input
            type="range"
            min={0}
            max={200000}
            step={1000}
            value={revenueTarget}
            onChange={e => setRevenueTarget(+e.target.value)}
          />
        </div>
        <div className="slider-group">
          <label>Exec Salary Adjustment</label>
          <div className="slider-value">{execAdj}%</div>
          <input
            type="range"
            min={-50}
            max={0}
            step={5}
            value={execAdj}
            onChange={e => setExecAdj(+e.target.value)}
          />
        </div>
        <div className="slider-group">
          <label>Production Cost Adjustment</label>
          <div className="slider-value">{prodAdj >= 0 ? '+' : ''}{prodAdj}%</div>
          <input
            type="range"
            min={-30}
            max={30}
            step={5}
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
            style={{ color: newRunway >= 6 ? 'var(--accent-green)' : newRunway >= 3 ? 'var(--accent-amber)' : 'var(--accent-red)' }}
          >
            {newRunway >= 99 ? 'Infinite' : `${newRunway.toFixed(1)} mo`}
          </div>
        </div>
        <div className="scenario-result">
          <div className="sr-label">Break-Even Revenue</div>
          <div className="sr-value" style={{ color: 'var(--accent-blue)' }}>฿{fmt(newBurn)}</div>
        </div>
        <div className="scenario-result">
          <div className="sr-label">Balance at Month 6</div>
          <div className="sr-value" style={{ color: balAt6 >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>฿{fmt(balAt6)}</div>
        </div>
      </div>
    </div>
  );
}
