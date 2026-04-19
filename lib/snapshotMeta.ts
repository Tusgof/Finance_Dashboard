import fs from 'fs';
import type { DataSnapshotMeta } from './types';

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function field(record: RawRecord, names: string[]): unknown {
  for (const name of names) {
    if (name in record) return record[name];
    const lower = name.toLowerCase();
    if (lower in record) return record[lower];
  }
  return undefined;
}

export function normalizeSnapshotMeta(value: unknown): DataSnapshotMeta | undefined {
  if (!isRecord(value)) return undefined;

  const capturedAt = normalizeText(field(value, ['capturedAt', 'captured at', 'refreshAt', 'refresh at', 'generatedAt', 'generated at']));
  if (!capturedAt) return undefined;

  return {
    capturedAt,
    sourceLabel: normalizeText(field(value, ['sourceLabel', 'source label'])) || 'Snapshot data',
    sourceKind: normalizeText(field(value, ['sourceKind', 'source kind'])) === 'legacy' ? 'legacy' : 'snapshot',
    sourceUrl: normalizeText(field(value, ['sourceUrl', 'source url'])) || undefined,
  };
}

export function createSnapshotMeta(sourceUrl: string, capturedAt = new Date().toISOString()): DataSnapshotMeta {
  return {
    capturedAt,
    sourceLabel: 'Google Sheets export snapshot',
    sourceKind: 'snapshot',
    sourceUrl,
  };
}

export function createLegacySnapshotMeta(capturedAt: string, sourceLabel = 'Legacy snapshot file'): DataSnapshotMeta {
  return {
    capturedAt,
    sourceLabel,
    sourceKind: 'legacy',
  };
}

export function buildLegacySnapshotMeta(filePath: string, sourceLabel = 'Legacy snapshot file'): DataSnapshotMeta {
  if (!fs.existsSync(filePath)) {
    return createLegacySnapshotMeta(new Date().toISOString(), sourceLabel);
  }

  return createLegacySnapshotMeta(fs.statSync(filePath).mtime.toISOString(), sourceLabel);
}

export function ensureSnapshotMeta(value: unknown, sourcePath: string, sourceLabel = 'Restored legacy backup'): Record<string, unknown> {
  if (!isRecord(value)) {
    return { snapshotMeta: buildLegacySnapshotMeta(sourcePath, sourceLabel) };
  }

  return value.snapshotMeta
    ? value
    : { ...value, snapshotMeta: buildLegacySnapshotMeta(sourcePath, sourceLabel) };
}
