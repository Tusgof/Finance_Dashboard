import type {
  DashboardSettings,
  DataFile,
  DataSnapshotMeta,
  ProductionSummaryRow,
  SponsorPipelineDeal,
  ValidationIssue,
  ValidationReport,
  RawTransactionRow,
  Transaction,
  TransactionStatus,
  TransactionType,
} from './types';
import { normalizeSnapshotMeta } from './snapshotMeta';

type RawRecord = Record<string, unknown>;

const VALID_ENTITIES: NonNullable<Transaction['entity']>[] = [
  'Revenue',
  'Video Production',
  'News Production',
  'Administrative',
  'Finance',
  'Marketing',
];

const VALID_STATUS_VALUES: TransactionStatus[] = ['Actual', 'Committed', 'Forecast', 'Cancelled'];
const VALID_MAIN_CATEGORIES: NonNullable<Transaction['mainCategory']>[] = ['Revenue', 'COGS', 'OpEx', 'CapEx'];

const CAPEX_KEYWORDS = ['capex', 'capital', 'asset', 'equipment', 'อุปกรณ์', 'ลงทุน'];
const MARKETING_KEYWORDS = ['marketing', 'ads', 'facebook', 'meta', 'tiktok', 'โฆษณา'];
const FINANCE_KEYWORDS = ['finance', 'bank', 'fee', 'tax', 'ภาษี', 'ค่าธรรมเนียม'];
const NEWS_KEYWORDS = ['news', 'ข่าว', 'editorial', 'writer', 'journal'];

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeKey(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/,/g, '').replace(/[฿$]/g, '').trim();
  if (!cleaned) return fallback;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDate(value: unknown): string {
  const text = normalizeText(value);
  if (!text) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const ymdMatch = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
  }

  const dmyMatch = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  return text;
}

function parseMonthName(value: string): string | null {
  const monthIndex: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };

  const match = value.trim().toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const month = monthIndex[match[1]];
  if (!month) return null;
  return `${match[2]}-${String(month).padStart(2, '0')}`;
}

function normalizeMonth(value: unknown): string {
  const text = normalizeText(value);
  if (!text) return '';

  if (/^\d{4}-\d{2}$/.test(text)) return text;
  if (/^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/.test(text)) return normalizeDate(text).slice(0, 7);
  if (/^\d{1,2}[./-]\d{4}$/.test(text)) {
    const [month, year] = text.split(/[./-]/);
    return `${year}-${month.padStart(2, '0')}`;
  }

  const monthName = parseMonthName(text);
  if (monthName) return monthName;

  return text.length >= 7 ? text.slice(0, 7) : '';
}

function isCanonicalDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isCanonicalMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => keyword && text.includes(keyword.toLowerCase()));
}

function pushValidationIssue(issues: ValidationIssue[], issue: ValidationIssue): void {
  issues.push(issue);
}

function buildManagementSupportIssue(
  code: string,
  sheetName: string,
  message: string,
  field?: string,
  value?: string
): ValidationIssue {
  return {
    code,
    scope: 'management',
    severity: 'warning',
    message,
    field: field || sheetName,
    value,
  };
}

function canonicalMainCategory(value: string): Transaction['mainCategory'] | undefined {
  const text = normalizeKey(value);
  if (!text) return undefined;

  if (
    text === 'revenue' ||
    text === 'income' ||
    text === 'inflow' ||
    text.includes('รายได้') ||
    text.includes('สปอนเซอร์')
  ) {
    return 'Revenue';
  }
  if (text === 'cogs' || text.includes('ต้นทุน') || text.includes('cost of goods')) return 'COGS';
  if (
    text === 'opex' ||
    text === 'op ex' ||
    text === 'operating expense' ||
    text.includes('ค่าใช้จ่ายดำเนินงาน') ||
    text.includes('ค่าใช้จ่ายในการดำเนินงาน')
  ) {
    return 'OpEx';
  }
  if (text === 'capex' || text === 'cap ex' || text.includes('เงินลงทุน') || text.includes('capital')) {
    return 'CapEx';
  }
  return undefined;
}

function normalizeMainCategory(
  value: unknown,
  type: TransactionType,
  text: string,
  settings: DashboardSettings
): Transaction['mainCategory'] {
  const explicit = normalizeText(value);
  const canonical = canonicalMainCategory(explicit);
  if (canonical) return canonical;

  if (type === 'Inflow' || containsAny(text, settings.revenueSources.flatMap(source => source.keywords.map(k => k.toLowerCase())))) {
    return 'Revenue';
  }

  if (containsAny(text, settings.costClassification.production.keywords.map(k => k.toLowerCase()))) {
    return 'COGS';
  }

  if (containsAny(text, CAPEX_KEYWORDS)) return 'CapEx';
  return 'OpEx';
}

