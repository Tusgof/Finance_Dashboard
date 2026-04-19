import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { DEFAULT_DASHBOARD_SETTINGS } from '../lib/settingsDefaults';
import { buildMonthlyPnLRows, calculateCashRunway, calculateCostPerContent, calculateWeightedPipeline, getCurrentCash, getMonths, normalizeTransactions } from '../lib/dashboardMetrics';
import { buildLegacySnapshotMeta, createSnapshotMeta, ensureSnapshotMeta } from '../lib/snapshotMeta';
import { buildSupportSheetValidationIssues, normalizeDataFile, parseTransactionCsv } from '../lib/transactionModel';
import type { ProductionSummaryRow, RawTransactionRow, SponsorPipelineDeal } from '../lib/types';

function makeRow(overrides: Partial<RawTransactionRow> = {}): RawTransactionRow {
  const workMonth = overrides.workMonth ?? overrides.month ?? '2026-01';
  return {
    date: overrides.date ?? `${workMonth}-01`,
    dueDate: overrides.dueDate,
    workMonth,
    month: overrides.month ?? workMonth,
    type: overrides.type ?? 'Outflow',
    status: overrides.status ?? 'Actual',
    category: overrides.category ?? overrides.mainCategory ?? 'Operations',
    mainCategory: overrides.mainCategory,
    subCategory: overrides.subCategory,
    desc: overrides.desc ?? overrides.description ?? 'Row',
    description: overrides.description,
    amount: overrides.amount ?? 0,
    originalForecast: overrides.originalForecast,
    person: overrides.person,
    costBehavior: overrides.costBehavior,
    sponsor: overrides.sponsor,
    note: overrides.note,
    entity: overrides.entity,
    balance: overrides.balance ?? 0,
  };
}

