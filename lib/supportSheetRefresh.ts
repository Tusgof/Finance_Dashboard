import type { ValidationIssue } from './types';

export interface SupportSheetRefreshSelection<T> {
  sheetName: string;
  fetchedRows: T[];
  fetchedIssues: ValidationIssue[];
  localRows?: T[];
  allowLocalFallback: boolean;
}

export interface SupportSheetRefreshResult<T> {
  rows: T[];
  issues: ValidationIssue[];
  usedLocalFallback: boolean;
}

function buildLocalFallbackIssue(sheetName: string, rowCount: number): ValidationIssue {
  return {
    code: 'support-sheet-local-fallback',
    level: 'info',
    message: `${sheetName} refresh was unusable, so the previous local snapshot with ${rowCount} rows was kept.`,
    field: sheetName,
    value: String(rowCount),
  };
}

export function selectSupportSheetRows<T>({
  sheetName,
  fetchedRows,
  fetchedIssues,
  localRows = [],
  allowLocalFallback,
}: SupportSheetRefreshSelection<T>): SupportSheetRefreshResult<T> {
  const canFallback = allowLocalFallback && localRows.length > 0 && (fetchedIssues.length > 0 || fetchedRows.length === 0);
  if (canFallback) {
    return {
      rows: localRows,
      issues: [...fetchedIssues, buildLocalFallbackIssue(sheetName, localRows.length)],
      usedLocalFallback: true,
    };
  }

  return {
    rows: fetchedRows,
    issues: fetchedIssues,
    usedLocalFallback: false,
  };
}