function normalizeType(value: unknown, mainCategory: Transaction['mainCategory']): TransactionType {
  const text = normalizeKey(normalizeText(value));
  if (text === 'inflow' || text === 'in') return 'Inflow';
  if (text === 'outflow' || text === 'out') return 'Outflow';
  return mainCategory === 'Revenue' ? 'Inflow' : 'Outflow';
}

function normalizeStatus(value: unknown, fallback: TransactionStatus): TransactionStatus {
  const text = normalizeKey(normalizeText(value));
  if (text === 'actual') return 'Actual';
  if (text === 'committed') return 'Committed';
  if (text === 'forecast') return 'Forecast';
  if (text === 'cancelled' || text === 'canceled') return 'Cancelled';
  return fallback;
}

function normalizeEntity(value: unknown, mainCategory: Transaction['mainCategory'], text: string): NonNullable<Transaction['entity']> {
  const explicit = normalizeText(value);
  if (VALID_ENTITIES.includes(explicit as NonNullable<Transaction['entity']>)) {
    return explicit as NonNullable<Transaction['entity']>;
  }

  if (mainCategory === 'Revenue') return 'Revenue';
  if (containsAny(text, MARKETING_KEYWORDS)) return 'Marketing';
  if (containsAny(text, FINANCE_KEYWORDS)) return 'Finance';
  if (containsAny(text, NEWS_KEYWORDS)) return 'News Production';
  if (mainCategory === 'COGS' || containsAny(text, ['production', 'video', 'ตัดต่อ', 'เขียนบท', 'กราฟิก', 'พากย์', 'ฟุตเทจ'])) {
    return 'Video Production';
  }
  return 'Administrative';
}

function normalizeCostBehavior(
  value: unknown,
  mainCategory: Transaction['mainCategory'],
  text: string
): Transaction['costBehavior'] {
  const explicit = normalizeKey(normalizeText(value));
  if (explicit === 'fixed') return 'Fixed';
  if (explicit === 'variable') return 'Variable';
  if (mainCategory === 'COGS' || containsAny(text, ['production', 'video', 'ตัดต่อ', 'เขียนบท', 'กราฟิก', 'พากย์', 'ฟุตเทจ'])) {
    return 'Variable';
  }
  return 'Fixed';
}

function normalizeValidationReport(value: unknown): ValidationReport | undefined {
  if (!isRecord(value)) return undefined;

  const generatedAt = normalizeText(field(value, ['generatedAt', 'generated at'])) || new Date().toISOString();
  const renderingWarnings = Array.isArray(field(value, ['renderingWarnings', 'rendering warnings']))
    ? (field(value, ['renderingWarnings', 'rendering warnings']) as unknown[])
        .filter(isRecord)
        .map((item) => {
          const row = item as RawRecord;
          return {
            code: normalizeText(row.code),
            scope: 'rendering' as const,
            severity: normalizeText(row.severity) === 'error' ? 'error' : 'warning',
            message: normalizeText(row.message),
            rowIndex: typeof row.rowIndex === 'number' ? row.rowIndex : undefined,
            workMonth: normalizeText(row.workMonth) || undefined,
            field: normalizeText(row.field) || undefined,
            value: normalizeText(row.value) || undefined,
          } satisfies ValidationIssue;
        })
        .filter(issue => issue.code && issue.message)
    : [];

  const managementWarnings = Array.isArray(field(value, ['managementWarnings', 'management warnings']))
    ? (field(value, ['managementWarnings', 'management warnings']) as unknown[])
        .filter(isRecord)
        .map((item) => {
          const row = item as RawRecord;
          return {
            code: normalizeText(row.code),
            scope: 'management' as const,
            severity: normalizeText(row.severity) === 'error' ? 'error' : 'warning',
            message: normalizeText(row.message),
            rowIndex: typeof row.rowIndex === 'number' ? row.rowIndex : undefined,
            workMonth: normalizeText(row.workMonth) || undefined,
            field: normalizeText(row.field) || undefined,
            value: normalizeText(row.value) || undefined,
          } satisfies ValidationIssue;
        })
        .filter(issue => issue.code && issue.message)
    : [];

  const issues = [...renderingWarnings, ...managementWarnings];
  return {
    generatedAt,
    renderingReady: renderingWarnings.length === 0,
    managementReady: managementWarnings.length === 0,
    renderingWarnings,
    managementWarnings,
    issues,
  };
}

function field(record: RawRecord, names: string[]): unknown {
  for (const name of names) {
    if (name in record) return record[name];
    const lower = name.toLowerCase();
    if (lower in record) return record[lower];
  }
  return undefined;
}

