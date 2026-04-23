import type { DashboardSettings, FilterType, Transaction } from './types';
import { DEFAULT_DASHBOARD_SETTINGS as SETTINGS_DEFAULTS } from './settingsDefaults';

export const DEFAULT_DASHBOARD_SETTINGS = SETTINGS_DEFAULTS;

function resolveSettings(settings?: DashboardSettings | null): DashboardSettings {
  return settings ?? DEFAULT_DASHBOARD_SETTINGS;
}

function normalizeText(value: string | undefined | null): string {
  return (value ?? '').trim();
}

function transactionSearchText(transaction: Transaction): string {
  return [
    transaction.sponsor,
    transaction.person,
    transaction.desc,
    transaction.desc,
    transaction.subCategory,
    transaction.category,
    transaction.mainCategory,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(' ');
}

export const fmt = (n: number): string =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export function getFilteredData(rawData: Transaction[], currentFilter: FilterType): Transaction[] {
  if (currentFilter === 'all') return rawData;
  if (currentFilter === 'actual') return rawData.filter(d => d.status === 'Actual');
  if (currentFilter === 'committed') return rawData.filter(d => d.status === 'Committed');
  if (currentFilter === 'forecast') return rawData.filter(d => d.status === 'Forecast');
  return rawData.filter(d => (d.workMonth || d.month) === currentFilter);
}

export function getAvailableMonths(data: Transaction[]): string[] {
  return Array.from(new Set(data.map(d => d.workMonth || d.month).filter(Boolean))).sort();
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
  if (costClassification.peopleCostKeywords.some(keyword => desc.includes(keyword))) return 'fixed';
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

  data
    .filter(d => d.type === 'Inflow')
    .forEach(d => {
      const src = getRevenueSourceLabel(transactionSearchText(d), resolved);
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
  const text = transactionSearchText(d);
  const mainCategory = normalizeText(d.mainCategory || d.category);
  const isProductionCost =
    mainCategory === 'COGS' ||
    /ต้นทุน|production|video|content|พากย์|ตัดต่อ|เขียนบท|กราฟิก|จัดทำ/i.test(text) ||
    d.entity === 'Video Production';

  if (!isProductionCost) return null;

  const { costClassification } = resolveSettings(settings);
  if (costClassification.directKeywords.some(keyword => text.includes(keyword))) return 'Direct';
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
