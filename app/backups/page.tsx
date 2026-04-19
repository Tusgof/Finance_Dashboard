import type { Metadata } from 'next';
import Link from 'next/link';
import BackupList from './BackupList';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Backups | Finance Dashboard',
  description: 'Review and restore saved dashboard snapshots.',
};

export default function BackupsPage() {
  return (
    <div className="backup-list">
      <div className="backup-page-header">
        <Link href="/" className="back-btn">Back</Link>
        <h1>Backup History</h1>
      </div>
      <BackupList />
    </div>
  );
}