function buildTransactionValidationIssues(
  record: RawRecord,
  normalized: Transaction,
  rowIndex: number,
  settings: DashboardSettings
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const dateRaw = normalizeText(field(record, ['Date', 'date']));
  const dueDateRaw = normalizeText(field(record, ['Due Date', 'dueDate', 'due date']));
  const workMonthRaw = normalizeText(field(record, ['Work Month', 'workMonth', 'work month', 'Month', 'month', 'month-year']));
  const statusRaw = normalizeText(field(record, ['Status', 'status']));
  const mainCategoryRaw = normalizeText(field(record, ['Main Category', 'mainCategory', 'main category', 'Category', 'category']));
  const amountRaw = field(record, ['Amount', 'amount']);
  const sponsorRaw = normalizeText(field(record, ['Sponsor', 'sponsor']));
  const personRaw = normalizeText(field(record, ['Person', 'person']));
  const costBehaviorRaw = normalizeText(field(record, ['Cost Behavior', 'costBehavior', 'cost behavior']));
  const descriptionRaw = normalizeText(field(record, ['Description', 'description', 'Desc', 'desc']));
  const subCategoryRaw = normalizeText(field(record, ['Sub Category', 'subCategory', 'sub category']));
  const noteRaw = normalizeText(field(record, ['Note', 'note']));
  const entityRaw = normalizeText(field(record, ['Entity', 'entity']));

  const joinedText = [descriptionRaw, subCategoryRaw, sponsorRaw, personRaw, noteRaw, entityRaw]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (dateRaw && !isCanonicalDate(normalizeDate(dateRaw))) {
    pushValidationIssue(issues, {
      code: 'unsupported-date',
      scope: 'rendering',
      severity: 'warning',
      message: `Row ${rowIndex}: Date "${dateRaw}" is not in a supported format.`,
      rowIndex,
      field: 'Date',
      value: dateRaw,
    });
  }

  if (dueDateRaw && !isCanonicalDate(normalizeDate(dueDateRaw))) {
    pushValidationIssue(issues, {
      code: 'unsupported-date',
      scope: 'rendering',
      severity: 'warning',
      message: `Row ${rowIndex}: Due Date "${dueDateRaw}" is not in a supported format.`,
      rowIndex,
      field: 'Due Date',
      value: dueDateRaw,
    });
  }

  if (!workMonthRaw || !isCanonicalMonth(normalizeMonth(workMonthRaw))) {
    pushValidationIssue(issues, {
      code: 'missing-work-month',
      scope: 'rendering',
      severity: 'warning',
      message: `Row ${rowIndex}: Work Month is missing or not normalized to YYYY-MM.`,
      rowIndex,
      field: 'Work Month',
      value: workMonthRaw || undefined,
    });
  }

  const normalizedStatus = normalizeKey(statusRaw);
  if (!normalizedStatus || !VALID_STATUS_VALUES.some(status => normalizeKey(status) === normalizedStatus)) {
    pushValidationIssue(issues, {
      code: 'invalid-status',
      scope: 'management',
      severity: 'warning',
      message: `Row ${rowIndex}: Status "${statusRaw || '(blank)'}" is not one of Actual, Committed, Forecast, or Cancelled.`,
      rowIndex,
      field: 'Status',
      value: statusRaw || undefined,
    });
  }

  const canonicalMainCategoryValue = canonicalMainCategory(mainCategoryRaw);
  if (!canonicalMainCategoryValue || !VALID_MAIN_CATEGORIES.includes(canonicalMainCategoryValue)) {
    pushValidationIssue(issues, {
      code: 'invalid-main-category',
      scope: 'management',
      severity: 'warning',
      message: `Row ${rowIndex}: Main Category "${mainCategoryRaw || '(blank)'}" should be Revenue, COGS, OpEx, or CapEx.`,
      rowIndex,
      field: 'Main Category',
      value: mainCategoryRaw || undefined,
    });
  }

  if (normalized.type === 'Outflow' && !costBehaviorRaw) {
    pushValidationIssue(issues, {
      code: 'missing-cost-behavior',
      scope: 'management',
      severity: 'warning',
      message: `Row ${rowIndex}: Outflow rows should include a Cost Behavior before inference is used.`,
      rowIndex,
      field: 'Cost Behavior',
    });
  }

  const parsedAmount = parseNumber(amountRaw, NaN);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    pushValidationIssue(issues, {
      code: 'invalid-amount',
      scope: 'rendering',
      severity: 'warning',
      message: `Row ${rowIndex}: Amount is blank or zero.`,
      rowIndex,
      field: 'Amount',
      value: normalizeText(amountRaw),
    });
  }

  if (normalized.mainCategory === 'Revenue' && !sponsorRaw) {
    pushValidationIssue(issues, {
      code: 'missing-sponsor',
      scope: 'management',
      severity: 'warning',
      message: `Row ${rowIndex}: Revenue rows should include a Sponsor.`,
      rowIndex,
      field: 'Sponsor',
    });
  }

  const peopleCostKeywords = settings.costClassification.peopleCostKeywords.map(keyword => keyword.toLowerCase());
  if (normalized.type === 'Outflow' && peopleCostKeywords.some(keyword => keyword && joinedText.includes(keyword)) && !personRaw) {
    pushValidationIssue(issues, {
      code: 'missing-person',
      scope: 'management',
      severity: 'warning',
      message: `Row ${rowIndex}: People-cost outflows should include a Person.`,
      rowIndex,
      field: 'Person',
    });
  }

  return issues;
}

