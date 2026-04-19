import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { loadSettings } from '@/lib/settings';
import { normalizeDataFile } from '@/lib/transactionModel';
import { buildLegacySnapshotMeta } from '@/lib/snapshotMeta';

function readJson(filePath: string): unknown {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function resolveDataPath(configuredPath: string): string {
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
}

function buildFallbackSnapshotMeta(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return buildLegacySnapshotMeta(filePath, 'Empty snapshot');
  }

  return buildLegacySnapshotMeta(filePath, 'Legacy snapshot file');
}

export async function GET() {
  const settings = loadSettings();
  const currentPath = path.join(process.cwd(), 'data', 'current.json');
  const productionSummaryPath = resolveDataPath(settings.refresh.productionSummaryPath);
  const sponsorPipelinePath = resolveDataPath(settings.refresh.sponsorPipelinePath);

  try {
    const current = readJson(currentPath) ?? {
      rawData: [],
      openingBalance: settings.refresh.fallbackOpeningBalance,
    };

    const record = current && typeof current === 'object' && !Array.isArray(current)
      ? current as Record<string, unknown>
      : {};

    const merged = {
      ...record,
      productionSummary: readJson(productionSummaryPath) ?? record.productionSummary ?? [],
      sponsorPipeline: readJson(sponsorPipelinePath) ?? record.sponsorPipeline ?? [],
      snapshotMeta: record.snapshotMeta ?? buildFallbackSnapshotMeta(currentPath),
    };

    return NextResponse.json(normalizeDataFile(merged, settings, buildFallbackSnapshotMeta(currentPath)));
  } catch {
    return NextResponse.json(
      normalizeDataFile(
        {
          rawData: [],
          openingBalance: settings.refresh.fallbackOpeningBalance,
          productionSummary: [],
          sponsorPipeline: [],
          snapshotMeta: buildFallbackSnapshotMeta(currentPath),
        },
        settings,
        buildFallbackSnapshotMeta(currentPath)
      )
    );
  }
}
