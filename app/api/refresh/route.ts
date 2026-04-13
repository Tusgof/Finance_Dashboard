import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { loadSettings } from '@/lib/settings';
import type { DataFile, ProductionSummaryRow, SponsorPipelineDeal, Transaction } from '@/lib/types';

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

function normalizeDate(value: string): string {
  if (!value) return '';
  const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return value;
}

function deriveMonth(value: string): string {
  const date = normalizeDate(value);
  return date.length >= 7 ? date.slice(0, 7) : '';
}

function deriveWorkMonth(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  return deriveMonth(trimmed);
}

function headerIndex(header: string[], ...names: string[]): number {
  const lowered = header.map(item => item.trim().replace(/^"|"$/g, '').toLowerCase());
  return names.map(name => lowered.indexOf(name)).find(index => index >= 0) ?? -1;
}

function parseNumber(value: string | undefined): number {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildSheetCsvUrl(sheetId: string, sheetName: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

function parseCSV(csv: string, fallbackOpeningBalance: number): { rawData: Transaction[]; openingBalance: number } {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return { rawData: [], openingBalance: fallbackOpeningBalance };

  const header = parseCsvLine(lines[0]);
  const iDate = headerIndex(header, 'date');
  const iDueDate = headerIndex(header, 'due date');
  const iType = headerIndex(header, 'type');
  const iMainCategory = headerIndex(header, 'main category', 'category');
  const iSubCategory = headerIndex(header, 'sub category', 'subcategory');
  const iDesc = headerIndex(header, 'description', 'desc');
  const iAmount = headerIndex(header, 'amount');
  const iStatus = headerIndex(header, 'status');
  const iOriginalForecast = headerIndex(header, 'original forecast');
  const iPerson = headerIndex(header, 'person');
  const iCostBehavior = headerIndex(header, 'cost behavior');
  const iSponsor = headerIndex(header, 'sponsor');
  const iNote = headerIndex(header, 'note');
  const iEntity = headerIndex(header, 'entity');
  const iMonth = headerIndex(header, 'work month', 'month');
  const iBalance = headerIndex(header, 'balance', 'running balance');
  const iOpeningBalance = headerIndex(header, 'opening balance', 'opening_balance');

  let openingBalance = fallbackOpeningBalance;
  const rawData: Transaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);
    if (iOpeningBalance >= 0 && cols[iOpeningBalance]) {
      const ob = Number(String(cols[iOpeningBalance]).replace(/,/g, ''));
      if (Number.isFinite(ob)) openingBalance = ob;
      continue;
    }

    const type = (cols[iType] ?? '').trim();
    const status = (cols[iStatus] ?? '').trim();
    if ((type !== 'Inflow' && type !== 'Outflow') || !status) continue;

    const date = normalizeDate((cols[iDate] ?? '').trim());
    const dueDate = normalizeDate((cols[iDueDate] ?? '').trim());
    const month = deriveWorkMonth((cols[iMonth] ?? '').trim()) || deriveMonth(dueDate) || deriveMonth(date);
    const amount = parseNumber(cols[iAmount]);
    const balance = parseNumber(cols[iBalance]);

    rawData.push({
      date: date || dueDate,
      dueDate: dueDate || undefined,
      workMonth: month || undefined,
      month: month || '',
      type: type as Transaction['type'],
      status: status as Transaction['status'],
      category: (cols[iMainCategory] ?? '').trim(),
      mainCategory: (cols[iMainCategory] ?? '').trim() as Transaction['mainCategory'],
      subCategory: (cols[iSubCategory] ?? '').trim() || undefined,
      desc: (cols[iDesc] ?? '').trim(),
      amount,
      originalForecast: iOriginalForecast >= 0 ? parseNumber(cols[iOriginalForecast]) || undefined : undefined,
      person: (cols[iPerson] ?? '').trim() || undefined,
      costBehavior: ((cols[iCostBehavior] ?? '').trim() || undefined) as Transaction['costBehavior'],
      sponsor: (cols[iSponsor] ?? '').trim() || undefined,
      note: (cols[iNote] ?? '').trim() || undefined,
      entity: ((cols[iEntity] ?? '').trim() || 'Administrative') as Transaction['entity'],
      balance,
    });
  }

  return { rawData, openingBalance };
}

function parseProductionSummaryCSV(csv: string): ProductionSummaryRow[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]);
  const iWorkMonth = headerIndex(header, 'work month');
  const iTotalContent = headerIndex(header, 'total content');
  const iOrganicContent = headerIndex(header, 'organic content');
  const iSponsoredContent = headerIndex(header, 'sponsored content');
  const iSponsor = headerIndex(header, 'sponsor');
  const iTotalCogs = headerIndex(header, 'total cogs');
  const iCostPerContent = headerIndex(header, 'cost per content');

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

function parseSponsorPipelineCSV(csv: string): SponsorPipelineDeal[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]);
  const iSponsor = headerIndex(header, 'sponsor');
  const iDealValue = headerIndex(header, 'deal value');
  const iStatus = headerIndex(header, 'status');
  const iProbability = headerIndex(header, 'probability');
  const iExpectedDate = headerIndex(header, 'expected date');
  const iWeightedValue = headerIndex(header, 'weighted value');
  const iNote = headerIndex(header, 'note');

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

async function fetchOptionalSheet<T>(
  sheetId: string,
  sheetName: string,
  parser: (csv: string) => T[]
): Promise<T[]> {
  const response = await fetch(buildSheetCsvUrl(sheetId, sheetName));
  if (!response.ok) return [];
  return parser(await response.text());
}

export async function POST() {
  try {
    const settings = loadSettings();
    const csvResponse = await fetch(settings.refresh.csvExportUrl);
    if (!csvResponse.ok) {
      return NextResponse.json({ error: `Failed to fetch Google Sheets: ${csvResponse.status}` }, { status: 502 });
    }

    const csv = await csvResponse.text();
    const data = parseCSV(csv, settings.refresh.fallbackOpeningBalance);
    const [productionSummary, sponsorPipeline] = await Promise.all([
      fetchOptionalSheet(settings.refresh.sheetId, 'Monthly Production Summary', parseProductionSummaryCSV),
      fetchOptionalSheet(settings.refresh.sheetId, 'Sponsor Pipeline', parseSponsorPipelineCSV),
    ]);

    const dataDir = path.join(process.cwd(), 'data');
    const currentPath = path.join(dataDir, 'current.json');
    const productionSummaryPath = path.join(process.cwd(), settings.refresh.productionSummaryPath);
    const sponsorPipelinePath = path.join(process.cwd(), settings.refresh.sponsorPipelinePath);
    const backupDir = path.join(dataDir, 'backups');

    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    if (fs.existsSync(currentPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      fs.copyFileSync(currentPath, path.join(backupDir, `${timestamp}.json`));
    }

    const fileContent: DataFile = {
      rawData: data.rawData,
      openingBalance: data.openingBalance,
      productionSummary,
      sponsorPipeline,
    };
    fs.writeFileSync(currentPath, JSON.stringify(fileContent, null, 2), 'utf-8');
    fs.writeFileSync(productionSummaryPath, JSON.stringify(productionSummary, null, 2), 'utf-8');
    fs.writeFileSync(sponsorPipelinePath, JSON.stringify(sponsorPipeline, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      count: data.rawData.length,
      productionSummaryCount: productionSummary.length,
      sponsorPipelineCount: sponsorPipeline.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