function buildProductionSummaryValidationIssues(
  transactions: Transaction[],
  productionSummary: ProductionSummaryRow[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const cogsMonths = new Set(
    transactions
      .filter(row => row.type === 'Outflow' && row.mainCategory === 'COGS' && row.status === 'Actual' && Boolean(row.workMonth))
      .map(row => row.workMonth)
      .filter((month): month is string => Boolean(month))
  );
  const summaryMonths = new Map(productionSummary.map(row => [row.workMonth, row]));
  const tolerance = 0.01;

  Array.from(cogsMonths).sort().forEach((month) => {
    const summary = summaryMonths.get(month);
    if (!summary || summary.totalContent <= 0) {
      pushValidationIssue(issues, {
        code: 'missing-production-summary',
        scope: 'management',
        severity: 'warning',
        message: `Month ${month} has COGS rows but no usable Monthly Production Summary row.`,
        workMonth: month,
        field: 'Monthly Production Summary',
      });
      return;
    }

    const actualCogsTotal = transactions
      .filter(row => row.workMonth === month && row.type === 'Outflow' && row.mainCategory === 'COGS' && row.status === 'Actual')
      .reduce((sum, row) => sum + row.amount, 0);

    if (typeof summary.totalCogs === 'number' && Math.abs(summary.totalCogs - actualCogsTotal) > tolerance) {
      pushValidationIssue(issues, {
        code: 'production-summary-total-cogs-mismatch',
        scope: 'management',
        severity: 'warning',
        message: `Month ${month}: Monthly Production Summary totalCogs (${summary.totalCogs}) does not match actual COGS outflows (${actualCogsTotal}).`,
        workMonth: month,
        field: 'Total COGS',
        value: `${summary.totalCogs}`,
      });
    }

    if (typeof summary.costPerContent === 'number' && summary.totalContent > 0) {
      const expectedCostPerContent = summary.totalCogs === undefined ? undefined : summary.totalCogs / summary.totalContent;
      if (typeof expectedCostPerContent === 'number' && Math.abs(summary.costPerContent - expectedCostPerContent) > tolerance) {
        pushValidationIssue(issues, {
          code: 'production-summary-cost-per-content-mismatch',
          scope: 'management',
          severity: 'warning',
          message: `Month ${month}: Monthly Production Summary costPerContent (${summary.costPerContent}) does not match totalCogs / totalContent (${expectedCostPerContent}).`,
          workMonth: month,
          field: 'Cost per Content',
          value: `${summary.costPerContent}`,
        });
      }
    }
  });

  return issues;
}

type SupportSheetKind = 'production-summary' | 'sponsor-pipeline' | 'lists';

function parseNonEmptyCsvRows(csv: string): string[][] {
  return csv
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);
}

function hasHeaderFields(header: string[], requiredFields: string[]): boolean {
  const headerSet = new Set(header.map(value => normalizeKey(value)));
  return requiredFields.every(field => headerSet.has(normalizeKey(field)));
}

function buildSupportSheetHeaderIssue(sheetName: string, expectedShape: string): ValidationIssue {
  return buildManagementSupportIssue(
    'support-sheet-invalid-header',
    sheetName,
    `${sheetName} has an unexpected header. Expected ${expectedShape}.`,
    sheetName
  );
}

function buildSupportSheetEmptyIssue(sheetName: string, detail: string): ValidationIssue {
  return buildManagementSupportIssue(
    'support-sheet-empty',
    sheetName,
    `${sheetName} looks empty or incomplete: ${detail}.`,
    sheetName
  );
}

