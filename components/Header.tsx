'use client';

import Link from 'next/link';
import type { DataSnapshotMeta } from '@/lib/types';

interface HeaderProps {
  onRefresh: () => void;
  refreshing: boolean;
  snapshotMeta?: DataSnapshotMeta | null;
}

export default function Header({ onRefresh, refreshing, snapshotMeta }: HeaderProps) {
  const snapshotStamp = snapshotMeta?.capturedAt ? new Date(snapshotMeta.capturedAt) : null;
  const snapshotLabel = snapshotStamp && !Number.isNaN(snapshotStamp.getTime())
    ? `${snapshotMeta?.sourceLabel ?? 'Latest snapshot'} - ${snapshotStamp.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}`
    : (snapshotMeta?.sourceLabel ?? 'Latest snapshot');

  return (
    <div className="header">
      <div className="header-left">
        <div className="logo">E</div>
        <div className="header-title">
          <h1>Finance Dashboard</h1>
          <span>Weekly and monthly management dashboard</span>
        </div>
      </div>
      <div className="header-right">
        {snapshotMeta ? (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{snapshotLabel}</span>
        ) : null}
        <button className="refresh-btn" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        <Link href="/settings" className="backup-link">
          Settings
        </Link>
        <Link href="/backups" className="backup-link">
          Backups
        </Link>
        <span className="status-badge status-snapshot">Snapshot</span>
      </div>
    </div>
  );
}
