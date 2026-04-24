import fs from 'fs';
import path from 'path';

import type { DataFile, ProductionSummaryRow, SponsorPipelineDeal } from './types';

export interface RefreshPersistenceResult {
  mode: 'filesystem' | 'stateless';
  skippedReason?: string;
}

export interface PersistRefreshSnapshotOptions {
  snapshotContent: DataFile;
  productionSummaryRows: ProductionSummaryRow[];
  sponsorPipelineRows: SponsorPipelineDeal[];
  productionSummaryPath: string;
  sponsorPipelinePath: string;
  dataDir?: string;
  vercel?: string | undefined;
}

export function isVercelStatelessRuntime(vercel: string | undefined = process.env.VERCEL): boolean {
  return Boolean(vercel);
}

export function shouldPersistRefreshSnapshot(vercel: string | undefined = process.env.VERCEL): boolean {
  return !isVercelStatelessRuntime(vercel);
}

export function getRestoreUnavailableMessage(): string {
  return 'Restore is only available in local filesystem mode.';
}

function writeJsonFileAtomic(filePath: string, value: unknown): void {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } finally {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Ignore cleanup failures after a write attempt.
      }
    }
  }
}

export function readJsonArray<T>(filePath: string): T[] | undefined {
  if (!fs.existsSync(filePath)) return undefined;

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Array.isArray(parsed) ? (parsed as T[]) : undefined;
  } catch {
    return undefined;
  }
}

export function persistRefreshSnapshot({
  snapshotContent,
  productionSummaryRows,
  sponsorPipelineRows,
  productionSummaryPath,
  sponsorPipelinePath,
  dataDir = path.join(process.cwd(), 'data'),
  vercel = process.env.VERCEL,
}: PersistRefreshSnapshotOptions): RefreshPersistenceResult {
  if (!shouldPersistRefreshSnapshot(vercel)) {
    return {
      mode: 'stateless',
      skippedReason: 'Vercel serverless filesystem is read-only; refreshed data is returned directly.',
    };
  }

  const currentPath = path.join(dataDir, 'current.json');
  const backupDir = path.join(dataDir, 'backups');

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  if (fs.existsSync(currentPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    fs.copyFileSync(currentPath, path.join(backupDir, `${timestamp}.json`));
  }

  writeJsonFileAtomic(productionSummaryPath, productionSummaryRows);
  writeJsonFileAtomic(sponsorPipelinePath, sponsorPipelineRows);
  writeJsonFileAtomic(currentPath, snapshotContent);

  return { mode: 'filesystem' };
}