export function buildSupportSheetValidationIssues(
  sheetName: string,
  csv: string,
  kind: SupportSheetKind
): ValidationIssue[] {
  const rows = parseNonEmptyCsvRows(csv);
  if (rows.length === 0) {
    return [buildSupportSheetEmptyIssue(sheetName, 'no usable rows were returned')];
  }

  const header = rows[0].map(value => normalizeText(value));
  if (kind === 'production-summary') {
    const expected = ['Work Month', 'Total Content', 'Organic Content', 'Sponsored Content'];
    if (!hasHeaderFields(header, expected)) {
      return [buildSupportSheetHeaderIssue(sheetName, expected.join(', '))];
    }
    const dataRows = rows.slice(1).filter(row => row.some(cell => normalizeText(cell)));
    if (dataRows.length === 0) {
      return [buildSupportSheetEmptyIssue(sheetName, 'no data rows were found after the header')];
    }
    return [];
  }

  if (kind === 'sponsor-pipeline') {
    const expected = ['Sponsor', 'Deal Value', 'Status', 'Probability'];
    if (!hasHeaderFields(header, expected)) {
      return [buildSupportSheetHeaderIssue(sheetName, expected.join(', '))];
    }
    const dataRows = rows.slice(1).filter(row => row.some(cell => normalizeText(cell)));
    if (dataRows.length === 0) {
      return [buildSupportSheetEmptyIssue(sheetName, 'no sponsor pipeline entries were found after the header')];
    }
    return [];
  }

  const normalizedFirstRow = header.slice(0, 4).map(value => normalizeKey(value));
  const matchesGenericHeader = ['a', 'b', 'c', 'd'].every((expected, index) => normalizedFirstRow[index] === expected);
  const matchesCategoryHeader = ['revenue', 'cogs', 'opex', 'capex'].every((expected, index) => normalizedFirstRow[index] === expected);
  if (!matchesGenericHeader && !matchesCategoryHeader) {
    return [buildSupportSheetHeaderIssue(sheetName, 'A, B, C, D or Revenue, COGS, OpEx, CapEx')];
  }

  const optionStartIndex = matchesGenericHeader ? 2 : 1;
  const optionCounts = [0, 0, 0, 0];
  rows.slice(optionStartIndex).forEach((row) => {
    optionCounts.forEach((count, index) => {
      if (normalizeText(row[index])) {
        optionCounts[index] = count + 1;
      }
    });
  });

  const missingColumns = optionCounts
    .map((count, index) => (count > 0 ? '' : ['Revenue', 'COGS', 'OpEx', 'CapEx'][index]))
    .filter(Boolean);
  if (missingColumns.length > 0) {
    return [buildSupportSheetEmptyIssue(sheetName, `no options were found under ${missingColumns.join(', ')}`)];
  }

  return [];
}

export function buildValidationReport(
  transactionIssues: ValidationIssue[],
  transactions: Transaction[],
  productionSummary: ProductionSummaryRow[],
  extraIssues: ValidationIssue[] = []
): ValidationReport {
  const issues = [
    ...transactionIssues,
    ...buildProductionSummaryValidationIssues(transactions, productionSummary),
    ...extraIssues,
  ];
  const renderingWarnings = issues.filter(issue => issue.scope === 'rendering');
  const managementWarnings = issues.filter(issue => issue.scope === 'management');

  return {
    generatedAt: new Date().toISOString(),
    renderingReady: renderingWarnings.length === 0,
    managementReady: managementWarnings.length === 0,
    renderingWarnings,
    managementWarnings,
    issues,
  };
}

