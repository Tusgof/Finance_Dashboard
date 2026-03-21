'use client';

import { useState } from 'react';
import { useDashboard } from './DashboardContext';
import { fmt } from '@/lib/dataUtils';

export default function TransactionTable() {
  const { filteredData } = useDashboard();
  const [search, setSearch] = useState('');

  const s = search.toLowerCase();
  const rows = s
    ? filteredData.filter(d =>
        d.desc.toLowerCase().includes(s) ||
        d.category.toLowerCase().includes(s) ||
        d.entity.toLowerCase().includes(s) ||
        d.type.toLowerCase().includes(s)
      )
    : filteredData;

  return (
    <div className="table-card">
      <div className="table-header">
        <h3>Transaction Details</h3>
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
              <th>Type</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount (THB)</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Entity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: 'nowrap' }}>{d.date}</td>
                <td>
                  <span className={`type-${d.type.toLowerCase()}`}>
                    {d.type === 'Inflow' ? '▲ ' : '▼ '}{d.type}
                  </span>
                </td>
                <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.category}>
                  {d.category}
                </td>
                <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.desc}>
                  {d.desc}
                </td>
                <td className={d.type === 'Inflow' ? 'amount-positive' : 'amount-negative'}>
                  {d.type === 'Inflow' ? '+' : '-'}฿{fmt(d.amount)}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums', color: d.balance >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)' }}>
                  ฿{fmt(d.balance)}
                </td>
                <td><span className={`badge badge-${d.status.toLowerCase()}`}>{d.status}</span></td>
                <td style={{ color: 'var(--text-secondary)' }}>{d.entity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
