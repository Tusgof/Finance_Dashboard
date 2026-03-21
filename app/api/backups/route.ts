import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { BackupMeta, DataFile } from '@/lib/types';

export async function GET() {
  const backupDir = path.join(process.cwd(), 'data', 'backups');

  if (!fs.existsSync(backupDir)) {
    return NextResponse.json([]);
  }

  const files = fs
    .readdirSync(backupDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse(); // newest first

  const metas: BackupMeta[] = files.map(filename => {
    const filePath = path.join(backupDir, filename);
    let count = 0;
    let openingBalance = 0;

    try {
      const content: DataFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      count = content.rawData?.length ?? 0;
      openingBalance = content.openingBalance ?? 0;
    } catch {
      // skip malformed
    }

    // Filename format: 2026-03-21T10-30-00.json → ISO timestamp
    const tsRaw = filename.replace('.json', '').replace(/T(\d{2})-(\d{2})-(\d{2})$/, 'T$1:$2:$3');
    const timestamp = new Date(tsRaw).toISOString();

    return { filename, timestamp, count, openingBalance };
  });

  return NextResponse.json(metas);
}
