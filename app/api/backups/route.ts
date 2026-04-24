import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { loadSettings } from '@/lib/settings';
import { shouldPersistRefreshSnapshot } from '@/lib/refreshPersistence';
import type { BackupMeta } from '@/lib/types';
import { normalizeDataFile } from '@/lib/transactionModel';

export async function GET() {
  if (!shouldPersistRefreshSnapshot()) {
    return NextResponse.json([]);
  }

  const settings = loadSettings();
  const backupDir = path.join(process.cwd(), 'data', 'backups');

  if (!fs.existsSync(backupDir)) {
    return NextResponse.json([]);
  }

  const files = fs
    .readdirSync(backupDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();

  const metas: BackupMeta[] = files.map(filename => {
    const filePath = path.join(backupDir, filename);
    let count = 0;
    let openingBalance = 0;

    try {
      const parsed = normalizeDataFile(JSON.parse(fs.readFileSync(filePath, 'utf-8')), settings);
      count = parsed.rawData.length;
      openingBalance = parsed.openingBalance;
    } catch {
      // skip malformed files
    }

    const tsRaw = filename.replace('.json', '').replace(/T(\d{2})-(\d{2})-(\d{2})$/, 'T$1:$2:$3');
    const timestamp = new Date(tsRaw).toISOString();

    return { filename, timestamp, count, openingBalance };
  });

  return NextResponse.json(metas);
}
