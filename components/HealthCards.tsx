'use client';

import { useDashboard } from './DashboardContext';
import { calculateHHI } from '@/lib/dataUtils';

export default function HealthCards() {
  const { filteredData, openingBalance } = useDashboard();
  const sortedData = [...filteredData].sort((a, b) => a.date.localeCompare(b.date) || a.desc.localeCompare(b.desc));

  const months = Array.from(new Set(sortedData.map(d => d.month))).sort();
  const totalInflow = sortedData.filter(d => d.type === 'Inflow').reduce((s, d) => s + d.amount, 0);
  const totalOutflow = sortedData.filter(d => d.type === 'Outflow').reduce((s, d) => s + d.amount, 0);
  const numMonths = months.length || 1;
  const avgBurn = totalOutflow / numMonths;
  const lastBalance = sortedData.length > 0 ? sortedData[sortedData.length - 1].balance : openingBalance;
  const runway = avgBurn > 0 ? lastBalance / avgBurn : 99;

  const cogs = sortedData.filter(d => d.type === 'Outflow' && d.entity === 'Video Production').reduce((s, d) => s + d.amount, 0);
  const grossMargin = totalInflow > 0 ? ((totalInflow - cogs) / totalInflow) * 100 : -999;

  const hhi = calculateHHI(sortedData);

  const execCost = sortedData.filter(d => d.type === 'Outflow' && d.entity === 'Administrative').reduce((s, d) => s + d.amount, 0);
  const prodCost = sortedData.filter(d => d.type === 'Outflow' && d.entity === 'Video Production').reduce((s, d) => s + d.amount, 0);
  const execRatio = prodCost > 0 ? execCost / prodCost : 99;

  const avgRevenue = totalInflow / numMonths;
  const beGap = avgBurn > 0 ? ((avgRevenue - avgBurn) / avgBurn) * 100 : 0;

  type StatusColor = 'green' | 'amber' | 'red';
  function statusClass(val: number, greenThresh: number | { green: number; amber: number }, amberThresh?: number): StatusColor {
    if (typeof greenThresh === 'object') {
      if (val < greenThresh.green) return 'green';
      if (val < greenThresh.amber) return 'amber';
      return 'red';
    }
    if (val >= greenThresh) return 'green';
    if (amberThresh !== undefined && val >= amberThresh) return 'amber';
    return 'red';
  }

  const cards = [
    {
      label: 'Cash Runway',
      value: runway.toFixed(1) + ' mo',
      status: statusClass(runway, 6, 3),
      detail: runway >= 6 ? 'Healthy' : runway >= 3 ? 'Caution' : 'Critical',
    },
    {
      label: 'Gross Margin',
      value: grossMargin > -200 ? grossMargin.toFixed(1) + '%' : '<-200%',
      status: statusClass(grossMargin, 30, 0),
      detail: grossMargin >= 30 ? 'Healthy' : grossMargin >= 0 ? 'Low' : 'Negative',
    },
    {
      label: 'Revenue HHI',
      value: hhi.toFixed(0),
      status: statusClass(hhi, { green: 2500, amber: 5000 }),
      detail: hhi < 2500 ? 'Diversified' : hhi < 5000 ? 'Moderate' : 'Concentrated',
    },
    {
      label: 'Exec:Prod Ratio',
      value: execRatio.toFixed(1) + ':1',
      status: statusClass(1 / execRatio, 2, 0.67),
      detail: execRatio < 0.5 ? 'Lean' : execRatio < 1.5 ? 'Moderate' : 'Top-heavy',
    },
    {
      label: 'Break-Even Gap',
      value: beGap > 0 ? '+' + beGap.toFixed(0) + '%' : beGap.toFixed(0) + '%',
      status: statusClass(beGap, 0, -20),
      detail: beGap >= 0 ? 'Surplus' : beGap >= -20 ? 'Near' : 'Deficit',
    },
  ];

  return (
    <div className="health-grid">
      {cards.map(c => (
        <div key={c.label} className="health-card">
          <div className="health-label">{c.label}</div>
          <div className="health-value">{c.value}</div>
          <div className={`health-status ${c.status}`}>
            <span className={`health-dot ${c.status}`}></span>
            {c.detail}
          </div>
        </div>
      ))}
    </div>
  );
}
