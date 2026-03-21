'use client';

import { useDashboard } from './DashboardContext';
import { fmt, getCostType } from '@/lib/dataUtils';
import DirectIndirectStackedChart from './charts/DirectIndirectStackedChart';
import DirectIndirectDonutChart from './charts/DirectIndirectDonutChart';

const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
const MONTH_LABELS: Record<string, string> = {
  '2026-01': 'ม.ค.',
  '2026-02': 'ก.พ.',
  '2026-03': 'มี.ค.',
  '2026-04': 'เม.ย.',
  '2026-05': 'พ.ค.',
  '2026-06': 'มิ.ย.',
};

export default function VideoProductionSection() {
  const { filteredData } = useDashboard();

  const vp = filteredData
    .filter(d => d.category === 'ต้นทุนสินค้า' && d.entity === 'Video Production')
    .map(d => ({ ...d, costType: getCostType(d) }));

  const totalDirect = vp.filter(d => d.costType === 'Direct').reduce((s, d) => s + d.amount, 0);
  const totalIndirect = vp.filter(d => d.costType === 'Indirect').reduce((s, d) => s + d.amount, 0);
  const total = totalDirect + totalIndirect;
  const directPct = total > 0 ? ((totalDirect / total) * 100).toFixed(1) : '0';
  const indirectPct = total > 0 ? ((totalIndirect / total) * 100).toFixed(1) : '0';

  const groups: Record<string, { desc: string; costType: 'Direct' | 'Indirect' | null; months: Record<string, number> }> = {};
  vp.forEach(d => {
    if (!groups[d.desc]) groups[d.desc] = { desc: d.desc, costType: d.costType, months: {} };
    groups[d.desc].months[d.month] = (groups[d.desc].months[d.month] || 0) + d.amount;
  });

  const sortByTotal = (a: typeof groups[string], b: typeof groups[string]) =>
    Object.values(b.months).reduce((s, v) => s + v, 0) - Object.values(a.months).reduce((s, v) => s + v, 0);

  const directItems = Object.values(groups).filter(g => g.costType === 'Direct').sort(sortByTotal);
  const indirectItems = Object.values(groups).filter(g => g.costType === 'Indirect').sort(sortByTotal);
  const activeMonths = MONTHS.filter(m => vp.some(d => d.month === m));

  const directTotalByMonth: Record<string, number> = {};
  const indirectTotalByMonth: Record<string, number> = {};
  directItems.forEach(item => activeMonths.forEach(m => { directTotalByMonth[m] = (directTotalByMonth[m] || 0) + (item.months[m] || 0); }));
  indirectItems.forEach(item => activeMonths.forEach(m => { indirectTotalByMonth[m] = (indirectTotalByMonth[m] || 0) + (item.months[m] || 0); }));

  const directGrandTotal = Object.values(directTotalByMonth).reduce((s, v) => s + v, 0);
  const indirectGrandTotal = Object.values(indirectTotalByMonth).reduce((s, v) => s + v, 0);

  return (
    <div className="chart-card full-width" style={{ marginBottom: 24 }}>
      <div className="section-header">
        <div className="section-icon" style={{ background: 'linear-gradient(135deg,var(--accent-blue),var(--accent-amber))' }}>⚙</div>
        <div>
          <h2>Video Production Cost Breakdown</h2>
          <div className="section-sub">Direct vs Indirect cost analysis · COGS (ต้นทุนสินค้า)</div>
        </div>
      </div>

      <div className="cost-kpi-grid">
        <div className="cost-kpi">
          <div className="label">Total Video Production COGS</div>
          <div className="value" style={{ color: 'var(--accent-purple)' }}>฿{fmt(total)}</div>
          <div className="pct" style={{ color: 'var(--text-muted)' }}>{vp.length} items</div>
        </div>
        <div className="cost-kpi">
          <div className="label">Direct Cost (ต้นทุนทางตรง)</div>
          <div className="value" style={{ color: 'var(--accent-blue)' }}>฿{fmt(totalDirect)}</div>
          <div className="pct" style={{ color: 'var(--accent-blue)' }}>{directPct}% of total</div>
        </div>
        <div className="cost-kpi">
          <div className="label">Indirect Cost (ต้นทุนทางอ้อม)</div>
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
              <th>รายการ</th>
              <th>Type</th>
              {activeMonths.map(m => <th key={m} style={{ textAlign: 'right' }}>{MONTH_LABELS[m] || m}</th>)}
              <th style={{ textAlign: 'right' }}>รวม</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={activeMonths.length + 3} style={{ background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', fontWeight: 700, fontSize: 12, padding: '8px 14px', letterSpacing: '0.5px' }}>
                DIRECT COST (ต้นทุนทางตรง)
              </td>
            </tr>
            {directItems.map(item => {
              const rowTotal = Object.values(item.months).reduce((s, v) => s + v, 0);
              return (
                <tr key={item.desc} className="row-direct">
                  <td>{item.desc}</td>
                  <td><span className="badge-direct">Direct</span></td>
                  {activeMonths.map(m => (
                    <td key={m} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {item.months[m] ? `฿${fmt(item.months[m])}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-blue)' }}>฿{fmt(rowTotal)}</td>
                </tr>
              );
            })}
            <tr className="row-total">
              <td>รวม Direct</td><td></td>
              {activeMonths.map(m => <td key={m} style={{ textAlign: 'right', color: 'var(--accent-blue)' }}>฿{fmt(directTotalByMonth[m] || 0)}</td>)}
              <td style={{ textAlign: 'right', color: 'var(--accent-blue)', fontSize: 14 }}>฿{fmt(directGrandTotal)}</td>
            </tr>

            <tr>
              <td colSpan={activeMonths.length + 3} style={{ background: 'var(--accent-amber-bg)', color: 'var(--accent-amber)', fontWeight: 700, fontSize: 12, padding: '8px 14px', letterSpacing: '0.5px' }}>
                INDIRECT COST (ต้นทุนทางอ้อม)
              </td>
            </tr>
            {indirectItems.map(item => {
              const rowTotal = Object.values(item.months).reduce((s, v) => s + v, 0);
              return (
                <tr key={item.desc} className="row-indirect">
                  <td>{item.desc}</td>
                  <td><span className="badge-indirect">Indirect</span></td>
                  {activeMonths.map(m => (
                    <td key={m} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {item.months[m] ? `฿${fmt(item.months[m])}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-amber)' }}>฿{fmt(rowTotal)}</td>
                </tr>
              );
            })}
            <tr className="row-total">
              <td>รวม Indirect</td><td></td>
              {activeMonths.map(m => <td key={m} style={{ textAlign: 'right', color: 'var(--accent-amber)' }}>฿{fmt(indirectTotalByMonth[m] || 0)}</td>)}
              <td style={{ textAlign: 'right', color: 'var(--accent-amber)', fontSize: 14 }}>฿{fmt(indirectGrandTotal)}</td>
            </tr>

            <tr style={{ background: 'var(--accent-purple-bg)' }}>
              <td style={{ fontWeight: 800, color: 'var(--accent-purple)' }}>TOTAL VIDEO PRODUCTION</td>
              <td></td>
              {activeMonths.map(m => (
                <td key={m} style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-purple)' }}>
                  ฿{fmt((directTotalByMonth[m] || 0) + (indirectTotalByMonth[m] || 0))}
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
