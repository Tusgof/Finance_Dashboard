'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboard } from './DashboardContext';
import { fmt } from '@/lib/dataUtils';
import { buildMonthlyCashReconciliationRows, normalizeTransactions } from '@/lib/dashboardMetrics';

const PAGE_SIZE = 20;

export default function TransactionTable() {
  const { rawData, filteredData, openingBalance, currentFilter } = useDashboard();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState('');

  const s = search.toLowerCase().trim();
  const normalizedData = useMemo(() => normalizeTransactions(rawData), [rawData]);
  const monthlyReconciliation = useMemo(
    () => buildMonthlyCashReconciliationRows(normalizedData, openingBalance),
    [normalizedData, openingBalance]
  );
  const monthFilter = /^\d{4}-\d{2}$/.test(currentFilter) ? currentFilter : '';
  const rows = useMemo(() => {
    return s
      ? filteredData.filter(d =>
          d.desc.toLowerCase().includes(s) ||
          d.category.toLowerCase().includes(s) ||
          (d.mainCategory ?? '').toLowerCase().includes(s) ||
          (d.subCategory ?? '').toLowerCase().includes(s) ||
          (d.person ?? '').toLowerCase().includes(s) ||
          (d.sponsor ?? '').toLowerCase().includes(s) ||
          (d.entity ?? '').toLowerCase().includes(s) ||
          d.type.toLowerCase().includes(s) ||
          d.status.toLowerCase().includes(s)
        )
      : filteredData;
  }, [filteredData, s]);
  const selectedMonthRow = useMemo(
    () => monthlyReconciliation.find(row => row.month === selectedMonth) ?? monthlyReconciliation.at(-1) ?? null,
    [monthlyReconciliation, selectedMonth]
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [s, filteredData]);

  useEffect(() => {
    if (monthlyReconciliation.length === 0) {
      if (selectedMonth !== '') setSelectedMonth('');
      return;
    }

    if (monthFilter && monthlyReconciliation.some(row => row.month === monthFilter)) {
      if (selectedMonth !== monthFilter) setSelectedMonth(monthFilter);
      return;
    }

    if (!selectedMonth || !monthlyReconciliation.some(row => row.month === selectedMonth)) {
      const fallbackMonth = monthlyReconciliation.at(-1)?.month ?? '';
      if (selectedMonth !== fallbackMonth) setSelectedMonth(fallbackMonth);
    }
  }, [monthFilter, monthlyReconciliation, selectedMonth]);

  return (
    <>
      <div className="table-card" style={{ marginBottom: 16 }}>
        <div className="table-header">
          <div>
            <h3>Monthly Cash Reconciliation</h3>
            <p className="table-caption">Exact month cash truth derived from the same monthly cash rows used by the chart.</p>
          </div>
          <label style={{ display: 'grid', gap: 6, minWidth: 0, width: '100%', maxWidth: 240 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Work Month</span>
            <select
              className="search-box"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              disabled={monthlyReconciliation.length === 0}
            >
              {monthlyReconciliation.map(row => (
                <option key={row.month} value={row.month}>
                  {row.month}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedMonthRow ? (
          <>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 12 }}>
              {[
                ['Opening', selectedMonthRow.openingBalance],
                ['Inflow', selectedMonthRow.inflow],
                ['Outflow', selectedMonthRow.outflow],
                ['Net', selectedMonthRow.net],
                ['Closing', selectedMonthRow.closingBalance],
              ].map(([label, value]) => (
                <div key={label as string} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', background: 'var(--surface)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label as string}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    THB {fmt(Number(value))}
                  </div>
                </div>
              ))}
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Main Category</th>
                    <th>Description</th>
                    <th>Amount (THB)</th>
                    <th>Status</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMonthRow.rows.map((d, i) => (
                    <tr key={`${d.date}-${d.description}-${i}`}>
                      <td style={{ whiteSpace: 'nowrap' }}>{d.date}</td>
                      <td>
                        <span className={`type-${d.type.toLowerCase()}`}>
                          {d.type === 'Inflow' ? 'โ–ฒ ' : 'โ–ผ '}
                          {d.type}
                        </span>
                      </td>
                      <td>{d.mainCategory}</td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.description}>
                        {d.description}
                      </td>
                      <td className={d.type === 'Inflow' ? 'amount-positive' : 'amount-negative'}>
                        {d.type === 'Inflow' ? '+' : '-'}THB {fmt(d.amount)}
                      </td>
                      <td>
                        <span className={`badge badge-${d.status.toLowerCase()}`}>{d.status}</span>
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: d.balance >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)' }}>
                        THB {fmt(d.balance)}
                      </td>
                    </tr>
                  ))}
                  {selectedMonthRow.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-state">
                        No active rows exist for the selected month.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="empty-state">No monthly reconciliation data is available for this ledger scope.</div>
        )}
      </div>

      <div className="table-card">
      <div className="table-header">
        <div>
          <h3>Transaction Ledger</h3>
          <p className="table-caption">Paged ledger for quick checks without endless scrolling.</p>
        </div>
        <input
          type="text"
          className="search-box"
          placeholder="Search transactions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Work Month</th>
              <th>Type</th>
              <th>Main Category</th>
              <th>Sub Category</th>
              <th>Description</th>
              <th>Amount (THB)</th>
              <th>Status</th>
              <th>Person</th>
              <th>Sponsor</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((d, i) => (
              <tr key={`${d.date}-${d.desc}-${i}`}>
                <td style={{ whiteSpace: 'nowrap' }}>{d.date}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{d.workMonth || d.month}</td>
                <td>
                  <span className={`type-${d.type.toLowerCase()}`}>
                    {d.type === 'Inflow' ? '▲ ' : '▼ '}
                    {d.type}
                  </span>
                </td>
                <td>{d.mainCategory || '-'}</td>
                <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.subCategory || d.category}>
                  {d.subCategory || d.category}
                </td>
                <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.desc}>
                  {d.desc}
                </td>
                <td className={d.type === 'Inflow' ? 'amount-positive' : 'amount-negative'}>
                  {d.type === 'Inflow' ? '+' : '-'}฿{fmt(d.amount)}
                </td>
                <td>
                  <span className={`badge badge-${d.status.toLowerCase()}`}>{d.status}</span>
                </td>
                <td>{d.person || '-'}</td>
                <td>{d.sponsor || '-'}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums', color: d.balance >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)' }}>
                  ฿{fmt(d.balance)}
                </td>
              </tr>
            ))}
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="empty-state">
                  No transactions match the current search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="ledger-footer">
        <div className="ledger-meta">Showing {pagedRows.length} of {rows.length} rows</div>
        <div className="ledger-pagination">
          <button
            type="button"
            className="ledger-page-btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            Prev
          </button>
          <span className="ledger-page-indicator">
            Page {safePage} of {pageCount}
          </span>
          <button
            type="button"
            className="ledger-page-btn"
            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            disabled={safePage >= pageCount}
          >
            Next
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
