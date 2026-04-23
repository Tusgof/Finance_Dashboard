import type { DashboardSettings } from './types';

export const SHEET_ID = '1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8';
export const SHEET_GIDS = {
  transactions: '0',
  monthlyProductionSummary: '1557377060',
  sponsorPipeline: '931890610',
  lists: '601994452',
} as const;

export function buildCsvExportUrl(sheetId: string, gid = SHEET_GIDS.transactions): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  revenueSources: [
    { label: 'Eightcap', keywords: ['Eightcap'] },
    { label: 'InnovestX', keywords: ['InnovestX'] },
    { label: 'OceanLife', keywords: ['OceanLife'] },
    { label: 'เงินเทอร์โบ', keywords: ['เงินเทอร์โบ', 'เงินเทอร์โบ้'] },
    { label: 'Webull', keywords: ['Webull'] },
    { label: 'Facebook Ads', keywords: ['Facebook', 'Facebook Ads', 'Meta'] },
    { label: 'TikTok', keywords: ['TikTok', 'Tiktok'] },
    { label: 'TTB', keywords: ['TTB'] },
    { label: 'Insurverse', keywords: ['Insurverse'] },
  ],
  costClassification: {
    fixed: {
      label: 'Fixed',
      keywords: ['เงินเดือน', 'ค่าจ้าง', 'ChatGPT', 'Gemini', 'Claude', 'บัญชี', 'ธรรมเนียม'],
    },
    production: {
      label: 'Production',
      keywords: [
        'ค่าจ้างจัดทำ',
        'ค่าจ้างพากย์เสียง',
        'เขียนบท',
        'ตัดต่อ',
        'กราฟิก',
        'จัดหาข่าว',
        'ทำฟุตเทจ',
        'ค่าอุปกรณ์',
        'Production',
        'Video Production',
      ],
    },
    onetime: {
      label: 'One-time',
      keywords: ['อุปกรณ์', 'ไมค์', 'จอมอนิเตอร์', 'ฟอนต์', 'Freepik', 'Vecteezy', 'ภาษี'],
    },
    directKeywords: [
      'พากย์เสียง',
      'เขียนบท',
      'ทำฟุตเทจ',
      'ตัดต่อ',
      'Production',
      'ค่าจ้างจัดทำ',
      'ค่าอุปกรณ์',
      'ดูแลคอมมูนิตี้',
      'ดูแลลูกค้า',
    ],
    peopleCostKeywords: ['ค่าจ้าง', 'เงินเดือน', 'salary', 'wage', 'พี่บิว', 'พี่โจอี้'],
  },
  healthThresholds: {
    cashRunwayMonths: { healthyMin: 6, cautionMin: 3 },
    grossMarginPct: { healthyMin: 30, cautionMin: 0 },
    revenueHHI: { diversifiedMax: 2500, moderateMax: 5000 },
    revenueDropRatio: { warningMax: 0.5 },
    headcountCostRatio: { healthyMax: 0.5, cautionMax: 0.7 },
    execToProdRatio: { healthyMax: 0.5, cautionMax: 1.5 },
    breakEvenGapPct: { surplusMin: 0, nearMin: -20 },
  },
  scenario: {
    revenueTarget: { default: 75000, min: 0, max: 200000, step: 1000 },
    execSalaryAdjustmentPct: { default: 0, min: -50, max: 20, step: 5 },
    productionCostAdjustmentPct: { default: 0, min: -30, max: 30, step: 5 },
    variableCostReductionPct: { default: 0, min: -30, max: 30, step: 5 },
    newDealRevenue: { default: 0, min: 0, max: 100000, step: 1000 },
    bullMonthlyCash: 30000,
    bullCreditTermMonths: 2,
    bestCaseRevenueLiftPct: 20,
    worstCaseRevenueHaircutPct: 20,
    projectionMonths: 6,
    breakEvenLookbackMonths: 3,
    runwayLookbackMonths: 3,
  },
  refresh: {
    sheetId: SHEET_ID,
    csvExportUrl: buildCsvExportUrl(SHEET_ID),
    productionSummaryPath: 'data/production-summary.json',
    sponsorPipelinePath: 'data/sponsor-pipeline.json',
    fallbackOpeningBalance: 124331.84,
  },
};
