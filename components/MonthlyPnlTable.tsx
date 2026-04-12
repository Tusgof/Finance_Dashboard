'use client';

import { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import type { Transaction } from '@/lib/types';
import { fmt, formatMonthLabel } from '@/lib/dataUtils';

function sumBy(rows: Transaction[], predicate: (row: Transaction) => boolean): number {
  return rows.filter(predicate).reduce((sum, row) => sum + row.amount, 0);
}

export default function MonthlyPnlTable() {
  const { filteredData } = useDashboard();

  const rows = useMemo(() => {
    const months = Array.from(new Set(filteredData.map(d => d.month))).sort();

    return months.map(month => {
      const monthData = filteredData.filter(d => d.month === month);
      const revenue = sumBy(monthData, row => row.type === 'Inflow');
      const cogs = sumBy(monthData, row => row.type === 'Outflow' && row.category === 'เธ•เนเธเธ—เธธเธเธชเธดเธเธเนเธฒ');
      const opex = sumBy(monthData, row => row.type === 'Outflow' && row.category === 'เธเนเธฒเนเธเนเธเนเธฒเธขเธ”เธณเน€เธเธดเธเธเธฒเธ');
      const totalOut = sumBy(monthData, row => row.type === 'Outflow');
      const net = revenue - totalOut;
      const grossMargin = revenue > 0 ? ((revenue - cogs) / revenue) * 100 : null;
      const opMargin = revenue > 0 ? ((revenue - cogs - opex) / revenue) * 100 : null;

      return { month, revenue, cogs, opex, totalOut, net, grossMargin, opMargin };
    });
  }, [filteredData]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          revenue: acc.revenue + row.revenue,
          cogs: acc.cogs + row.cogs,
          opex: acc.opex + row.opex,
          totalOut: acc.totalOut + row.totalOut,
          net: acc.net + row.net,
        }),
        { revenue: 0, cogs: 0, opex: 0, totalOut: 0, net: 0 }
      ),
    [rows]
  );

  return (
    <div className="table-card pnl-table-card">
      <div className="table-header">
        <div>
          <h3>Monthly P&amp;L</h3>
          <p className="table-caption">Built directly from transaction data using the work month.</p>
        </div>
      </div>
      <div className="table-scroll">
        <table className="pnl-table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="align-right">Revenue</th>
              <th className="align-right">COGS</th>
              <th className="align-right">OpEx</th>
              <th className="align-right">Net</th>
              <th className="align-right">Gross %</th>
              <th className="align-right">Oper %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.month}>
                <td>{formatMonthLabel(row.month)}</td>
                <td className="align-right amount-positive">฿{fmt(row.revenue)}</td>
                <td className="align-right amount-negative">฿{fmt(row.cogs)}</td>
                <td className="align-right amount-negative">฿{fmt(row.opex)}</td>
                <td className={`align-right ${row.net >= 0 ? 'amount-positive' : 'amount-negative'}`}>
                  ฿{fmt(row.net)}
                </td>
                <td className="align-right">{row.grossMargin === null ? '-' : `${row.grossMargin.toFixed(1)}%`}</td>
                <td className="align-right">{row.opMargin === null ? '-' : `${row.opMargin.toFixed(1)}%`}</td>
              </tr>
            ))}
            <tr className="row-total">
              <td>Total</td>
              <td className="align-right">฿{fmt(totals.revenue)}</td>
              <td className="align-right">฿{fmt(totals.cogs)}</td>
              <td className="align-right">฿{fmt(totals.opex)}</td>
              <td className="align-right">฿{fmt(totals.net)}</td>
              <td className="align-right">-</td>
              <td className="align-right">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
