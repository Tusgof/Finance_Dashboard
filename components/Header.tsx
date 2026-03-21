'use client';

import Link from 'next/link';

interface HeaderProps {
  onRefresh: () => void;
  refreshing: boolean;
  lastRefresh: string | null;
}

export default function Header({ onRefresh, refreshing, lastRefresh }: HeaderProps) {
  return (
    <div className="header">
      <div className="header-left">
        <div className="logo">E</div>
        <div className="header-title">
          <h1>EasyMoneyConcept</h1>
          <span>Financial Dashboard · Jan - Jun 2026</span>
        </div>
      </div>
      <div className="header-right">
        {lastRefresh && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Updated {new Date(lastRefresh).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button className="refresh-btn" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? '↻ Refreshing...' : '↻ Refresh'}
        </button>
        <Link href="/backups" className="backup-link">
          Backups
        </Link>
        <span className="status-badge status-live">Live Data</span>
      </div>
    </div>
  );
}
