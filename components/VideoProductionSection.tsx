'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboard } from './DashboardContext';
import { DEFAULT_DASHBOARD_SETTINGS, fmt, formatMonthLabel, getAvailableMonths, getCostType, loadDashboardSettings } from '@/lib/dataUtils';
import DirectIndirectStackedChart from './charts/DirectIndirectStackedChart';
import DirectIndirectDonutChart from './charts/DirectIndirectDonutChart';

export default function VideoProductionSection() {
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

  const videoProductionCosts = useMemo(
    () =>
      filteredData
        .filter((d) => d.category === 'ต้นทุนสินค้า' && d.entity === 'Video Production')
        .map((d) => ({ ...d, costType: getCostType(d, settings) })),
    [filteredData, settings]
  );

  const totalDirect = videoProductionCosts.filter((d) => d.costType === 'Direct').reduce((s, d) => s + d.amount, 0);
  const totalIndirect = videoProductionCosts.filter((d) => d.costType === 'Indirect').reduce((s, d) => s + d.amount, 0);
  const total = totalDirect + totalIndirect;
  const directPct = total > 0 ? ((totalDirect / total) * 100).toFixed(1) : '0';
  const indirectPct = total > 0 ? ((totalIndirect / total) * 100).toFixed(1) : '0';

  const groupedItems: Record<string, { desc: string; costType: 'Direct' | 'Indirect' | null; months: Record<string, number> }> = {};
  videoProductionCosts.forEach((transaction) => {
    if (!groupedItems[transaction.desc]) {
      groupedItems[transaction.desc] = { desc: transaction.desc, costType: transaction.costType, months: {} };
    }
    groupedItems[transaction.desc].months[transaction.month] = (groupedItems[transaction.desc].months[transaction.month] || 0) + transaction.amount;
  });

  const sortByTotal = (a: typeof groupedItems[string], b: typeof groupedItems[string]) =>
    Object.values(b.months).reduce((s, v) => s + v, 0) - Object.values(a.months).reduce((s, v) => s + v, 0);

  const directItems = Object.values(groupedItems).filter((g) => g.costType === 'Direct').sort(sortByTotal);
  const indirectItems = Object.values(groupedItems).filter((g) => g.costType === 'Indirect').sort(sortByTotal);
  const activeMonths = getAvailableMonths(videoProductionCosts);

  const directTotalByMonth: Record<string, number> = {};
  const indirectTotalByMonth: Record<string, number> = {};
  directItems.forEach((item) => activeMonths.forEach((month) => { directTotalByMonth[month] = (directTotalByMonth[month] || 0) + (item.months[month] || 0); }));
  indirectItems.forEach((item) => activeMonths.forEach((month) => { indirectTotalByMonth[month] = (indirectTotalByMonth[month] || 0) + (item.months[month] || 0); }));

  const directGrandTotal = Object.values(directTotalByMonth).reduce((s, v) => s + v, 0);
  const indirectGrandTotal = Object.values(indirectTotalByMonth).reduce((s, v) => s + v, 0);

  return (
    <div className="chart-card full-width" style={{ marginBottom: 24 }}>
      <div className="section-header">
        <div className="section-icon" style={{ background: 'linear-gradient(135deg,var(--accent-blue),var(--accent-amber))' }}>&#9881;</div>
        <div>
          <h2>Video Production Cost Breakdown</h2>
          <div className="section-sub">Direct vs indirect cost analysis for COGS</div>
        </div>
      </div>

      <div className="cost-kpi-grid">
        <div className="cost-kpi">
          <div className="label">Total Video Production COGS</div>
          <div className="value" style={{ color: 'var(--accent-purple)' }}>฿{fmt(total)}</div>
          <div className="pct" style={{ color: 'var(--text-muted)' }}>{videoProductionCosts.length} items</div>
        </div>
        <div className="cost-kpi">
          <div className="label">Direct Cost</div>
          <div className="value" style={{ color: 'var(--accent-blue)' }}>฿{fmt(totalDirect)}</div>
          <div className="pct" style={{ color: 'var(--accent-blue)' }}>{directPct}% of total</div>
        </div>
        <div className="cost-kpi">
          <div className="label">Indirect Cost</div>
          <div className="value" style={{ color: 'var(--accent-amber)' }}>฿{fmt(totalIndirect)}</div>
          <div className="pct" style={{ color: 'var(--accent-amber)' }}>{indirectPct}% of total</div>
        </div>
      </div>

      <div className="charts-grid" style={{ marginBottom: 20 }}>
        <DirectIndirectStackedChart />
        <DirectIndirectDonutChart />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="breakdown-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              {activeMonths.map((month) => (
                <th key={month} style={{ textAlign: 'right' }}>
                  {formatMonthLabel(month)}
                </th>
              ))}
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={activeMonths.length + 3}
                style={{ background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', fontWeight: 700, fontSize: 12, padding: '8px 14px', letterSpacing: '0.5px' }}
              >
                DIRECT COST
              </td>
            </tr>
            {directItems.map((item) => {
              const rowTotal = Object.values(item.months).reduce((s, v) => s + v, 0);
              return (
                <tr key={item.desc} className="row-direct">
                  <td>{item.desc}</td>
                  <td><span className="badge-direct">Direct</span></td>
                  {activeMonths.map((month) => (
                    <td key={month} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {item.months[month] ? <>฿{fmt(item.months[month])}</> : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-blue)' }}>฿{fmt(rowTotal)}</td>
                </tr>
              );
            })}
            <tr className="row-total">
              <td>Total Direct</td>
              <td></td>
              {activeMonths.map((month) => (
                <td key={month} style={{ textAlign: 'right', color: 'var(--accent-blue)' }}>฿{fmt(directTotalByMonth[month] || 0)}</td>
              ))}
              <td style={{ textAlign: 'right', color: 'var(--accent-blue)', fontSize: 14 }}>฿{fmt(directGrandTotal)}</td>
            </tr>

            <tr>
              <td
                colSpan={activeMonths.length + 3}
                style={{ background: 'var(--accent-amber-bg)', color: 'var(--accent-amber)', fontWeight: 700, fontSize: 12, padding: '8px 14px', letterSpacing: '0.5px' }}
              >
                INDIRECT COST
              </td>
            </tr>
            {indirectItems.map((item) => {
              const rowTotal = Object.values(item.months).reduce((s, v) => s + v, 0);
              return (
                <tr key={item.desc} className="row-indirect">
                  <td>{item.desc}</td>
                  <td><span className="badge-indirect">Indirect</span></td>
                  {activeMonths.map((month) => (
                    <td key={month} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {item.months[month] ? <>฿{fmt(item.months[month])}</> : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-amber)' }}>฿{fmt(rowTotal)}</td>
                </tr>
              );
            })}
            <tr className="row-total">
              <td>Total Indirect</td>
              <td></td>
              {activeMonths.map((month) => (
                <td key={month} style={{ textAlign: 'right', color: 'var(--accent-amber)' }}>฿{fmt(indirectTotalByMonth[month] || 0)}</td>
              ))}
              <td style={{ textAlign: 'right', color: 'var(--accent-amber)', fontSize: 14 }}>฿{fmt(indirectGrandTotal)}</td>
            </tr>

            <tr style={{ background: 'var(--accent-purple-bg)' }}>
              <td style={{ fontWeight: 800, color: 'var(--accent-purple)' }}>TOTAL VIDEO PRODUCTION</td>
              <td></td>
              {activeMonths.map((month) => (
                <td key={month} style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-purple)' }}>
                  ฿{fmt((directTotalByMonth[month] || 0) + (indirectTotalByMonth[month] || 0))}
                </td>
              ))}
              <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-purple)', fontSize: 15 }}>฿{fmt(directGrandTotal + indirectGrandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
