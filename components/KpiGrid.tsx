'use client';

import { useDashboard } from './DashboardContext';
import { fmt } from '@/lib/dataUtils';

export default function KpiGrid() {
  const { filteredData, openingBalance } = useDashboard();

  const totalInflow = filteredData.filter(d => d.type === 'Inflow').reduce((s, d) => s + d.amount, 0);
  const totalOutflow = filteredData.filter(d => d.type === 'Outflow').reduce((s, d) => s + d.amount, 0);
  const netCashFlow = totalInflow - totalOutflow;
  const txCount = filteredData.length;
  const actualMonths = Array.from(new Set(filteredData.filter(d => d.status === 'Actual').map(d => d.month)));
  const avgMonthlyIncome = totalInflow / (actualMonths.length || 1);
  const lastBalance = filteredData.length > 0 ? filteredData[filteredData.length - 1].balance : openingBalance;
  const burnRate = totalOutflow / (new Set(filteredData.map(d => d.month)).size || 1);

  const showWarning = lastBalance < 0 || filteredData.some(d => d.balance < 0);

  return (
    <>
      {showWarning && (
        <div className="warning-banner">
          <div className="icon">⚠</div>
          <div className="text">
            <h4>Cash Flow Alert</h4>
            <p>Projected balance turns negative. Consider revenue optimization or cost reduction strategies.</p>
          </div>
        </div>
      )}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Income</div>
          <div className="kpi-value" style={{ color: 'var(--accent-green)' }}>฿{fmt(totalInflow)}</div>
          <div className="kpi-sub">{filteredData.filter(d => d.type === 'Inflow').length} transactions</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Expenses</div>
          <div className="kpi-value" style={{ color: 'var(--accent-red)' }}>฿{fmt(totalOutflow)}</div>
          <div className="kpi-sub">{filteredData.filter(d => d.type === 'Outflow').length} transactions</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Net Cash Flow</div>
          <div className="kpi-value" style={{ color: netCashFlow >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            ฿{fmt(netCashFlow)}
          </div>
          <div className="kpi-sub">
            <span className={netCashFlow >= 0 ? 'up' : 'down'}>{netCashFlow >= 0 ? '▲' : '▼'}</span>
            {netCashFlow >= 0 ? 'Surplus' : 'Deficit'}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Current Balance</div>
          <div className="kpi-value" style={{ color: lastBalance >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)' }}>
            ฿{fmt(lastBalance)}
          </div>
          <div className="kpi-sub">From ฿{fmt(openingBalance)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Monthly Income</div>
          <div className="kpi-value" style={{ color: 'var(--accent-green)' }}>฿{fmt(avgMonthlyIncome)}</div>
          <div className="kpi-sub">Per month avg</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Monthly Burn</div>
          <div className="kpi-value" style={{ color: 'var(--accent-amber)' }}>฿{fmt(burnRate)}</div>
          <div className="kpi-sub">Per month avg</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Transactions</div>
          <div className="kpi-value" style={{ color: 'var(--accent-cyan)' }}>{txCount}</div>
          <div className="kpi-sub">
            {filteredData.filter(d => d.status === 'Actual').length} actual /{' '}
            {filteredData.filter(d => d.status === 'Forecast').length} forecast
          </div>
        </div>
      </div>
    </>
  );
}
