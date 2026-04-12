'use client';

import { useEffect, useState } from 'react';
import { useDashboard } from './DashboardContext';
import { DEFAULT_DASHBOARD_SETTINGS, calculateHHI, loadDashboardSettings } from '@/lib/dataUtils';

export default function HealthCards() {
  const { filteredData, openingBalance } = useDashboard();
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

  const sortedData = [...filteredData].sort((a, b) => a.date.localeCompare(b.date) || a.desc.localeCompare(b.desc));

  const months = Array.from(new Set(sortedData.map(d => d.month))).sort();
  const totalInflow = sortedData.filter(d => d.type === 'Inflow').reduce((s, d) => s + d.amount, 0);
  const totalOutflow = sortedData.filter(d => d.type === 'Outflow').reduce((s, d) => s + d.amount, 0);
  const numMonths = months.length || 1;
  const avgBurn = totalOutflow / numMonths;
  const lastBalance = sortedData.length > 0 ? sortedData[sortedData.length - 1].balance : openingBalance;
  const runway = avgBurn > 0 ? lastBalance / avgBurn : 99;

  const cogs = sortedData.filter(d => d.type === 'Outflow' && d.category === 'ต้นทุนสินค้า').reduce((s, d) => s + d.amount, 0);
  const grossMargin = totalInflow > 0 ? ((totalInflow - cogs) / totalInflow) * 100 : -999;

  const hhi = calculateHHI(sortedData, settings);

  const execCost = sortedData.filter(d => d.type === 'Outflow' && d.entity === 'Administrative').reduce((s, d) => s + d.amount, 0);
  const prodCost = sortedData.filter(d => d.type === 'Outflow' && d.entity === 'Video Production').reduce((s, d) => s + d.amount, 0);
  const execRatio = prodCost > 0 ? execCost / prodCost : 99;

  const avgRevenue = totalInflow / numMonths;
  const beGap = avgBurn > 0 ? ((avgRevenue - avgBurn) / avgBurn) * 100 : 0;

  const thresholds = settings.healthThresholds;
  const runwayStatus = runway >= thresholds.cashRunwayMonths.healthyMin
    ? 'green'
    : runway >= thresholds.cashRunwayMonths.cautionMin
      ? 'amber'
      : 'red';
  const grossMarginStatus = grossMargin >= thresholds.grossMarginPct.healthyMin
    ? 'green'
    : grossMargin >= thresholds.grossMarginPct.cautionMin
      ? 'amber'
      : 'red';
  const hhiStatus = hhi < thresholds.revenueHHI.diversifiedMax
    ? 'green'
    : hhi < thresholds.revenueHHI.moderateMax
      ? 'amber'
      : 'red';
  const execRatioStatus = execRatio <= thresholds.execToProdRatio.healthyMax
    ? 'green'
    : execRatio <= thresholds.execToProdRatio.cautionMax
      ? 'amber'
      : 'red';
  const beGapStatus = beGap >= thresholds.breakEvenGapPct.surplusMin
    ? 'green'
    : beGap >= thresholds.breakEvenGapPct.nearMin
      ? 'amber'
      : 'red';

  const cards = [
    {
      label: 'Cash Runway',
      value: runway.toFixed(1) + ' mo',
      status: runwayStatus,
      detail: runwayStatus === 'green' ? 'Healthy' : runwayStatus === 'amber' ? 'Caution' : 'Critical',
    },
    {
      label: 'Gross Margin',
      value: grossMargin > -200 ? grossMargin.toFixed(1) + '%' : '<-200%',
      status: grossMarginStatus,
      detail: grossMarginStatus === 'green' ? 'Healthy' : grossMarginStatus === 'amber' ? 'Low' : 'Negative',
    },
    {
      label: 'Revenue HHI',
      value: hhi.toFixed(0),
      status: hhiStatus,
      detail: hhiStatus === 'green' ? 'Diversified' : hhiStatus === 'amber' ? 'Moderate' : 'Concentrated',
    },
    {
      label: 'Exec:Prod Ratio',
      value: execRatio.toFixed(1) + ':1',
      status: execRatioStatus,
      detail: execRatioStatus === 'green' ? 'Lean' : execRatioStatus === 'amber' ? 'Moderate' : 'Top-heavy',
    },
    {
      label: 'Break-Even Gap',
      value: beGap > 0 ? '+' + beGap.toFixed(0) + '%' : beGap.toFixed(0) + '%',
      status: beGapStatus,
      detail: beGapStatus === 'green' ? 'Surplus' : beGapStatus === 'amber' ? 'Near' : 'Deficit',
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