export function normalizeTransactionRow(
  record: unknown,
  settings: DashboardSettings,
  fallbackStatus: TransactionStatus = 'Forecast'
): RawTransactionRow | null {
  if (!isRecord(record)) return null;

  const dateRaw = field(record, ['Date', 'date']);
  const dueDateRaw = field(record, ['Due Date', 'dueDate', 'due date']);
  const workMonthRaw = field(record, ['Work Month', 'workMonth', 'work month', 'Month', 'month', 'month-year']);
  const typeRaw = field(record, ['Type', 'type']);
  const mainCategoryRaw = field(record, ['Main Category', 'mainCategory', 'main category', 'Category', 'category']);
  const subCategoryRaw = field(record, ['Sub Category', 'subCategory', 'sub category']);
  const descriptionRaw = field(record, ['Description', 'description', 'Desc', 'desc']);
  const amountRaw = field(record, ['Amount', 'amount']);
  const statusRaw = field(record, ['Status', 'status']);
  const originalForecastRaw = field(record, ['Original Forecast', 'originalForecast', 'original forecast']);
  const personRaw = field(record, ['Person', 'person']);
  const costBehaviorRaw = field(record, ['Cost Behavior', 'costBehavior', 'cost behavior']);
  const sponsorRaw = field(record, ['Sponsor', 'sponsor']);
  const noteRaw = field(record, ['Note', 'note']);
  const entityRaw = field(record, ['Entity', 'entity']);
  const balanceRaw = field(record, ['Balance', 'balance', 'running balance']);

  const description = normalizeText(descriptionRaw) || normalizeText(subCategoryRaw) || normalizeText(mainCategoryRaw);
  const joinedText = [
    normalizeText(mainCategoryRaw),
    normalizeText(subCategoryRaw),
    description,
    normalizeText(sponsorRaw),
    normalizeText(personRaw),
    normalizeText(noteRaw),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const mainCategoryHint = canonicalMainCategory(normalizeText(mainCategoryRaw)) ?? 'OpEx';
  const type = normalizeType(typeRaw, mainCategoryHint);
  const mainCategory = normalizeMainCategory(mainCategoryRaw, type, joinedText, settings);
  const status = normalizeStatus(statusRaw, fallbackStatus);
  const entity = normalizeEntity(entityRaw, mainCategory, joinedText);
  const costBehavior = normalizeCostBehavior(costBehaviorRaw, mainCategory, joinedText);
  const date = normalizeDate(dueDateRaw || dateRaw);
  const dueDate = normalizeDate(dueDateRaw);
  const workMonth = normalizeMonth(workMonthRaw || dueDate || date);

  return {
    date,
    dueDate: dueDate || undefined,
    workMonth,
    month: workMonth,
    type,
    status,
    category: normalizeText(mainCategoryRaw) || (mainCategory ?? 'OpEx'),
    mainCategory,
    subCategory: normalizeText(subCategoryRaw),
    desc: description,
    description,
    amount: parseNumber(amountRaw),
    originalForecast: originalForecastRaw === undefined || originalForecastRaw === null || normalizeText(originalForecastRaw) === ''
      ? undefined
      : parseNumber(originalForecastRaw),
    person: normalizeText(personRaw),
    costBehavior,
    sponsor: normalizeText(sponsorRaw),
    note: normalizeText(noteRaw),
    entity,
    balance: parseNumber(balanceRaw),
  };
}

function recomputeRunningBalances(transactions: RawTransactionRow[], openingBalance: number): RawTransactionRow[] {
  let balance = openingBalance;
  return transactions.map(transaction => {
    if (transaction.status !== 'Cancelled') {
      balance += transaction.type === 'Inflow' ? transaction.amount : -transaction.amount;
    }
    return { ...transaction, balance };
  });
}

function normalizeTransactions(value: unknown, settings: DashboardSettings): RawTransactionRow[] {
  if (!Array.isArray(value)) return [];
  const rows = value
    .map(item => normalizeTransactionRow(item, settings))
    .filter((item): item is Transaction => Boolean(item));
  return recomputeRunningBalances(rows, 0);
}

function normalizeProductionSummaryRow(value: unknown): ProductionSummaryRow | null {
  if (!isRecord(value)) return null;
  const workMonth = normalizeMonth(field(value, ['Work Month', 'workMonth', 'work month', 'month']));
  if (!workMonth) return null;
  return {
    workMonth,
    totalContent: parseNumber(field(value, ['Total Content', 'totalContent', 'total content'])),
    organicContent: parseNumber(field(value, ['Organic Content', 'organicContent', 'organic content'])),
    sponsoredContent: parseNumber(field(value, ['Sponsored Content', 'sponsoredContent', 'sponsored content'])),
    sponsor: normalizeText(field(value, ['Sponsor', 'sponsor'])) || undefined,
    totalCogs: parseNumber(field(value, ['Total COGS', 'totalCogs', 'total cogs']), 0) || undefined,
    costPerContent: parseNumber(field(value, ['Cost per Content', 'costPerContent', 'cost per content']), 0) || undefined,
  };
}

function normalizeSponsorPipelineDeal(value: unknown): SponsorPipelineDeal | null {
  if (!isRecord(value)) return null;
  const sponsor = normalizeText(field(value, ['Sponsor', 'sponsor']));
  if (!sponsor) return null;
  return {
    sponsor,
    dealValue: parseNumber(field(value, ['Deal Value', 'dealValue', 'deal value'])),
    status: normalizeText(field(value, ['Status', 'status'])) || 'Unknown',
    probability: parseNumber(field(value, ['Probability', 'probability']), 0),
    expectedDate: normalizeDate(field(value, ['Expected Date', 'expectedDate', 'expected date'])) || undefined,
    weightedValue: parseNumber(field(value, ['Weighted Value', 'weightedValue', 'weighted value']), 0) || undefined,
    note: normalizeText(field(value, ['Note', 'note'])) || undefined,
  };
}

export function parseProductionSummaryCSV(csv: string): ProductionSummaryRow[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]);
  const headerMap = buildHeaderMap(header);
  const iWorkMonth = headerIndex(headerMap, 'work month');
  const iTotalContent = headerIndex(headerMap, 'total content');
  const iOrganicContent = headerIndex(headerMap, 'organic content');
  const iSponsoredContent = headerIndex(headerMap, 'sponsored content');
  const iSponsor = headerIndex(headerMap, 'sponsor');
  const iTotalCogs = headerIndex(headerMap, 'total cogs');
  const iCostPerContent = headerIndex(headerMap, 'cost per content');

  return lines.slice(1).map<ProductionSummaryRow | null>((line) => {
    const cols = parseCsvLine(line);
    const workMonth = (cols[iWorkMonth] ?? '').trim();
    if (!workMonth) return null;
    return {
      workMonth,
      totalContent: parseNumber(cols[iTotalContent]),
      organicContent: parseNumber(cols[iOrganicContent]),
      sponsoredContent: parseNumber(cols[iSponsoredContent]),
      sponsor: (cols[iSponsor] ?? '').trim() || undefined,
      totalCogs: parseNumber(cols[iTotalCogs]) || undefined,
      costPerContent: parseNumber(cols[iCostPerContent]) || undefined,
    } satisfies ProductionSummaryRow;
  }).filter((row): row is ProductionSummaryRow => Boolean(row));
}

