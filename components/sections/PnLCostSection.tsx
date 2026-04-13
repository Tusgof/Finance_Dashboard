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

  return (
    <div className="page-stack">
      <div className="health-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="health-card">
          <div className="health-label">Break-even Revenue</div>
          <div className="health-value">฿{fmt(latestRow ? latestRow.cogs + latestRow.opEx + latestRow.capEx : 0)}</div>
          <div className="health-status green"><span className="health-dot green"></span>Latest month outflow base</div>
        </div>
        <div className="health-card">
          <div className="health-label">Cost per Content</div>
          <div className="health-value">{latestCostPerContent !== null ? `฿${fmt(latestCostPerContent)}` : 'N/A'}</div>
          <div className="health-status amber"><span className="health-dot amber"></span>Needs Monthly Production Summary rows</div>
        </div>
        <div className="health-card">
          <div className="health-label">Forecast Accuracy</div>
          <div className="health-value">{forecastAccuracy !== null ? `${(forecastAccuracy * 100).toFixed(1)}%` : 'N/A'}</div>
          <div className="health-status green"><span className="health-dot green"></span>From actual rows with original forecast</div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>Monthly P&amp;L</h3>
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
                <th>Operating Profit</th>
                <th>Operating Margin</th>
                <th>Headcount Ratio</th>
                <th>Variance %</th>
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
                  <td>฿{fmt(row.operatingProfit)}</td>
                  <td>{row.operatingMarginPct !== null ? `${row.operatingMarginPct.toFixed(1)}%` : 'N/A'}</td>
                  <td>{row.headcountCostRatio !== null ? `${(row.headcountCostRatio * 100).toFixed(1)}%` : 'N/A'}</td>
                  <td>{row.variancePct !== null ? `${row.variancePct.toFixed(1)}%` : 'N/A'}</td>
                </tr>
              ))}
              {pnlRows.length === 0 ? (
                <tr>
                  <td colSpan={10}>No transaction data available.</td>
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
                <th>Sponsor</th>
                <th>Cost per Content</th>
              </tr>
            </thead>
            <tbody>
              {productionSummary.length === 0 ? (
                <tr>
                  <td colSpan={6}>No production summary data yet. Add rows to `data/production-summary.json`.</td>
                </tr>
              ) : (
                productionSummary.map(row => {
                  const pnl = pnlRows.find(item => item.month === row.workMonth);
                  const cpc = pnl ? calculateCostPerContent(pnl, productionSummary) : null;
                  return (
                    <tr key={row.workMonth}>
                      <td>{row.workMonth}</td>
                      <td>{row.totalContent}</td>
                      <td>{row.organicContent}</td>
                      <td>{row.sponsoredContent}</td>
                      <td>{row.sponsor || '-'}</td>
                      <td>{cpc !== null ? `฿${fmt(cpc)}` : 'N/A'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
