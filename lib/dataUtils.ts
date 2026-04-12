import type { DashboardSettings, FilterType, Transaction } from './types';

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  revenueSources: [
    { label: 'Eightcap', keywords: ['Eightcap'] },
    { label: 'InnovestX', keywords: ['InnovestX'] },
    { label: 'OceanLife', keywords: ['OceanLife'] },
    { label: 'เงินเทอร์โบ', keywords: ['เงินเทอร์โบ'] },
    { label: 'Webull', keywords: ['Webull'] },
    { label: 'Facebook Ads', keywords: ['Facebook', 'Facebook Ads', 'Meta'] },
    { label: 'TikTok', keywords: ['TikTok'] },
  ],
  costClassification: {
    fixed: {
      label: 'Fixed',
      keywords: ['เงินเดือน', 'ChatGPT', 'Gemini', 'Claude', 'บัญชี', 'ธรรมเนียม'],
    },
    production: {
      label: 'Production',
      keywords: [
        'ค่าจ้าง',
        'โบนัส',
        'พากย์เสียง',
        'เขียนบท',
        'ทำฟุตเทจ',
        'ตัดต่อ',
        'กราฟิกข่าว',
        'จัดหาข่าว',
        'ดูแลลูกค้า',
        'ดูแลคอมมูนิตี้',
      ],
    },
    onetime: {
      label: 'One-time',
      keywords: ['อุปกรณ์', 'ไมค์', 'จอมอนิเตอร์', 'ฟอนต์', 'Freepik', 'Vecteezy', 'ตัวจ้างงาน', 'ภาษี'],
    },
    directKeywords: [
      'พากย์เสียง',
      'เขียนบท',
      'ทำฟุตเทจ',
      'ตัดต่อ',
      'Production',
      'ค่าจ้าง',
      'ค่าจ้างจัดทำของ',
      'ค่าจ้างอุปกรณ์',
      'ค่าอุปกรณ์',
      'ดูแลลูกค้า',
      'ดูแลคอมมูนิตี้',
    ],
  },
  healthThresholds: {
    cashRunwayMonths: { healthyMin: 6, cautionMin: 3 },
    grossMarginPct: { healthyMin: 30, cautionMin: 0 },
    revenueHHI: { diversifiedMax: 2500, moderateMax: 5000 },
    execToProdRatio: { healthyMax: 0.5, cautionMax: 1.5 },
    breakEvenGapPct: { surplusMin: 0, nearMin: -20 },
  },
  scenario: {
    revenueTarget: { default: 34000, min: 0, max: 200000, step: 1000 },
    execSalaryAdjustmentPct: { default: 0, min: -50, max: 0, step: 5 },
    productionCostAdjustmentPct: { default: 0, min: -30, max: 30, step: 5 },
    projectionMonths: 6,
  },
  refresh: {
    sheetId: '1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8',
    csvExportUrl: 'https://docs.google.com/spreadsheets/d/1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8/export?format=csv',
    fallbackOpeningBalance: 124331.84,
  },
};

function resolveSettings(settings?: DashboardSettings | null): DashboardSettings {
  return settings ?? DEFAULT_DASHBOARD_SETTINGS;
}

export const fmt = (n: number): string =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export function getFilteredData(
  rawData: Transaction[],
  currentFilter: FilterType
): Transaction[] {
  let data = rawData;

  if (currentFilter === 'all') return data;
  if (currentFilter === 'actual') return data.filter(d => d.status === 'Actual');
  if (currentFilter === 'forecast') return data.filter(d => d.status === 'Forecast');
  return data.filter(d => d.month === currentFilter);
}

export function getAvailableMonths(data: Transaction[]): string[] {
  return Array.from(new Set(data.map(d => d.month).filter(Boolean))).sort();
}

export function formatMonthLabel(month: string, locale: string = 'en-US'): string {
  const [year, rawMonth] = month.split('-').map(Number);
  if (!year || !rawMonth) return month;
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(
    new Date(year, rawMonth - 1, 1)
  );
}

export function classifyCost(
  desc: string,
  settings?: DashboardSettings | null
): 'fixed' | 'production' | 'onetime' {
  const { costClassification } = resolveSettings(settings);
  if (costClassification.fixed.keywords.some(keyword => desc.includes(keyword))) return 'fixed';
  if (costClassification.onetime.keywords.some(keyword => desc.includes(keyword))) return 'onetime';
  if (costClassification.production.keywords.some(keyword => desc.includes(keyword))) return 'production';
  return 'fixed';
}

export function getRevenueSourceLabel(desc: string, settings?: DashboardSettings | null): string {
  const { revenueSources } = resolveSettings(settings);
  for (const source of revenueSources) {
    if (source.keywords.some(keyword => desc.includes(keyword))) return source.label;
  }
  return 'Other';
}

export function calculateHHI(data: Transaction[], settings?: DashboardSettings | null): number {
  const resolved = resolveSettings(settings);
  const sources: Record<string, number> = {};

  data.filter(d => d.type === 'Inflow').forEach(d => {
    const src = getRevenueSourceLabel(d.desc, resolved);
    sources[src] = (sources[src] || 0) + d.amount;
  });

  const total = Object.values(sources).reduce((s, v) => s + v, 0);
  if (total === 0) return 10000;
  return Object.values(sources).reduce((hhi, v) => hhi + Math.pow((v / total) * 100, 2), 0);
}

export function getCostType(
  d: Transaction,
  settings?: DashboardSettings | null
): 'Direct' | 'Indirect' | null {
  if (d.category !== 'ต้นทุนสินค้า' || d.entity !== 'Video Production') return null;
  const { costClassification } = resolveSettings(settings);
  if (costClassification.directKeywords.some(keyword => d.desc.includes(keyword))) return 'Direct';
  return 'Indirect';
}

export async function loadDashboardSettings(): Promise<DashboardSettings> {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_SETTINGS;

  try {
    const response = await fetch('/api/settings', { cache: 'no-store' });
    if (!response.ok) return DEFAULT_DASHBOARD_SETTINGS;
    return (await response.json()) as DashboardSettings;
  } catch {
    return DEFAULT_DASHBOARD_SETTINGS;
  }
}
