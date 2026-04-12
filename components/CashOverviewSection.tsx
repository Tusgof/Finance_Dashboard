'use client';

import { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import SectionShell from './SectionShell';
import CashFlowChart from './charts/CashFlowChart';
import { fmt } from '@/lib/dataUtils';

export default function CashOverviewSection() {
  const { filteredData, rawData, openingBalance } = useDashboard();

  const summary = useMemo(() => {
    const inflow = filteredData.filter(d => d.type === 'Inflow').reduce((sum, row) => sum + row.amount, 0);
    const outflow = filteredData.filter(d => d.type === 'Outflow').reduce((sum, row) => sum + row.amount, 0);
    const months = Array.from(new Set(filteredData.map(d => d.month))).length || 1;
    const burn = outflow / months;
    const balanceSource = filteredData.length > 0 ? filteredData : rawData;
    const currentBalance = balanceSource.length > 0 ? balanceSource[balanceSource.length - 1].balance : openingBalance;
    const runway = burn > 0 ? currentBalance / burn : null;
    const previousMonth = rawData.filter(d => d.status === 'Actual').reduce<Record<string, number>>((acc, row) => {
      if (row.type !== 'Inflow') return acc;
      acc[row.month] = (acc[row.month] || 0) + row.amount;
      return acc;
    }, {});
    const orderedMonths = Object.keys(previousMonth).sort();
    const monthlyDrop =
      orderedMonths.length >= 2
        ? previousMonth[orderedMonths[orderedMonths.length - 1]] < previousMonth[orderedMonths[orderedMonths.length - 2]] * 0.5
        : false;
    const alerts = [
      runway !== null && runway < 3 ? 'Cash runway below 3 months' : null,
      inflow < outflow ? 'This period is cash negative' : null,
      monthlyDrop ? 'Revenue dropped more than 50% vs previous month' : null,
    ].filter(Boolean) as string[];

    return { inflow, outflow, burn, currentBalance, runway, alerts };
  }, [filteredData, rawData, openingBalance]);

  return (
    <SectionShell
      id="cash-overview"
      eyebrow="Section 1"
      title="Cash Overview"
      subtitle="Cash in hand, burn, runway, and the trend line that management needs first."
    >
      <div className="summary-grid summary-grid-4">
        <div className="summary-card">
          <div className="summary-label">Current Balance</div>
          <div className="summary-value" style={{ color: 'var(--accent-blue)' }}>฿{fmt(summary.currentBalance)}</div>
          <div className="summary-note">Latest running balance</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Cash Runway</div>
          <div className="summary-value" style={{ color: summary.runway && summary.runway >= 3 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {summary.runway === null ? 'Infinite' : `${summary.runway.toFixed(1)} mo`}
          </div>
          <div className="summary-note">Based on current burn</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Avg Monthly Burn</div>
          <div className="summary-value" style={{ color: 'var(--accent-amber)' }}>฿{fmt(summary.burn)}</div>
          <div className="summary-note">Average outflow per month</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Cash Signal</div>
          <div className="summary-value" style={{ color: summary.alerts.length ? 'var(--accent-red)' : 'var(--accent-green)' }}>
            {summary.alerts.length ? `${summary.alerts.length} alerts` : 'Stable'}
          </div>
          <div className="summary-note">From current filter window</div>
        </div>
      </div>

      {summary.alerts.length > 0 && (
        <div className="signal-panel">
          <div className="signal-title">Management alerts</div>
          <div className="signal-list">
            {summary.alerts.map(alert => (
              <span key={alert} className="signal-pill">{alert}</span>
            ))}
          </div>
        </div>
      )}

      <CashFlowChart />
    </SectionShell>
  );
}
