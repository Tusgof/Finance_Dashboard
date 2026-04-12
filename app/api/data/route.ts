import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { loadSettings } from '@/lib/settings';
import { normalizeDataFile } from '@/lib/transactionModel';

export async function GET() {
  const settings = loadSettings();
  const filePath = path.join(process.cwd(), 'data', 'current.json');

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json(normalizeDataFile(JSON.parse(raw), settings));
  } catch {
    return NextResponse.json(
      normalizeDataFile(
        {
          rawData: [],
          openingBalance: settings.refresh.fallbackOpeningBalance,
          productionSummary: [],
          sponsorPipeline: [],
        },
        settings
      )
    );
  }
}