export function parseSponsorPipelineCSV(csv: string): SponsorPipelineDeal[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]);
  const headerMap = buildHeaderMap(header);
  const iSponsor = headerIndex(headerMap, 'sponsor');
  const iDealValue = headerIndex(headerMap, 'deal value');
  const iStatus = headerIndex(headerMap, 'status');
  const iProbability = headerIndex(headerMap, 'probability');
  const iExpectedDate = headerIndex(headerMap, 'expected date');
  const iWeightedValue = headerIndex(headerMap, 'weighted value');
  const iNote = headerIndex(headerMap, 'note');

  return lines.slice(1).map<SponsorPipelineDeal | null>((line) => {
    const cols = parseCsvLine(line);
    const sponsor = (cols[iSponsor] ?? '').trim();
    if (!sponsor) return null;
    const dealValue = parseNumber(cols[iDealValue]);
    const probability = parseNumber(cols[iProbability]);
    return {
      sponsor,
      dealValue,
      status: (cols[iStatus] ?? '').trim() || 'Unknown',
      probability,
      expectedDate: normalizeDate((cols[iExpectedDate] ?? '').trim()) || undefined,
      weightedValue: parseNumber(cols[iWeightedValue]) || dealValue * (probability / 100),
      note: (cols[iNote] ?? '').trim() || undefined,
    } satisfies SponsorPipelineDeal;
  }).filter((row): row is SponsorPipelineDeal => Boolean(row));
}

export interface ParseTransactionCsvOptions {
  requireExplicitTransactionMarkers?: boolean;
}

export function normalizeDataFile(
  value: unknown,
  settings: DashboardSettings,
  snapshotMetaFallback?: DataSnapshotMeta
): DataFile {
  const record = isRecord(value) ? value : {};
  const openingBalance = parseNumber(
    field(record, ['openingBalance', 'opening balance']),
    settings.refresh.fallbackOpeningBalance
  );

  const rawData = recomputeRunningBalances(
    normalizeTransactions(field(record, ['rawData', 'raw data']), settings),
    openingBalance
  );

  const productionSummary = Array.isArray(field(record, ['productionSummary', 'production summary']))
    ? (field(record, ['productionSummary', 'production summary']) as unknown[])
        .map(item => normalizeProductionSummaryRow(item))
        .filter((item): item is ProductionSummaryRow => Boolean(item))
    : [];

  const sponsorPipeline = Array.isArray(field(record, ['sponsorPipeline', 'sponsor pipeline']))
    ? (field(record, ['sponsorPipeline', 'sponsor pipeline']) as unknown[])
        .map(item => normalizeSponsorPipelineDeal(item))
        .filter((item): item is SponsorPipelineDeal => Boolean(item))
    : [];

  return {
    rawData,
    openingBalance,
    productionSummary,
    sponsorPipeline,
    snapshotMeta:
      normalizeSnapshotMeta(field(record, ['snapshotMeta', 'snapshot meta', 'refreshMeta', 'refresh meta'])) ??
      snapshotMetaFallback,
    validationReport: normalizeValidationReport(field(record, ['validationReport', 'validation report'])),
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}

function buildHeaderMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    map.set(normalizeKey(header), index);
  });
  return map;
}

function headerIndex(map: Map<string, number>, ...names: string[]): number {
  for (const name of names) {
    const index = map.get(normalizeKey(name));
    if (typeof index === 'number') return index;
  }
  return -1;
}