function approxEqual(actual: number, expected: number, epsilon = 1e-6): void {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} did not equal ${expected}`);
}

function issueCodes(issues: Array<{ code: string }>): string[] {
  return issues.map(issue => issue.code);
}

const tests: Array<[string, () => void]> = [
  [
    'support sheet validation flags bad headers and missing options',
    () => {
  const goodSummary = [
    'Work Month,Total Content,Organic Content,Sponsored Content,Sponsor',
    '2026-01,2,1,1,Sponsor A',
  ].join('\n');
  assert.deepEqual(buildSupportSheetValidationIssues('Monthly Production Summary', goodSummary, 'production-summary'), []);

  const badSummary = [
    'Month,Count',
    '2026-01,2',
  ].join('\n');
  assert.deepEqual(issueCodes(buildSupportSheetValidationIssues('Sponsor Pipeline', badSummary, 'sponsor-pipeline')), ['support-sheet-invalid-header']);

  const goodLists = [
    'A,B,C,D',
    'Revenue,COGS,OpEx,CapEx',
    'Revenue A,COGS A,OpEx A,CapEx A',
  ].join('\n');
  assert.deepEqual(buildSupportSheetValidationIssues('Lists', goodLists, 'lists'), []);

  const badLists = [
    'A,B,C,D',
    'Revenue,COGS,OpEx,CapEx',
    'Revenue A,,OpEx A,',
  ].join('\n');
  assert.deepEqual(issueCodes(buildSupportSheetValidationIssues('Lists', badLists, 'lists')), ['support-sheet-empty']);

  const onlyListCategories = [
    'A,B,C,D',
    'Revenue,COGS,OpEx,CapEx',
  ].join('\n');
  assert.deepEqual(issueCodes(buildSupportSheetValidationIssues('Lists', onlyListCategories, 'lists')), ['support-sheet-empty']);
    },
  ],
  [
    'explicit source fields warn when management would otherwise rely on inference',
    () => {
  const csv = [
    'Date,Work Month,Type,Main Category,Description,Amount,Status,Cost Behavior,Sponsor,Person',
    '2026-01-02,2026-01,Outflow,,Salary payment,250,Actual,,,',
    '2026-01-03,2026-01,Inflow,Revenue,Sponsor payment,500,Actual,,,',
  ].join('\n');

  const parsed = parseTransactionCsv(csv, DEFAULT_DASHBOARD_SETTINGS);
  const codes = issueCodes(parsed.rowIssues);
  assert.ok(codes.includes('invalid-main-category'));
  assert.ok(codes.includes('missing-cost-behavior'));
  assert.ok(codes.includes('missing-person'));
  assert.ok(codes.includes('missing-sponsor'));
    },
  ],
  [
    'parser preserves opening balance, cancelled rows, and fallback snapshot metadata',
    () => {
  const csv = [
    'Date,Due Date,Work Month,Type,Main Category,Description,Amount,Status,Balance',
    ',,,,,,,,1000',
    '2026-01-02,2026-01-02,2026-01,Inflow,Revenue,Sponsor A,200,Actual,',
    '2026-01-03,2026-01-03,2026-01,Outflow,CapEx,Cancelled laptop,50,Cancelled,',
  ].join('\n');

  const parsed = parseTransactionCsv(csv, DEFAULT_DASHBOARD_SETTINGS);
  assert.equal(parsed.dataFile.openingBalance, 1000);
  assert.equal(parsed.dataFile.rawData.length, 2);
  assert.equal(parsed.dataFile.rawData[0].balance, 1200);
  assert.equal(parsed.dataFile.rawData[1].balance, 1200);

  const fallbackMeta = createSnapshotMeta('https://example.com/sheet.csv', '2026-04-19T08:15:00.000Z');
  const normalized = normalizeDataFile(parsed.dataFile, DEFAULT_DASHBOARD_SETTINGS, fallbackMeta);
  assert.deepEqual(normalized.snapshotMeta, fallbackMeta);
    },
  ],
  [
    'freshness helpers preserve capture time for refresh and restore flows',
    () => {
  const refreshMeta = createSnapshotMeta('https://example.com/export.csv', '2026-04-19T01:02:03.000Z');
  assert.equal(refreshMeta.sourceKind, 'snapshot');
  assert.equal(refreshMeta.sourceUrl, 'https://example.com/export.csv');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'finance-dashboard-'));
  const backupPath = path.join(tmpDir, '2026-04-18T10-11-12.json');
  fs.writeFileSync(backupPath, JSON.stringify({ rawData: [], openingBalance: 0 }, null, 2), 'utf-8');
  const backupStamp = new Date('2026-04-18T10:11:12.000Z');
  fs.utimesSync(backupPath, backupStamp, backupStamp);

  const legacyMeta = buildLegacySnapshotMeta(backupPath, 'Legacy snapshot file');
  assert.equal(legacyMeta.capturedAt, '2026-04-18T10:11:12.000Z');
  assert.equal(legacyMeta.sourceKind, 'legacy');

  const restored = ensureSnapshotMeta({ rawData: [], openingBalance: 0 }, backupPath);
  assert.deepEqual(restored.snapshotMeta, {
    capturedAt: '2026-04-18T10:11:12.000Z',
    sourceLabel: 'Restored legacy backup',
    sourceKind: 'legacy',
  });
    },
  ],
  [
    'financial metrics handle cancelled rows, capex, runway, and split forecast variance',
    () => {
  const rawRows: RawTransactionRow[] = [
    makeRow({
      date: '2026-01-01',
      workMonth: '2026-01',
      month: '2026-01',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      desc: 'January sponsor',
      sponsor: 'Sponsor A',
      amount: 100,
      originalForecast: 90,
      balance: 1100,
    }),
    makeRow({
      date: '2026-01-02',
      workMonth: '2026-01',
      month: '2026-01',
      type: 'Outflow',
      status: 'Actual',
      mainCategory: 'COGS',
      category: 'COGS',
      desc: 'January production',
      amount: 80,
      originalForecast: 70,
      balance: 1020,
    }),
    makeRow({
      date: '2026-01-03',
      workMonth: '2026-01',
      month: '2026-01',
      type: 'Outflow',
      status: 'Actual',
      mainCategory: 'OpEx',
      category: 'OpEx',
      desc: 'January admin',
      amount: 30,
      balance: 990,
    }),
    makeRow({
      date: '2026-01-04',
      workMonth: '2026-01',
      month: '2026-01',
      type: 'Outflow',
      status: 'Actual',
      mainCategory: 'CapEx',
      category: 'CapEx',
      desc: 'January camera',
      amount: 40,
      balance: 950,
    }),
    makeRow({
      date: '2026-01-05',
      workMonth: '2026-01',
      month: '2026-01',
      type: 'Inflow',
      status: 'Forecast',
      mainCategory: 'Revenue',
      category: 'Revenue',
      desc: 'January forecast sponsor',
      amount: 20,
      balance: 970,
    }),
    makeRow({
      date: '2026-01-06',
      workMonth: '2026-01',
      month: '2026-01',
      type: 'Outflow',
      status: 'Forecast',
      mainCategory: 'COGS',
      category: 'COGS',
      desc: 'January forecast production',
      amount: 20,
      balance: 950,
    }),
    makeRow({
      date: '2026-01-07',
      workMonth: '2026-01',
      month: '2026-01',
      type: 'Outflow',
      status: 'Cancelled',
      mainCategory: 'CapEx',
      category: 'CapEx',
      desc: 'Cancelled rig',
      amount: 999,
      balance: 950,
    }),
    makeRow({
      date: '2026-02-01',
      workMonth: '2026-02',
      month: '2026-02',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      desc: 'February sponsor',
      sponsor: 'Sponsor B',
      amount: 100,
      balance: 1050,
    }),
    makeRow({
      date: '2026-02-02',
      workMonth: '2026-02',
      month: '2026-02',
      type: 'Outflow',
      status: 'Actual',
      mainCategory: 'COGS',
      category: 'COGS',
      desc: 'February production',
      amount: 90,
      originalForecast: 95,
      balance: 960,
    }),
    makeRow({
      date: '2026-02-03',
      workMonth: '2026-02',
      month: '2026-02',
      type: 'Outflow',
      status: 'Actual',
      mainCategory: 'OpEx',
      category: 'OpEx',
      desc: 'February admin',
      amount: 20,
      balance: 940,
    }),
    makeRow({
      date: '2026-02-04',
      workMonth: '2026-02',
      month: '2026-02',
      type: 'Outflow',
      status: 'Actual',
      mainCategory: 'CapEx',
      category: 'CapEx',
      desc: 'February gear',
      amount: 40,
      balance: 900,
    }),
  ];

  const normalized = normalizeTransactions(rawRows, DEFAULT_DASHBOARD_SETTINGS);
  assert.deepEqual(getMonths(normalized), ['2026-01', '2026-02']);
  assert.equal(getCurrentCash(normalized, 1000), 900);
  approxEqual(calculateCashRunway(normalized, 1000, DEFAULT_DASHBOARD_SETTINGS), 18);

  const monthlyRows = buildMonthlyPnLRows(normalized, DEFAULT_DASHBOARD_SETTINGS);
  assert.equal(monthlyRows.length, 2);

  const january = monthlyRows[0];
  assert.equal(january.month, '2026-01');
  assert.equal(january.revenue, 120);
  assert.equal(january.revenueForecast, 90);
  assert.equal(january.revenueVariance, 10);
  assert.equal(january.cogs, 100);
  assert.equal(january.costForecast, 70);
  assert.equal(january.costVariance, 80);
  assert.equal(january.capEx, 40);
  assert.equal(january.cashAfterCapEx, -50);

  const productionSummary: ProductionSummaryRow[] = [
    { workMonth: '2026-01', totalContent: 2, organicContent: 1, sponsoredContent: 1, totalCogs: 150, costPerContent: 75 },
  ];
  assert.equal(calculateCostPerContent(january, productionSummary), 50);

  const pipeline: SponsorPipelineDeal[] = [
    { sponsor: 'Sponsor A', dealValue: 1000, status: 'Committed', probability: 50, weightedValue: 300 },
    { sponsor: 'Sponsor B', dealValue: 400, status: 'Forecast', probability: 25 },
  ];
  assert.equal(calculateWeightedPipeline(pipeline), 400);
    },
  ],
];

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

if (failed > 0) {
  process.exitCode = 1;
  console.error(`${failed} test${failed === 1 ? '' : 's'} failed`);
} else {
  console.log(`All ${tests.length} tests passed`);
}
