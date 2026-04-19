'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboard } from '../DashboardContext';
import { DEFAULT_DASHBOARD_SETTINGS, fmt, loadDashboardSettings } from '@/lib/dataUtils';
import { buildMonthlyPnLRows, calculateCostPerContent, calculateForecastAccuracy, normalizeTransactions } from '@/lib/dashboardMetrics';

export default function PnLCostSection() {
  const { rawData, productionSummary } = useDashboard();
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
  const pnlRows = useMemo(() => buildMonthlyPnLRows(normalized, settings), [normalized, settings]);
  const latestRow = pnlRows.at(-1);
  const forecastAccuracy = calculateForecastAccuracy(normalized);
  const latestCostPerContent = latestRow ? calculateCostPerContent(latestRow, productionSummary) : null;
  const latestCashAfterCapEx = latestRow ? latestRow.cashAfterCapEx : 0;

  return (
    <div className="page-stack">
      <div className="health-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div className="health-card">
          <div className="health-label">Cost per Content</div>
          <div className="health-value">{latestCostPerContent !== null ? `฿${fmt(latestCostPerContent)}` : 'N/A'}</div>
          <div className="health-status amber"><span className="health-dot amber"></span>Latest month with production count</div>
        </div>
        <div className="health-card">
          <div className="health-label">Headcount Cost Ratio</div>
          <div className="health-value">{latestRow?.headcountCostRatio !== null && latestRow?.headcountCostRatio !== undefined ? `${(latestRow.headcountCostRatio * 100).toFixed(1)}%` : 'N/A'}</div>
          <div className="health-status green"><span className="health-dot green"></span>Total people cost / revenue</div>
        </div>
        <div className="health-card">
          <div className="health-label">Forecast Accuracy</div>
          <div className="health-value">{forecastAccuracy !== null ? `${(forecastAccuracy * 100).toFixed(1)}%` : 'N/A'}</div>
          <div className="health-status amber"><span className="health-dot amber"></span>Requires actual rows with original forecast</div>
        </div>
        <div className="health-card">
          <div className="health-label">Latest Cash After CapEx</div>
          <div className="health-value" style={{ color: latestCashAfterCapEx >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            ฿{fmt(latestCashAfterCapEx)}
          </div>
          <div className="health-status amber"><span className="health-dot amber"></span>Operating profit less CapEx</div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>Monthly Cash P&amp;L</h3>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Work Month</th>
                <th>Revenue</th>
                <th>COGS</th>
                <th>Gross Profit</th>
                <th>Gross Margin</th>
                <th>OpEx</th>
                <th>CapEx</th>
                <th>Cash After CapEx</th>
                <th>Cash Margin</th>
                <th>Headcount Ratio</th>
                <th>Revenue Var %</th>
                <th>Cost Var %</th>
              </tr>
            </thead>
            <tbody>
              {pnlRows.map(row => (
                <tr key={row.month}>
                  <td>{row.month}</td>
                  <td>฿{fmt(row.revenue)}</td>
                  <td>฿{fmt(row.cogs)}</td>
                  <td>฿{fmt(row.grossProfit)}</td>
                  <td>{row.grossMarginPct !== null ? `${row.grossMarginPct.toFixed(1)}%` : 'N/A'}</td>
                  <td>฿{fmt(row.opEx)}</td>
                  <td>฿{fmt(row.capEx)}</td>
                  <td style={{ color: row.cashAfterCapEx >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>฿{fmt(row.cashAfterCapEx)}</td>
                  <td>{row.cashMarginPct !== null ? `${row.cashMarginPct.toFixed(1)}%` : 'N/A'}</td>
                  <td>{row.headcountCostRatio !== null ? `${(row.headcountCostRatio * 100).toFixed(1)}%` : 'N/A'}</td>
                  <td>{row.revenueVariancePct !== null ? `${row.revenueVariancePct.toFixed(1)}%` : 'N/A'}</td>
                  <td>{row.costVariancePct !== null ? `${row.costVariancePct.toFixed(1)}%` : 'N/A'}</td>
                </tr>
              ))}
              {pnlRows.length === 0 ? (
                <tr>
                  <td colSpan={12}>No transaction data available.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>Monthly Production Summary</h3>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Work Month</th>
                <th>Total Content</th>
                <th>Organic</th>
                <th>Sponsored</th>
                <th>Total COGS</th>
                <th>Cost per Content</th>
              </tr>
            </thead>
            <tbody>
              {productionSummary.length === 0 ? (
                <tr>
                  <td colSpan={6}>No production summary data yet.</td>
                </tr>
              ) : (
                productionSummary.map(row => (
                  <tr key={row.workMonth}>
                    <td>{row.workMonth}</td>
                    <td>{row.totalContent || '-'}</td>
                    <td>{row.organicContent || '-'}</td>
                    <td>{row.sponsoredContent || '-'}</td>
                    <td>{row.totalCogs !== undefined ? `฿${fmt(row.totalCogs)}` : '-'}</td>
                    <td>{row.costPerContent !== undefined ? `฿${fmt(row.costPerContent)}` : 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
