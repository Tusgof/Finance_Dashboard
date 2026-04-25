import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { DEFAULT_DASHBOARD_SETTINGS } from '../lib/settingsDefaults';
import { normalizeSettings } from '../lib/settings';
import { getRestoreUnavailableMessage, isVercelStatelessRuntime, persistRefreshSnapshot, shouldPersistRefreshSnapshot } from '../lib/refreshPersistence';
import { buildMonthlyCashFlowRows, buildMonthlyCashReconciliationRows, buildMonthlyPnLRows, buildScenarioProjection, calculateCashRunway, calculateCostPerContent, calculateWeightedPipeline, getApproximateBaseForecastZeroCrossing, getCurrentCash, getMonths, msUntilNextLocalMidnight, normalizeTransactions } from '../lib/dashboardMetrics';
import { buildLegacySnapshotMeta, createSnapshotMeta, ensureSnapshotMeta } from '../lib/snapshotMeta';
import { selectSupportSheetRows } from '../lib/supportSheetRefresh';
import { buildSupportSheetValidationIssues, buildValidationReport, normalizeDataFile, parseTransactionCsv } from '../lib/transactionModel';
import type { ProductionSummaryRow, RawTransactionRow, SponsorPipelineDeal, ValidationIssue } from '../lib/types';

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
    'support sheet refresh keeps the last usable local rows when optional support data is unusable',
    () => {
  const fetchedIssues: ValidationIssue[] = [{
    code: 'support-sheet-empty',
    level: 'management',
    message: 'Monthly Production Summary looks empty or incomplete: no usable rows were returned.',
    field: 'Monthly Production Summary',
    value: 'no usable rows were returned',
  }];
  const localRows: ProductionSummaryRow[] = [
    { workMonth: '2026-04', totalContent: 4, organicContent: 3, sponsoredContent: 1, totalCogs: 100, costPerContent: 25 },
  ];

  const fallback = selectSupportSheetRows({
    sheetName: 'Monthly Production Summary',
    fetchedRows: [],
    fetchedIssues,
    localRows,
    allowLocalFallback: true,
  });

  assert.equal(fallback.usedLocalFallback, true);
  assert.deepEqual(fallback.rows, localRows);
  assert.ok(fallback.issues.some(issue => issue.code === 'support-sheet-empty'));
  assert.ok(fallback.issues.some(issue => issue.code === 'support-sheet-local-fallback'));

  const stateless = selectSupportSheetRows({
    sheetName: 'Monthly Production Summary',
    fetchedRows: [],
    fetchedIssues,
    localRows,
    allowLocalFallback: false,
  });

  assert.equal(stateless.usedLocalFallback, false);
  assert.deepEqual(stateless.rows, []);
  assert.deepEqual(stateless.issues, fetchedIssues);
    },
  ],
  [
    'refresh persistence writes current, support snapshots, and a backup in local filesystem mode',
    () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'finance-dashboard-refresh-'));
      const dataDir = path.join(tmpDir, 'data');
      const productionSummaryPath = path.join(dataDir, 'production-summary.json');
      const sponsorPipelinePath = path.join(dataDir, 'sponsor-pipeline.json');
      const currentPath = path.join(dataDir, 'current.json');

      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(currentPath, JSON.stringify({ rawData: [], openingBalance: 50 }, null, 2), 'utf-8');

      const result = persistRefreshSnapshot({
        snapshotContent: {
          rawData: [makeRow({ workMonth: '2026-04', month: '2026-04', type: 'Inflow', mainCategory: 'Revenue', category: 'Revenue', amount: 200, balance: 250 })],
          openingBalance: 50,
          productionSummary: [],
          sponsorPipeline: [],
        },
        productionSummaryRows: [
          { workMonth: '2026-04', totalContent: 4, organicContent: 3, sponsoredContent: 1, totalCogs: 100, costPerContent: 25 },
        ],
        sponsorPipelineRows: [
          { sponsor: 'Sponsor A', dealValue: 1000, status: 'Committed', probability: 80, weightedValue: 800 },
        ],
        productionSummaryPath,
        sponsorPipelinePath,
        dataDir,
        vercel: '',
      });

      assert.equal(result.mode, 'filesystem');
      assert.equal(JSON.parse(fs.readFileSync(currentPath, 'utf-8')).openingBalance, 50);
      assert.equal(JSON.parse(fs.readFileSync(productionSummaryPath, 'utf-8'))[0].workMonth, '2026-04');
      assert.equal(JSON.parse(fs.readFileSync(sponsorPipelinePath, 'utf-8'))[0].sponsor, 'Sponsor A');

      const backupDir = path.join(dataDir, 'backups');
      const backups = fs.readdirSync(backupDir);
      assert.equal(backups.length, 1);
      assert.equal(JSON.parse(fs.readFileSync(path.join(backupDir, backups[0]), 'utf-8')).openingBalance, 50);
    },
  ],
  [
    'refresh persistence stays stateless on Vercel and does not create snapshot files',
    () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'finance-dashboard-stateless-'));
      const dataDir = path.join(tmpDir, 'data');
      const productionSummaryPath = path.join(dataDir, 'production-summary.json');
      const sponsorPipelinePath = path.join(dataDir, 'sponsor-pipeline.json');

      const result = persistRefreshSnapshot({
        snapshotContent: {
          rawData: [makeRow({ workMonth: '2026-04', month: '2026-04', type: 'Inflow', mainCategory: 'Revenue', category: 'Revenue', amount: 200, balance: 250 })],
          openingBalance: 50,
          productionSummary: [],
          sponsorPipeline: [],
        },
        productionSummaryRows: [],
        sponsorPipelineRows: [],
        productionSummaryPath,
        sponsorPipelinePath,
        dataDir,
        vercel: '1',
      });

      assert.equal(result.mode, 'stateless');
      assert.ok(result.skippedReason?.includes('Vercel serverless filesystem'));
      assert.equal(fs.existsSync(path.join(dataDir, 'current.json')), false);
      assert.equal(fs.existsSync(path.join(dataDir, 'backups')), false);
      assert.equal(fs.existsSync(productionSummaryPath), false);
      assert.equal(fs.existsSync(sponsorPipelinePath), false);
    },
  ],
  [
    'stateless runtime helpers keep backups disabled and restore blocked on Vercel',
    () => {
      assert.equal(isVercelStatelessRuntime('1'), true);
      assert.equal(shouldPersistRefreshSnapshot('1'), false);
      assert.equal(shouldPersistRefreshSnapshot(undefined), true);
      assert.equal(getRestoreUnavailableMessage(), 'Restore is only available in local filesystem mode.');
    },
  ],
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
    'core field validation separates critical, management, and info warnings',
    () => {
  const csv = [
    'Date,Work Month,Type,Main Category,Description,Amount,Status,Original Forecast',
    '2026-01-02,,Outflow,,Salary payment,,Bogus,not-a-number',
  ].join('\n');

  const parsed = parseTransactionCsv(csv, DEFAULT_DASHBOARD_SETTINGS);
  const report = buildValidationReport(parsed.rowIssues, parsed.dataFile.rawData, []);

  assert.equal(report.criticalReady, false);
  assert.equal(report.managementReady, false);
  assert.ok(report.criticalIssues.some(issue => issue.code === 'missing-work-month'));
  assert.ok(report.criticalIssues.some(issue => issue.code === 'invalid-amount'));
  assert.ok(report.managementIssues.some(issue => issue.code === 'invalid-status'));
  assert.ok(report.managementIssues.some(issue => issue.code === 'invalid-main-category'));
  assert.ok(report.managementIssues.some(issue => issue.code === 'missing-cost-behavior'));
  assert.ok(report.infoIssues.some(issue => issue.code === 'invalid-original-forecast'));
    },
  ],
  [
    'parser flags canonical sheet fields when compatibility fallbacks would otherwise recover them',
    () => {
  const csv = [
    'Date,Work Month,Type,Main Category,Description,Amount,Status,Cost Behavior,Original Forecast',
    '2026-01-02,Jan 2026,Outflow,income,Salary payment,250,actual,fixed cost,not-a-number',
  ].join('\n');

  const parsed = parseTransactionCsv(csv, DEFAULT_DASHBOARD_SETTINGS);
  const codes = issueCodes(parsed.rowIssues);

  assert.ok(codes.includes('invalid-work-month'));
  assert.ok(codes.includes('invalid-status'));
  assert.ok(codes.includes('invalid-main-category'));
  assert.ok(codes.includes('invalid-cost-behavior'));
  assert.ok(codes.includes('invalid-original-forecast'));
  assert.equal(parsed.dataFile.rawData[0].workMonth, '2026-01');
  assert.equal(parsed.dataFile.rawData[0].status, 'Actual');
  assert.equal(parsed.dataFile.rawData[0].mainCategory, 'Revenue');
  assert.equal(parsed.dataFile.rawData[0].costBehavior, undefined);
  assert.equal(parsed.dataFile.rawData[0].originalForecast, undefined);
    },
  ],
  [
    'validation report normalizer reads legacy rendering and management buckets',
    () => {
      const normalized = normalizeDataFile(
        {
          rawData: [],
          openingBalance: 0,
          productionSummary: [],
          sponsorPipeline: [],
          validationReport: {
            generatedAt: '2026-04-24T00:00:00.000Z',
            renderingReady: false,
            managementReady: false,
            renderingWarnings: [
              {
                code: 'missing-work-month',
                scope: 'rendering',
                severity: 'warning',
                message: 'Row 1: Work Month is missing or not normalized to YYYY-MM.',
              },
            ],
            managementWarnings: [
              {
                code: 'invalid-status',
                scope: 'management',
                severity: 'warning',
                message: 'Row 1: Status "(blank)" is not one of Actual, Committed, Forecast, or Cancelled.',
              },
            ],
          },
        },
        DEFAULT_DASHBOARD_SETTINGS
      );

      assert.ok(normalized.validationReport);
      assert.ok(normalized.validationReport?.criticalIssues.some(issue => issue.code === 'missing-work-month'));
      assert.ok(normalized.validationReport?.managementIssues.some(issue => issue.code === 'invalid-status'));
      assert.equal(normalized.validationReport?.infoIssues.length, 0);
    },
  ],
  [
    'original forecast warns only when a nonblank value is not numeric after normalization',
    () => {
  const csv = [
    'Date,Work Month,Type,Main Category,Description,Amount,Status,Original Forecast',
    '2026-01-02,2026-01,Outflow,OpEx,Invalid forecast,250,Actual,not-a-number',
    '2026-01-03,2026-01,Inflow,Revenue,Blank forecast,500,Actual,',
    '2026-01-04,2026-01,Inflow,Revenue,Normalized forecast,500,Actual,"1,200"',
  ].join('\n');

  const parsed = parseTransactionCsv(csv, DEFAULT_DASHBOARD_SETTINGS);
  const codes = issueCodes(parsed.rowIssues);

  assert.ok(codes.includes('invalid-original-forecast'));
  assert.equal(codes.filter(code => code === 'invalid-original-forecast').length, 1);
  assert.equal(parsed.dataFile.rawData[0].originalForecast, undefined);
  assert.equal(parsed.dataFile.rawData[1].originalForecast, undefined);
  assert.equal(parsed.dataFile.rawData[2].originalForecast, 1200);
    },
  ],
  [
    'production summary validation ignores forecast-only COGS months',
    () => {
  const report = buildValidationReport(
    [],
    [
      makeRow({
        workMonth: '2026-05',
        month: '2026-05',
        type: 'Outflow',
        status: 'Forecast',
        mainCategory: 'COGS',
        category: 'COGS',
        amount: 100,
      }),
      makeRow({
        workMonth: '2026-06',
        month: '2026-06',
        type: 'Outflow',
        status: 'Actual',
        mainCategory: 'COGS',
        category: 'COGS',
        amount: 100,
      }),
    ],
    []
  );

  const missingSummaryWarnings = report.managementIssues.filter(issue => issue.code === 'missing-production-summary');
  assert.deepEqual(missingSummaryWarnings.map(issue => issue.workMonth), ['2026-06']);
    },
  ],
  [
    'production summary validation cross-checks actual cogs totals and per-content cost',
    () => {
  const report = buildValidationReport(
    [],
    [
      makeRow({
        workMonth: '2026-07',
        month: '2026-07',
        type: 'Outflow',
        status: 'Actual',
        mainCategory: 'COGS',
        category: 'COGS',
        amount: 100,
      }),
      makeRow({
        workMonth: '2026-08',
        month: '2026-08',
        type: 'Outflow',
        status: 'Forecast',
        mainCategory: 'COGS',
        category: 'COGS',
        amount: 250,
      }),
    ],
    [
      { workMonth: '2026-07', totalContent: 4, organicContent: 2, sponsoredContent: 2, totalCogs: 120, costPerContent: 29 },
      { workMonth: '2026-08', totalContent: 5, organicContent: 3, sponsoredContent: 2, totalCogs: 500, costPerContent: 100 },
    ]
  );

  const codes = issueCodes(report.managementIssues);
  assert.ok(codes.includes('production-summary-total-cogs-mismatch'));
  assert.ok(codes.includes('production-summary-cost-per-content-mismatch'));
  assert.equal(report.managementIssues.filter(issue => issue.workMonth === '2026-08').length, 0);
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
  const normalized = normalizeDataFile({
    ...parsed.dataFile,
    validationReport: {
      generatedAt: '2026-04-19T08:15:00.000Z',
      renderingReady: false,
      managementReady: false,
      renderingWarnings: [{
        code: 'missing-work-month',
        scope: 'rendering',
        severity: 'warning',
        message: 'legacy rendering issue',
      }],
      managementWarnings: [{
        code: 'missing-sponsor',
        scope: 'management',
        severity: 'warning',
        message: 'legacy management issue',
      }],
      issues: [],
    },
  }, DEFAULT_DASHBOARD_SETTINGS, fallbackMeta);
  assert.deepEqual(normalized.snapshotMeta, fallbackMeta);
  assert.equal(normalized.validationReport?.criticalReady, false);
  assert.equal(normalized.validationReport?.managementReady, false);
  assert.equal(normalized.validationReport?.criticalIssues[0]?.code, 'missing-work-month');
  assert.equal(normalized.validationReport?.managementIssues[0]?.code, 'missing-sponsor');
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
  [
    'cash flow monthly balance is derived from monthly net, not the last row balance',
    () => {
  const rawRows: RawTransactionRow[] = [
    makeRow({
      date: '2026-04-01',
      workMonth: '2026-04',
      month: '2026-04',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 100,
      balance: 1100,
    }),
    makeRow({
      date: '2026-05-01',
      workMonth: '2026-05',
      month: '2026-05',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 40,
      balance: 1140,
    }),
    makeRow({
      date: '2026-05-15',
      workMonth: '2026-05',
      month: '2026-05',
      type: 'Outflow',
      status: 'Forecast',
      mainCategory: 'OpEx',
      category: 'OpEx',
      amount: 20,
      balance: 9999,
    }),
    makeRow({
      date: '2026-05-20',
      workMonth: '2026-05',
      month: '2026-05',
      type: 'Outflow',
      status: 'Actual',
      mainCategory: 'OpEx',
      category: 'OpEx',
      amount: 10,
      balance: 7777,
    }),
  ];

  const normalized = normalizeTransactions(rawRows, DEFAULT_DASHBOARD_SETTINGS);
  const series = buildMonthlyCashFlowRows(normalized, 1000);

  assert.equal(series.find(row => row.month === '2026-05')?.balance, 1110);
    },
  ],
  [
    'cash flow excludes months that only contain cancelled rows',
    () => {
  const rawRows: RawTransactionRow[] = [
    makeRow({
      date: '2026-04-01',
      workMonth: '2026-04',
      month: '2026-04',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 100,
      balance: 1100,
    }),
    makeRow({
      date: '2026-05-01',
      workMonth: '2026-05',
      month: '2026-05',
      type: 'Outflow',
      status: 'Cancelled',
      mainCategory: 'OpEx',
      category: 'OpEx',
      amount: 50,
      balance: 1050,
    }),
  ];

  const normalized = normalizeTransactions(rawRows, DEFAULT_DASHBOARD_SETTINGS);
  const series = buildMonthlyCashFlowRows(normalized, 1000);

  assert.deepEqual(series.map(row => row.month), ['2026-04']);
  assert.equal(series[0]?.balance, 1100);
    },
  ],
  [
    'monthly reconciliation excludes cancelled rows from month totals and drilldown rows',
    () => {
  const rawRows: RawTransactionRow[] = [
    makeRow({
      date: '2026-01-02',
      workMonth: '2026-01',
      month: '2026-01',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 100,
      balance: 1100,
    }),
    makeRow({
      date: '2026-01-03',
      workMonth: '2026-01',
      month: '2026-01',
      type: 'Outflow',
      status: 'Cancelled',
      mainCategory: 'OpEx',
      category: 'OpEx',
      amount: 999,
      balance: 1100,
    }),
    makeRow({
      date: '2026-01-04',
      workMonth: '2026-01',
      month: '2026-01',
      type: 'Outflow',
      status: 'Actual',
      mainCategory: 'OpEx',
      category: 'OpEx',
      amount: 20,
      balance: 1080,
    }),
  ];

  const normalized = normalizeTransactions(rawRows, DEFAULT_DASHBOARD_SETTINGS);
  const reconciliation = buildMonthlyCashReconciliationRows(normalized, 1000);

  assert.deepEqual(reconciliation.map(row => row.month), ['2026-01']);
  assert.equal(reconciliation[0]?.openingBalance, 1000);
  assert.equal(reconciliation[0]?.inflow, 100);
  assert.equal(reconciliation[0]?.outflow, 20);
  assert.equal(reconciliation[0]?.net, 80);
  assert.equal(reconciliation[0]?.closingBalance, 1080);
  assert.deepEqual(reconciliation[0]?.rows, [normalized[0], normalized[2]]);
  assert.equal(reconciliation[0]?.rows.some(row => row.status === 'Cancelled'), false);
    },
  ],
  [
    'monthly reconciliation keeps mixed statuses aligned with the same month cash truth',
    () => {
  const rawRows: RawTransactionRow[] = [
    makeRow({
      date: '2026-02-01',
      workMonth: '2026-02',
      month: '2026-02',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 120,
      balance: 1120,
    }),
    makeRow({
      date: '2026-02-02',
      workMonth: '2026-02',
      month: '2026-02',
      type: 'Outflow',
      status: 'Committed',
      mainCategory: 'COGS',
      category: 'COGS',
      amount: 30,
      balance: 1090,
    }),
    makeRow({
      date: '2026-02-03',
      workMonth: '2026-02',
      month: '2026-02',
      type: 'Outflow',
      status: 'Forecast',
      mainCategory: 'OpEx',
      category: 'OpEx',
      amount: 10,
      balance: 1080,
    }),
    makeRow({
      date: '2026-03-01',
      workMonth: '2026-03',
      month: '2026-03',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 40,
      balance: 1120,
    }),
    makeRow({
      date: '2026-03-02',
      workMonth: '2026-03',
      month: '2026-03',
      type: 'Outflow',
      status: 'Cancelled',
      mainCategory: 'OpEx',
      category: 'OpEx',
      amount: 500,
      balance: 1120,
    }),
  ];

  const normalized = normalizeTransactions(rawRows, DEFAULT_DASHBOARD_SETTINGS);
  const reconciliation = buildMonthlyCashReconciliationRows(normalized, 1000);
  const cashFlow = buildMonthlyCashFlowRows(normalized, 1000);
  const february = reconciliation.find(row => row.month === '2026-02');

  assert.equal(february?.openingBalance, 1000);
  assert.equal(february?.inflow, 120);
  assert.equal(february?.outflow, 40);
  assert.equal(february?.net, 80);
  assert.equal(february?.closingBalance, cashFlow.find(row => row.month === '2026-02')?.balance);
  assert.equal(february?.rows.length, 3);
    },
  ],
  [
    'monthly reconciliation stays stable with interleaved row order',
    () => {
  const rawRows: RawTransactionRow[] = [
    makeRow({
      date: '2026-03-02',
      workMonth: '2026-03',
      month: '2026-03',
      type: 'Outflow',
      status: 'Actual',
      mainCategory: 'OpEx',
      category: 'OpEx',
      amount: 15,
      balance: 1185,
    }),
    makeRow({
      date: '2026-01-01',
      workMonth: '2026-01',
      month: '2026-01',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 100,
      balance: 1100,
    }),
    makeRow({
      date: '2026-02-05',
      workMonth: '2026-02',
      month: '2026-02',
      type: 'Outflow',
      status: 'Actual',
      mainCategory: 'COGS',
      category: 'COGS',
      amount: 30,
      balance: 1070,
    }),
    makeRow({
      date: '2026-03-01',
      workMonth: '2026-03',
      month: '2026-03',
      type: 'Inflow',
      status: 'Forecast',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 40,
      balance: 1225,
    }),
    makeRow({
      date: '2026-02-01',
      workMonth: '2026-02',
      month: '2026-02',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 50,
      balance: 1150,
    }),
  ];

  const normalized = normalizeTransactions(rawRows, DEFAULT_DASHBOARD_SETTINGS);
  const shuffled = [normalized[3], normalized[1], normalized[4], normalized[0], normalized[2]];
  const reconciliation = buildMonthlyCashReconciliationRows(shuffled, 1000);

  assert.deepEqual(reconciliation.map(row => row.month), ['2026-01', '2026-02', '2026-03']);
  assert.deepEqual(reconciliation[0]?.rows.map(row => row.date), ['2026-01-01']);
  assert.deepEqual(reconciliation[1]?.rows.map(row => row.date), ['2026-02-01', '2026-02-05']);
  assert.deepEqual(reconciliation[2]?.rows.map(row => row.date), ['2026-03-01', '2026-03-02']);
    },
  ],
  [
    'current cash and scenario actual history use monthly balances, and scenario balances start next month',
    () => {
  const rawRows: RawTransactionRow[] = [
    makeRow({
      date: '2026-04-01',
      workMonth: '2026-04',
      month: '2026-04',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 100,
      balance: 1100,
    }),
    makeRow({
      date: '2026-04-20',
      workMonth: '2026-04',
      month: '2026-04',
      type: 'Outflow',
      status: 'Actual',
      mainCategory: 'OpEx',
      category: 'OpEx',
      amount: 25,
      balance: 9999,
    }),
    makeRow({
      date: '2026-05-01',
      workMonth: '2026-05',
      month: '2026-05',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 10,
      balance: 1010,
    }),
    makeRow({
      date: '2026-05-10',
      workMonth: '2026-05',
      month: '2026-05',
      type: 'Outflow',
      status: 'Actual',
      mainCategory: 'OpEx',
      category: 'OpEx',
      amount: 5,
      balance: 8888,
    }),
    makeRow({
      date: '2026-06-01',
      workMonth: '2026-06',
      month: '2026-06',
      type: 'Inflow',
      status: 'Forecast',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 20,
      balance: 1100,
    }),
  ];

  const normalized = normalizeTransactions(rawRows, DEFAULT_DASHBOARD_SETTINGS);
  assert.equal(getCurrentCash(normalized, 1000), 1080);

  const projection = buildScenarioProjection(normalized, 1000);
  const may = projection.find(row => row.month === '2026-05');
  const june = projection.find(row => row.month === '2026-06');

  assert.deepEqual(projection.filter(row => row.actualBalance !== null).map(row => row.month), ['2026-04', '2026-05']);
  assert.equal(may?.actualBalance, 1080);
  assert.equal(may?.baseBalance, null);
  assert.equal(june?.baseBalance, 1100);
    },
  ],
  [
    'scenario balances ignore forecast rows inside the latest actual work month',
    () => {
  const rawRows: RawTransactionRow[] = [
    makeRow({
      date: '2026-04-01',
      workMonth: '2026-04',
      month: '2026-04',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 100,
      balance: 1100,
    }),
    makeRow({
      date: '2026-05-01',
      workMonth: '2026-05',
      month: '2026-05',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 100,
      balance: 1200,
    }),
    makeRow({
      date: '2026-05-10',
      workMonth: '2026-05',
      month: '2026-05',
      type: 'Outflow',
      status: 'Forecast',
      mainCategory: 'OpEx',
      category: 'OpEx',
      amount: 60,
      balance: 1140,
    }),
    makeRow({
      date: '2026-06-01',
      workMonth: '2026-06',
      month: '2026-06',
      type: 'Inflow',
      status: 'Forecast',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 80,
      balance: 1220,
    }),
  ];

  const normalized = normalizeTransactions(rawRows, DEFAULT_DASHBOARD_SETTINGS);
  const projection = buildScenarioProjection(normalized, 1000);
  const may = projection.find(row => row.month === '2026-05');
  const june = projection.find(row => row.month === '2026-06');

  assert.equal(may?.actualBalance, 1200);
  assert.equal(may?.baseBalance, null);
  assert.equal(june?.baseNet, 80);
  assert.equal(june?.baseBalance, 1280);
    },
  ],
  [
    'scenario bear delays non-ad customer inflows but leaves ad revenue on schedule',
    () => {
  const rawRows: RawTransactionRow[] = [
    makeRow({
      date: '2026-04-01',
      workMonth: '2026-04',
      month: '2026-04',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 100,
      balance: 1100,
    }),
    makeRow({
      date: '2026-05-01',
      workMonth: '2026-05',
      month: '2026-05',
      type: 'Inflow',
      status: 'Forecast',
      mainCategory: 'Revenue',
      category: 'Revenue',
      desc: 'Sponsor deal',
      sponsor: 'Sponsor A',
      amount: 120,
      balance: 1220,
    }),
    makeRow({
      date: '2026-05-02',
      workMonth: '2026-05',
      month: '2026-05',
      type: 'Inflow',
      status: 'Forecast',
      mainCategory: 'Revenue',
      category: 'Revenue',
      desc: 'Meta ads revenue',
      sponsor: 'Meta Ads',
      amount: 30,
      balance: 1250,
    }),
    makeRow({
      date: '2026-06-01',
      workMonth: '2026-06',
      month: '2026-06',
      type: 'Inflow',
      status: 'Forecast',
      mainCategory: 'Revenue',
      category: 'Revenue',
      desc: 'TikTok ads revenue',
      sponsor: 'TikTok Ads',
      amount: 50,
      balance: 1300,
    }),
  ];

  const normalized = normalizeTransactions(rawRows, DEFAULT_DASHBOARD_SETTINGS);
  const projection = buildScenarioProjection(normalized, 1000);
  const may = projection.find(row => row.month === '2026-05');
  const june = projection.find(row => row.month === '2026-06');
  const july = projection.find(row => row.month === '2026-07');

  assert.deepEqual(projection.map(row => row.month), ['2026-04', '2026-05', '2026-06', '2026-07']);
  assert.equal(may?.baseNet, 150);
  assert.equal(may?.bearNet, 30);
  assert.equal(june?.baseNet, 50);
  assert.equal(june?.bearNet, 170);
  assert.equal(july?.baseNet, 0);
  assert.equal(july?.bearNet, 0);
    },
  ],
  [
    'scenario projection keeps the delayed inflow month even when it has no same-month base activity',
    () => {
  const rawRows: RawTransactionRow[] = [
    makeRow({
      date: '2026-04-01',
      workMonth: '2026-04',
      month: '2026-04',
      type: 'Inflow',
      status: 'Actual',
      mainCategory: 'Revenue',
      category: 'Revenue',
      amount: 100,
      balance: 1100,
    }),
    makeRow({
      date: '2026-05-01',
      workMonth: '2026-05',
      month: '2026-05',
      type: 'Inflow',
      status: 'Forecast',
      mainCategory: 'Revenue',
      category: 'Revenue',
      desc: 'Sponsor deal',
      sponsor: 'Sponsor A',
      amount: 120,
      balance: 1220,
    }),
  ];

  const normalized = normalizeTransactions(rawRows, DEFAULT_DASHBOARD_SETTINGS);
  const projection = buildScenarioProjection(normalized, 1000);
  const may = projection.find(row => row.month === '2026-05');
  const june = projection.find(row => row.month === '2026-06');

  assert.deepEqual(projection.map(row => row.month), ['2026-04', '2026-05', '2026-06']);
  assert.equal(may?.baseNet, 120);
  assert.equal(may?.bearNet, 0);
  assert.equal(june?.baseNet, 0);
  assert.equal(june?.bearNet, 120);
  assert.equal(june?.baseBalance, 1220);
  assert.equal(june?.bearBalance, 1220);
    },
  ],
  [
    'scenario bull defaults normalize when legacy settings omit the new fields',
    () => {
      const { bullMonthlyCash: _bullMonthlyCash, bullCreditTermMonths: _bullCreditTermMonths, ...legacyScenario } = DEFAULT_DASHBOARD_SETTINGS.scenario;
      const normalizedSettings = normalizeSettings({ scenario: legacyScenario });

      assert.equal(normalizedSettings.scenario.bullMonthlyCash, 30000);
      assert.equal(normalizedSettings.scenario.bullCreditTermMonths, 2);

      const rawRows: RawTransactionRow[] = [
        makeRow({
          date: '2026-04-01',
          workMonth: '2026-04',
          month: '2026-04',
          type: 'Inflow',
          status: 'Actual',
          mainCategory: 'Revenue',
          category: 'Revenue',
          amount: 100,
          balance: 1100,
        }),
        makeRow({
          date: '2026-05-01',
          workMonth: '2026-05',
          month: '2026-05',
          type: 'Inflow',
          status: 'Actual',
          mainCategory: 'Revenue',
          category: 'Revenue',
          amount: 100,
          balance: 1200,
        }),
        makeRow({
          date: '2026-06-01',
          workMonth: '2026-06',
          month: '2026-06',
          type: 'Inflow',
          status: 'Forecast',
          mainCategory: 'Revenue',
          category: 'Revenue',
          amount: 80,
          balance: 1280,
        }),
      ];

      const customSettings = {
        ...DEFAULT_DASHBOARD_SETTINGS,
        scenario: {
          ...DEFAULT_DASHBOARD_SETTINGS.scenario,
          bullMonthlyCash: 45000,
          bullCreditTermMonths: 1,
        },
      };
      const projection = buildScenarioProjection(normalizeTransactions(rawRows, DEFAULT_DASHBOARD_SETTINGS), 1000, customSettings);
      const june = projection.find(row => row.month === '2026-06');

      assert.equal(june?.bullNet, 45080);
    },
  ],
  [
    'midnight refresh scheduler waits until the next local midnight',
    () => {
      const now = new Date('2026-04-25T06:15:30.000Z');
      const oneSecondLater = new Date('2026-04-25T06:15:31.000Z');
      const delay = msUntilNextLocalMidnight(now);
      const laterDelay = msUntilNextLocalMidnight(oneSecondLater);

      assert.ok(delay > 0);
      assert.ok(delay <= 24 * 60 * 60 * 1000);
      assert.equal(delay - laterDelay, 1000);
    },
  ],
  [
    'approximate base forecast zero crossing returns null when no future or present month goes negative',
    () => {
      const rawRows: RawTransactionRow[] = [
        makeRow({
          date: '2026-04-01',
          workMonth: '2026-04',
          month: '2026-04',
          type: 'Inflow',
          status: 'Actual',
          mainCategory: 'Revenue',
          category: 'Revenue',
          amount: 0,
          balance: 100,
        }),
        makeRow({
          date: '2026-05-01',
          workMonth: '2026-05',
          month: '2026-05',
          type: 'Inflow',
          status: 'Forecast',
          mainCategory: 'Revenue',
          category: 'Revenue',
          amount: 25,
          balance: 125,
        }),
      ];

      const normalized = normalizeTransactions(rawRows, DEFAULT_DASHBOARD_SETTINGS);
      const crossing = getApproximateBaseForecastZeroCrossing(normalized, 100, new Date('2026-05-01T00:00:00.000Z'));

      assert.equal(crossing, null);
    },
  ],
  [
    'approximate base forecast zero crossing interpolates the current or future negative month',
    () => {
      const rawRows: RawTransactionRow[] = [
        makeRow({
          date: '2026-04-01',
          workMonth: '2026-04',
          month: '2026-04',
          type: 'Inflow',
          status: 'Actual',
          mainCategory: 'Revenue',
          category: 'Revenue',
          amount: 0,
          balance: 100,
        }),
        makeRow({
          date: '2026-05-01',
          workMonth: '2026-05',
          month: '2026-05',
          type: 'Outflow',
          status: 'Forecast',
          mainCategory: 'OpEx',
          category: 'OpEx',
          amount: 200,
          balance: -100,
        }),
      ];

      const normalized = normalizeTransactions(rawRows, DEFAULT_DASHBOARD_SETTINGS);
      const crossing = getApproximateBaseForecastZeroCrossing(normalized, 100, new Date('2026-05-01T00:00:00.000Z'));

      assert.deepEqual(crossing, {
        crossingMonth: '2026-05',
        approximateNegativeDate: '2026-05-16',
        daysUntilCrossing: 15,
        approximate: true,
      });
    },
  ],
  [
    'approximate base forecast zero crossing handles exact month-start edges cleanly',
    () => {
      const rawRows: RawTransactionRow[] = [
        makeRow({
          date: '2026-04-01',
          workMonth: '2026-04',
          month: '2026-04',
          type: 'Inflow',
          status: 'Actual',
          mainCategory: 'Revenue',
          category: 'Revenue',
          amount: 0,
          balance: 100,
        }),
        makeRow({
          date: '2026-05-01',
          workMonth: '2026-05',
          month: '2026-05',
          type: 'Outflow',
          status: 'Forecast',
          mainCategory: 'OpEx',
          category: 'OpEx',
          amount: 100,
          balance: 0,
        }),
        makeRow({
          date: '2026-06-01',
          workMonth: '2026-06',
          month: '2026-06',
          type: 'Outflow',
          status: 'Forecast',
          mainCategory: 'OpEx',
          category: 'OpEx',
          amount: 1,
          balance: -1,
        }),
      ];

      const normalized = normalizeTransactions(rawRows, DEFAULT_DASHBOARD_SETTINGS);
      const crossing = getApproximateBaseForecastZeroCrossing(normalized, 100, new Date('2026-06-01T00:00:00.000Z'));

      assert.deepEqual(crossing, {
        crossingMonth: '2026-06',
        approximateNegativeDate: '2026-06-01',
        daysUntilCrossing: 0,
        approximate: true,
      });
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
