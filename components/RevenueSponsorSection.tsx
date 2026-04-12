'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboard } from './DashboardContext';
import SectionShell from './SectionShell';
import RevenueChart from './charts/RevenueChart';
import { DEFAULT_DASHBOARD_SETTINGS, fmt, getRevenueSourceLabel, loadDashboardSettings } from '@/lib/dataUtils';

export default function RevenueSponsorSection() {
  const { filteredData } = useDashboard();
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

  const summary = useMemo(() => {
    const inflows = filteredData.filter(d => d.type === 'Inflow');
    const actual = inflows.filter(d => d.status === 'Actual').reduce((sum, row) => sum + row.amount, 0);
    const forecast = inflows.filter(d => d.status === 'Forecast').reduce((sum, row) => sum + row.amount, 0);

    const sources = inflows.reduce<Record<string, { actual: number; forecast: number }>>((acc, row) => {
      const source = getRevenueSourceLabel(row.desc, settings);
      if (!acc[source]) acc[source] = { actual: 0, forecast: 0 };
      acc[source][row.status === 'Actual' ? 'actual' : 'forecast'] += row.amount;
      return acc;
    }, {});

    const rows = Object.entries(sources)
      .map(([source, values]) => ({ source, ...values, total: values.actual + values.forecast }))
      .sort((a, b) => b.total - a.total);

    return {
      actual,
      forecast,
      rows,
      topSource: rows[0]?.source ?? 'None',
    };
  }, [filteredData, settings]);

  return (
    <SectionShell
      id="revenue-sponsor"
      eyebrow="Section 2"
      title="Revenue & Sponsor"
      subtitle="Actual revenue, forecast pipeline, and which sources matter most."
    >
      <div className="summary-grid summary-grid-4">
        <div className="summary-card">
          <div className="summary-label">Actual Revenue</div>
          <div className="summary-value" style={{ color: 'var(--accent-green)' }}>฿{fmt(summary.actual)}</div>
          <div className="summary-note">From actual inflows</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Forecast Pipeline</div>
          <div className="summary-value" style={{ color: 'var(--accent-amber)' }}>฿{fmt(summary.forecast)}</div>
          <div className="summary-note">Forecast inflows only</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Top Source</div>
          <div className="summary-value" style={{ color: 'var(--accent-blue)' }}>{summary.topSource}</div>
          <div className="summary-note">Largest revenue contributor</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Source Count</div>
          <div className="summary-value" style={{ color: 'var(--accent-purple)' }}>{summary.rows.length}</div>
          <div className="summary-note">Revenue sources in view</div>
        </div>
      </div>

      <div className="section-split">
        <RevenueChart />
        <div className="chart-card revenue-table-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Source Mix</div>
              <div className="chart-subtitle">Actual and forecast inflows by source</div>
            </div>
          </div>
          <div className="table-scroll compact">
            <table className="source-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th className="align-right">Actual</th>
                  <th className="align-right">Forecast</th>
                  <th className="align-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map(row => (
                  <tr key={row.source}>
                    <td>{row.source}</td>
                    <td className="align-right">฿{fmt(row.actual)}</td>
                    <td className="align-right">฿{fmt(row.forecast)}</td>
                    <td className="align-right amount-positive">฿{fmt(row.total)}</td>
                  </tr>
                ))}
                {summary.rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty-state">No revenue data in the current filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
