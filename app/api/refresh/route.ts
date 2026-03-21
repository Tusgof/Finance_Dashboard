import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Transaction, DataFile } from '@/lib/types';

const SHEET_ID = '1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

function parseCSV(csv: string): { rawData: Transaction[]; openingBalance: number } {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return { rawData: [], openingBalance: 124331.84 };

  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

  // Map header indices
  const idxAny = (...names: string[]) => names.map(name => header.indexOf(name)).find(i => i >= 0) ?? -1;
  const iDate = idxAny('date');
  const iType = idxAny('type');
  const iCat = idxAny('category', 'main category');
  const iDesc = idxAny('desc', 'description');
  const iAmount = idxAny('amount');
  const iStatus = idxAny('status');
  const iDueDate = idxAny('due date');
  const iEntity = idxAny('entity');
  const iMonth = idxAny('month', 'month-year');
  const iBalance = idxAny('balance', 'running balance');
  const iOpeningBal = idxAny('opening_balance', 'opening balance');

  let openingBalance = 124331.84;
  const rawData: Transaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV split (handles quoted fields)
    const cols = parseCsvLine(line);

    // Check for explicit opening balance row or a blank row with only balance populated
    const balanceCell = iBalance >= 0 ? (cols[iBalance] ?? '').trim() : '';
    if ((!cols[iType]?.trim() && !cols[iStatus]?.trim()) && balanceCell) {
      const ob = parseFloat(balanceCell.replace(/,/g, ''));
      if (!isNaN(ob)) openingBalance = ob;
      continue;
    }

    if (iOpeningBal >= 0 && cols[iOpeningBal]) {
      const ob = parseFloat(cols[iOpeningBal].replace(/,/g, ''));
      if (!isNaN(ob)) openingBalance = ob;
      continue;
    }

    const typeRaw = cols[iType]?.trim();
    const statusRaw = cols[iStatus]?.trim();

    if (!typeRaw || !statusRaw) continue;
    if (typeRaw !== 'Inflow' && typeRaw !== 'Outflow') continue;
    if (statusRaw !== 'Actual' && statusRaw !== 'Forecast') continue;

    const entityRaw = cols[iEntity]?.trim() as Transaction['entity'];
    const validEntities: Transaction['entity'][] = [
      'Revenue', 'Video Production', 'News Production', 'Administrative', 'Finance', 'Marketing',
    ];
    const entity = validEntities.includes(entityRaw) ? entityRaw : 'Administrative';

    const amount = parseFloat((cols[iAmount] ?? '0').replace(/,/g, '')) || 0;
    const balance = parseFloat((cols[iBalance] ?? '0').replace(/,/g, '')) || 0;

    const dateVal = normalizeDate(cols[iDate]?.trim() ?? '');
    const dueDateVal = normalizeDate(cols[iDueDate]?.trim() ?? '');
    const effectiveDate = dueDateVal || dateVal;

    const monthVal = deriveMonth(dueDateVal || dateVal || cols[iMonth]?.trim() || '');

    rawData.push({
      date: effectiveDate,
      dueDate: dueDateVal || undefined,
      type: typeRaw as 'Inflow' | 'Outflow',
      category: cols[iCat]?.trim() ?? '',
      desc: cols[iDesc]?.trim() ?? '',
      amount,
      status: statusRaw as 'Actual' | 'Forecast',
      entity,
      month: monthVal,
      balance,
    });
  }

  return { rawData, openingBalance };
}

function normalizeDate(value: string): string {
  if (!value) return '';

  // Convert DD/MM/YYYY or D/M/YYYY to YYYY-MM-DD
  const dmyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  // Already ISO-like
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return value;
}

function deriveMonth(value: string): string {
  const date = normalizeDate(value);
  if (date.length >= 7) return date.slice(0, 7);
  return '';
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

export async function POST() {
  try {
    const csvResponse = await fetch(CSV_URL);
    if (!csvResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Google Sheets: ${csvResponse.status}` },
        { status: 502 }
      );
    }
    const csv = await csvResponse.text();

    const newData = parseCSV(csv);

    const dataDir = path.join(process.cwd(), 'data');
    const currentPath = path.join(dataDir, 'current.json');
    const backupDir = path.join(dataDir, 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Backup existing data
    if (fs.existsSync(currentPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      fs.copyFileSync(currentPath, path.join(backupDir, `${timestamp}.json`));
    }

    // Write new data
    const fileContent: DataFile = {
      rawData: newData.rawData,
      openingBalance: newData.openingBalance,
    };
    fs.writeFileSync(currentPath, JSON.stringify(fileContent, null, 2), 'utf-8');

    return NextResponse.json({ success: true, count: newData.rawData.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
