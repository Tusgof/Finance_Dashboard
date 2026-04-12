'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboard } from './DashboardContext';
import { fmt } from '@/lib/dataUtils';

const PAGE_SIZE = 20;

export default function TransactionTable() {
  const { filteredData } = useDashboard();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const s = search.toLowerCase().trim();
  const rows = useMemo(() => {
    return s
      ? filteredData.filter((d) =>
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

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [s, filteredData]);

  return (
    <div className="table-card">
      <div className="table-header">
        <div>
          <h3>Transaction Details</h3>
          <p className="table-caption">Paged ledger for quick checks without endless scrolling.</p>
        </div>
        <input
          type="text"
          className="search-box"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
            {pagedRows.length === 0 && (
              <tr>
                <td colSpan={11} className="empty-state">
                  No transactions match the current search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ledger-footer">
        <div className="ledger-meta">Showing {pagedRows.length} of {rows.length} rows</div>
        <div className="ledger-pagination">
          <button
            type="button"
            className="ledger-page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage >= pageCount}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