export function parseTransactionCsv(
  csv: string,
  settings: DashboardSettings,
  options: ParseTransactionCsvOptions = {}
): { dataFile: DataFile; rowIssues: ValidationIssue[] } {
  const requireExplicitTransactionMarkers = options.requireExplicitTransactionMarkers ?? false;
  const lines = csv
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);

  if (lines.length < 2) {
    return {
      dataFile: {
        rawData: [],
        openingBalance: settings.refresh.fallbackOpeningBalance,
        productionSummary: [],
        sponsorPipeline: [],
      },
      rowIssues: [],
    };
  }

  const headers = parseCsvLine(lines[0]);
  const headerMap = buildHeaderMap(headers);
  const idx = {
    date: headerIndex(headerMap, 'Date'),
    dueDate: headerIndex(headerMap, 'Due Date'),
    workMonth: headerIndex(headerMap, 'Work Month', 'Month', 'Month-Year'),
    type: headerIndex(headerMap, 'Type'),
    mainCategory: headerIndex(headerMap, 'Main Category', 'Category'),
    subCategory: headerIndex(headerMap, 'Sub Category'),
    description: headerIndex(headerMap, 'Description', 'Desc'),
    amount: headerIndex(headerMap, 'Amount'),
    status: headerIndex(headerMap, 'Status'),
    originalForecast: headerIndex(headerMap, 'Original Forecast'),
    person: headerIndex(headerMap, 'Person'),
    costBehavior: headerIndex(headerMap, 'Cost Behavior'),
    sponsor: headerIndex(headerMap, 'Sponsor'),
    note: headerIndex(headerMap, 'Note'),
    entity: headerIndex(headerMap, 'Entity'),
    balance: headerIndex(headerMap, 'Balance', 'Running Balance'),
    openingBalance: headerIndex(headerMap, 'Opening Balance', 'Opening_Balance'),
  };

  let openingBalance = settings.refresh.fallbackOpeningBalance;
  const rows: Transaction[] = [];
  const rowIssues: ValidationIssue[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);
    const row: RawRecord = {};
    headers.forEach((header, index) => {
      row[header] = cols[index] ?? '';
      row[normalizeKey(header)] = cols[index] ?? '';
    });

    const balanceCell = idx.balance >= 0 ? normalizeText(cols[idx.balance]) : '';
    if ((!normalizeText(cols[idx.type]) && !normalizeText(cols[idx.status])) && balanceCell) {
      const parsed = parseNumber(balanceCell, NaN);
      if (!Number.isNaN(parsed)) openingBalance = parsed;
      continue;
    }

    if (idx.openingBalance >= 0 && normalizeText(cols[idx.openingBalance])) {
      const parsed = parseNumber(cols[idx.openingBalance], NaN);
      if (!Number.isNaN(parsed)) openingBalance = parsed;
      continue;
    }

    if (requireExplicitTransactionMarkers) {
      const explicitType = normalizeText(cols[idx.type]);
      const explicitStatus = normalizeText(cols[idx.status]);
      if (explicitType !== 'Inflow' && explicitType !== 'Outflow') continue;
      if (!explicitStatus) continue;
    }

    const normalized = normalizeTransactionRow(
      {
        Date: idx.date >= 0 ? cols[idx.date] : '',
        'Due Date': idx.dueDate >= 0 ? cols[idx.dueDate] : '',
        'Work Month': idx.workMonth >= 0 ? cols[idx.workMonth] : '',
        Type: idx.type >= 0 ? cols[idx.type] : '',
        'Main Category': idx.mainCategory >= 0 ? cols[idx.mainCategory] : '',
        'Sub Category': idx.subCategory >= 0 ? cols[idx.subCategory] : '',
        Description: idx.description >= 0 ? cols[idx.description] : '',
        Amount: idx.amount >= 0 ? cols[idx.amount] : '',
        Status: idx.status >= 0 ? cols[idx.status] : '',
        'Original Forecast': idx.originalForecast >= 0 ? cols[idx.originalForecast] : '',
        Person: idx.person >= 0 ? cols[idx.person] : '',
        'Cost Behavior': idx.costBehavior >= 0 ? cols[idx.costBehavior] : '',
        Sponsor: idx.sponsor >= 0 ? cols[idx.sponsor] : '',
        Note: idx.note >= 0 ? cols[idx.note] : '',
        Entity: idx.entity >= 0 ? cols[idx.entity] : '',
        Balance: idx.balance >= 0 ? cols[idx.balance] : '',
      },
      settings,
      'Forecast'
    );

    if (!normalized) continue;
    rows.push(normalized);
    rowIssues.push(...buildTransactionValidationIssues(row, normalized, i + 1, settings));
  }

  return {
    dataFile: {
      rawData: recomputeRunningBalances(rows, openingBalance),
      openingBalance,
      productionSummary: [],
      sponsorPipeline: [],
    },
    rowIssues,
  };
}
