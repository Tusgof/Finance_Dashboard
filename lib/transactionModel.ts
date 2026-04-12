import type {
  DashboardSettings,
  DataFile,
  ProductionSummaryRow,
  SponsorPipelineDeal,
  Transaction,
  TransactionStatus,
  TransactionType,
} from './types';

type RawRecord = Record<string, unknown>;

const VALID_ENTITIES: NonNullable<Transaction['entity']>[] = [
  'Revenue',
  'Video Production',
  'News Production',
  'Administrative',
  'Finance',
  'Marketing',
];

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

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => keyword && text.includes(keyword.toLowerCase()));
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

function field(record: RawRecord, names: string[]): unknown {
  for (const name of names) {
    if (name in record) return record[name];
    const lower = name.toLowerCase();
    if (lower in record) return record[lower];
  }
  return undefined;
}

export function normalizeTransactionRow(
  record: unknown,
  settings: DashboardSettings,
  fallbackStatus: TransactionStatus = 'Forecast'
): Transaction | null {
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

function recomputeRunningBalances(transactions: Transaction[], openingBalance: number): Transaction[] {
  let balance = openingBalance;
  return transactions.map(transaction => {
    if (transaction.status !== 'Cancelled') {
      balance += transaction.type === 'Inflow' ? transaction.amount : -transaction.amount;
    }
    return { ...transaction, balance };
  });
}

function normalizeTransactions(value: unknown, settings: DashboardSettings): Transaction[] {
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

export function normalizeDataFile(value: unknown, settings: DashboardSettings): DataFile {
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
  settings: DashboardSettings
): DataFile {
  const lines = csv
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);

  if (lines.length < 2) {
    return {
      rawData: [],
      openingBalance: settings.refresh.fallbackOpeningBalance,
      productionSummary: [],
      sponsorPipeline: [],
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
  }

  return {
    rawData: recomputeRunningBalances(rows, openingBalance),
    openingBalance,
    productionSummary: [],
    sponsorPipeline: [],
  };
}
