'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BackupMeta } from '@/lib/types';
import { fmt } from '@/lib/dataUtils';

export default function BackupList() {
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/backups')
      .then(r => r.json())
      .then((data: BackupMeta[]) => {
        setBackups(data);
        setLoading(false);
      });
  }, []);

  const handleRestore = async (filename: string) => {
    if (!confirm(`Restore backup "${filename}"? Current data will be backed up first.`)) return;
    setRestoring(filename);
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });
    if (res.ok) {
      router.push('/');
    } else {
      const err = await res.json();
      alert('Restore failed: ' + (err.error ?? 'Unknown error'));
      setRestoring(null);
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading backups...</p>;
  }

  if (backups.length === 0) {
    return (
      <div className="no-backups">
        <p>No backups found.</p>
        <p style={{ marginTop: 8 }}>Use the Refresh button on the dashboard to create one.</p>
      </div>
    );
  }

  return (
    <div>
      {backups.map(b => {
        const dt = new Date(b.timestamp);
        const display = isNaN(dt.getTime())
          ? b.filename
          : dt.toLocaleString('th-TH', {
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            });

        return (
          <div key={b.filename} className="backup-item">
            <div className="backup-item-info">
              <div className="backup-item-time">{display}</div>
              <div className="backup-item-meta">
                {b.count} transactions &middot; Opening Balance: ฿{fmt(b.openingBalance)}
              </div>
            </div>
            <button
              className="restore-btn"
              disabled={restoring === b.filename}
              onClick={() => handleRestore(b.filename)}
            >
              {restoring === b.filename ? 'Restoring...' : 'Restore'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
