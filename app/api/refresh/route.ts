import { NextResponse } from 'next/server';
import path from 'path';
import { persistRefreshSnapshot, readJsonArray, shouldPersistRefreshSnapshot } from '@/lib/refreshPersistence';
import { SHEET_GIDS } from '@/lib/settingsDefaults';
import { loadSettings } from '@/lib/settings';
import { buildSupportSheetValidationIssues, buildValidationReport, normalizeDataFile, parseProductionSummaryCSV, parseSponsorPipelineCSV, parseTransactionCsv } from '@/lib/transactionModel';
import { createSnapshotMeta } from '@/lib/snapshotMeta';
import { selectSupportSheetRows } from '@/lib/supportSheetRefresh';
import type { ProductionSummaryRow, SponsorPipelineDeal, ValidationIssue } from '@/lib/types';

function resolveDataPath(configuredPath: string): string {
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
}

function buildSnapshotMeta(sourceUrl: string) {
  return createSnapshotMeta(sourceUrl);
}

function buildSheetCsvUrl(sheetId: string, sheetName: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

function buildSheetCsvUrlByGid(sheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`;
}

function buildSupportSheetFetchFailedIssue(sheetName: string, detail: string): ValidationIssue {
  return {
    code: 'support-sheet-fetch-failed',
    scope: 'management',
    severity: 'warning',
    message: `${sheetName} could not be refreshed: ${detail}.`,
    field: sheetName,
    value: detail,
  };
}

async function fetchOptionalSheet<T>(
  sheetId: string,
  sheetName: string,
  kind: 'production-summary' | 'sponsor-pipeline',
  parser: (csv: string) => T[]
): Promise<{ rows: T[]; issues: ValidationIssue[] }> {
  try {
    const response = await fetch(buildSheetCsvUrl(sheetId, sheetName));
    if (!response.ok) {
      return {
        rows: [],
        issues: [buildSupportSheetFetchFailedIssue(sheetName, `HTTP ${response.status}`)],
      };
    }

    const csv = await response.text();
    const issues = buildSupportSheetValidationIssues(sheetName, csv, kind);
    return {
      rows: parser(csv),
      issues,
    };
  } catch (error) {
    return {
      rows: [],
      issues: [
        buildSupportSheetFetchFailedIssue(
          sheetName,
          error instanceof Error ? error.message : 'unknown fetch failure'
        ),
      ],
    };
  }
}

export async function POST() {
  try {
    const settings = loadSettings();
    const csvResponse = await fetch(settings.refresh.csvExportUrl);
    if (!csvResponse.ok) {
      return NextResponse.json({ error: `Failed to fetch Google Sheets: ${csvResponse.status}` }, { status: 502 });
    }

    const csv = await csvResponse.text();
    const parsed = parseTransactionCsv(csv, settings, { requireExplicitTransactionMarkers: true });
    const [productionSummaryResult, sponsorPipelineResult, listsResult] = await Promise.all([
      fetchOptionalSheet(settings.refresh.sheetId, 'Monthly Production Summary', 'production-summary', parseProductionSummaryCSV),
      fetchOptionalSheet(settings.refresh.sheetId, 'Sponsor Pipeline', 'sponsor-pipeline', parseSponsorPipelineCSV),
      (async () => {
        try {
          const response = await fetch(buildSheetCsvUrlByGid(settings.refresh.sheetId, SHEET_GIDS.lists));
          if (!response.ok) {
            return {
              issues: [buildSupportSheetFetchFailedIssue('Lists', `HTTP ${response.status}`)],
            };
          }

          const csvText = await response.text();
          return {
            issues: buildSupportSheetValidationIssues('Lists', csvText, 'lists'),
          };
        } catch (error) {
          return {
            issues: [
              buildSupportSheetFetchFailedIssue(
                'Lists',
                error instanceof Error ? error.message : 'unknown fetch failure'
              ),
            ],
          };
        }
      })(),
    ]);

    const productionSummaryPath = resolveDataPath(settings.refresh.productionSummaryPath);
    const sponsorPipelinePath = resolveDataPath(settings.refresh.sponsorPipelinePath);
    const allowLocalFallback = shouldPersistRefreshSnapshot();
    const localProductionSummaryRows = allowLocalFallback ? (readJsonArray<ProductionSummaryRow>(productionSummaryPath) ?? []) : [];
    const localSponsorPipelineRows = allowLocalFallback ? (readJsonArray<SponsorPipelineDeal>(sponsorPipelinePath) ?? []) : [];
    const productionSummary = selectSupportSheetRows({
      sheetName: 'Monthly Production Summary',
      fetchedRows: productionSummaryResult.rows,
      fetchedIssues: productionSummaryResult.issues,
      localRows: localProductionSummaryRows,
      allowLocalFallback,
    });
    const sponsorPipeline = selectSupportSheetRows({
      sheetName: 'Sponsor Pipeline',
      fetchedRows: sponsorPipelineResult.rows,
      fetchedIssues: sponsorPipelineResult.issues,
      localRows: localSponsorPipelineRows,
      allowLocalFallback,
    });

    const fileContent = normalizeDataFile(
      {
        ...parsed.dataFile,
        productionSummary: productionSummary.rows,
        sponsorPipeline: sponsorPipeline.rows,
        snapshotMeta: buildSnapshotMeta(csvResponse.url || settings.refresh.csvExportUrl),
      },
      settings
    );
    const validationReport = buildValidationReport(
      parsed.rowIssues,
      fileContent.rawData,
      productionSummary.rows,
      [...productionSummary.issues, ...sponsorPipeline.issues, ...listsResult.issues]
    );
    const snapshotContent = {
      ...fileContent,
      validationReport,
    };

    const persistence = persistRefreshSnapshot({
      snapshotContent,
      productionSummaryRows: productionSummary.rows,
      sponsorPipelineRows: sponsorPipeline.rows,
      productionSummaryPath,
      sponsorPipelinePath,
    });

    return NextResponse.json({
      success: true,
      ...snapshotContent,
      count: snapshotContent.rawData.length,
      productionSummaryCount: productionSummary.rows.length,
      sponsorPipelineCount: sponsorPipeline.rows.length,
      persistence,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
