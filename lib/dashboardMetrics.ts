import { DEFAULT_DASHBOARD_SETTINGS, getRevenueSourceLabel } from './dataUtils';
import type {
  CostBehavior,
  DashboardSettings,
  MainCategory,
  NormalizedTransaction,
  ProductionSummaryRow,
  SponsorPipelineDeal,
  Transaction,
  TransactionStatus,
} from './types';

function resolveSettings(settings?: DashboardSettings | null): DashboardSettings {
  return settings ?? DEFAULT_DASHBOARD_SETTINGS;
}

function normalizeMonth(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7);
  return value;
}

function normalizeStatus(value?: string): TransactionStatus {
  if (value === 'Committed' || value === 'Forecast' || value === 'Cancelled' || value === 'Actual') {
    return value;
  }
  return 'Forecast';
}

function inferMainCategory(tx: Transaction): MainCategory {
  if (tx.mainCategory) return tx.mainCategory;

  const legacy = (tx.category || '').toLowerCase();
  if (tx.type === 'Inflow') return 'Revenue';
  if (legacy.includes('ต้นทุน') || legacy.includes('cogs')) return 'COGS';
  if (legacy.includes('capex') || legacy.includes('อุปกรณ์')) return 'CapEx';
  return 'OpEx';
}

function inferCostBehavior(tx: Transaction, settings: DashboardSettings): CostBehavior {
  if (tx.costBehavior === 'Fixed' || tx.costBehavior === 'Variable') return tx.costBehavior;
  const desc = tx.desc || tx.subCategory || '';
  const bucket = settings.costClassification;
  if (bucket.fixed.keywords.some(keyword => desc.includes(keyword))) return 'Fixed';
  return 'Variable';
}

function inferSponsor(tx: Transaction, settings: DashboardSettings): string {
  if (tx.sponsor?.trim()) return tx.sponsor.trim();
  if (tx.type !== 'Inflow') return '';
  const label = getRevenueSourceLabel(tx.desc || '', settings);
  return label === 'Other' ? '' : label;
}

function inferPerson(tx: Transaction, settings: DashboardSettings): string {
  if (tx.person?.trim()) return tx.person.trim();
  const desc = tx.desc || '';
  return settings.costClassification.peopleCostKeywords.some(keyword => desc.includes(keyword)) ? desc : '';
}

export function normalizeTransactions(
  rawData: Transaction[],
  settings?: DashboardSettings | null
): NormalizedTransaction[] {
  const resolved = resolveSettings(settings);

  return rawData
    .map((tx) => {
      const workMonth = normalizeMonth(tx.workMonth || tx.month || tx.dueDate || tx.date);
      if (!workMonth) return null;

      return {
        date: tx.date,
        workMonth,
        type: tx.type,
        status: normalizeStatus(tx.status),
        mainCategory: inferMainCategory(tx),
        subCategory: tx.subCategory?.trim() || tx.category || (tx.entity ?? ''),
        description: tx.desc,
        amount: Number(tx.amount) || 0,
        originalForecast: Number(tx.originalForecast ?? 0) || 0,
        person: inferPerson(tx, resolved),
        costBehavior: inferCostBehavior(tx, resolved),
        sponsor: inferSponsor(tx, resolved),
        note: tx.note?.trim() || '',
        balance: Number(tx.balance) || 0,
      } satisfies NormalizedTransaction;
    })
    .filter((value): value is NormalizedTransaction => Boolean(value))
    .sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description));
}

export function getMonths(data: NormalizedTransaction[]): string[] {
  return Array.from(new Set(data.map(item => item.workMonth))).sort();
}

export function groupByMonth(data: NormalizedTransaction[]): Record<string, NormalizedTransaction[]> {
  return data.reduce<Record<string, NormalizedTransaction[]>>((acc, tx) => {
    (acc[tx.workMonth] ||= []).push(tx);
    return acc;
  }, {});
}

export function getCurrentCash(data: NormalizedTransaction[], openingBalance: number): number {
  const actual = data.filter(item => item.status === 'Actual');
  if (actual.length === 0) return openingBalance;
  return actual[actual.length - 1]?.balance ?? openingBalance;
}

export function getMonthlyRevenue(data: NormalizedTransaction[]): Record<string, number> {
  const byMonth = groupByMonth(data);
  return Object.fromEntries(
    Object.entries(byMonth).map(([month, rows]) => [
      month,
      rows.filter(row => row.type === 'Inflow' && row.status !== 'Cancelled').reduce((sum, row) => sum + row.amount, 0),
    ])
  );
}

export function getMonthlyOutflow(data: NormalizedTransaction[]): Record<string, number> {
  const byMonth = groupByMonth(data);
  return Object.fromEntries(
    Object.entries(byMonth).map(([month, rows]) => [
      month,
      rows.filter(row => row.type === 'Outflow' && row.status !== 'Cancelled').reduce((sum, row) => sum + row.amount, 0),
    ])
  );
}

export function getAverageMonthlyNetBurn(
  data: NormalizedTransaction[],
  settings?: DashboardSettings | null
): number {
  const resolved = resolveSettings(settings);
  const revenue = getMonthlyRevenue(data);
  const outflow = getMonthlyOutflow(data);
  const months = Object.keys(revenue)
    .filter(month => data.some(row => row.workMonth === month && row.status === 'Actual'))
    .sort()
    .slice(-resolved.scenario.runwayLookbackMonths);

  const deficits = months
    .map(month => (outflow[month] || 0) - (revenue[month] || 0))
    .filter(value => value > 0);

  if (deficits.length === 0) return 0;
  return deficits.reduce((sum, value) => sum + value, 0) / deficits.length;
}

export function calculateCashRunway(
  data: NormalizedTransaction[],
  openingBalance: number,
  settings?: DashboardSettings | null
): number {
  const currentCash = getCurrentCash(data, openingBalance);
  const burn = getAverageMonthlyNetBurn(data, settings);
  if (burn <= 0) return Number.POSITIVE_INFINITY;
  return currentCash / burn;
}

export function getCashAlerts(
  data: NormalizedTransaction[],
  openingBalance: number,
  settings?: DashboardSettings | null
) {
  const resolved = resolveSettings(settings);
  const revenue = getMonthlyRevenue(data);
  const outflow = getMonthlyOutflow(data);
  const months = Object.keys({ ...revenue, ...outflow }).sort();
  const currentMonth = months.at(-1) ?? '';
  const previousMonth = months.length > 1 ? months[months.length - 2] : '';
  const runway = calculateCashRunway(data, openingBalance, resolved);

  return {
    runwayLow: Number.isFinite(runway) && runway < resolved.healthThresholds.cashRunwayMonths.cautionMin,
    monthlyLoss: currentMonth ? (revenue[currentMonth] || 0) < (outflow[currentMonth] || 0) : false,
    revenueDrop:
      currentMonth && previousMonth
        ? (revenue[currentMonth] || 0) < (revenue[previousMonth] || 0) * resolved.healthThresholds.revenueDropRatio.warningMax
        : false,
  };
}

export interface MonthlyPnLRow {
  month: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number | null;
  opEx: number;
  operatingProfit: number;
  operatingMarginPct: number | null;
  capEx: number;
  peopleCost: number;
  headcountCostRatio: number | null;
  actualAmount: number;
  originalForecast: number;
  variancePct: number | null;
}

export function buildMonthlyPnLRows(
  data: NormalizedTransaction[],
  settings?: DashboardSettings | null
): MonthlyPnLRow[] {
  const resolved = resolveSettings(settings);
  const byMonth = groupByMonth(data);

  return Object.keys(byMonth).sort().map((month) => {
    const rows = byMonth[month].filter(row => row.status !== 'Cancelled');
    const revenue = rows.filter(row => row.type === 'Inflow').reduce((sum, row) => sum + row.amount, 0);
    const cogs = rows.filter(row => row.type === 'Outflow' && row.mainCategory === 'COGS').reduce((sum, row) => sum + row.amount, 0);
    const opEx = rows.filter(row => row.type === 'Outflow' && row.mainCategory === 'OpEx').reduce((sum, row) => sum + row.amount, 0);
    const capEx = rows.filter(row => row.type === 'Outflow' && row.mainCategory === 'CapEx').reduce((sum, row) => sum + row.amount, 0);
    const peopleCost = rows
      .filter(row => row.type === 'Outflow' && row.person && resolved.costClassification.peopleCostKeywords.some(keyword => row.person.includes(keyword) || row.description.includes(keyword)))
      .reduce((sum, row) => sum + row.amount, 0);
    const actualAmount = rows.filter(row => row.status === 'Actual').reduce((sum, row) => sum + row.amount * (row.type === 'Inflow' ? 1 : -1), 0);
    const originalForecast = rows.reduce((sum, row) => sum + row.originalForecast, 0);
    const grossProfit = revenue - cogs;
    const operatingProfit = grossProfit - opEx;

    return {
      month,
      revenue,
      cogs,
      grossProfit,
      grossMarginPct: revenue > 0 ? (grossProfit / revenue) * 100 : null,
      opEx,
      operatingProfit,
      operatingMarginPct: revenue > 0 ? (operatingProfit / revenue) * 100 : null,
      capEx,
      peopleCost,
      headcountCostRatio: revenue > 0 ? peopleCost / revenue : null,
      actualAmount,
      originalForecast,
      variancePct: originalForecast > 0 ? ((actualAmount - originalForecast) / originalForecast) * 100 : null,
    };
  });
}

export function calculateForecastAccuracy(data: NormalizedTransaction[]): number | null {
  const rows = data.filter(row => row.status === 'Actual' && row.originalForecast > 0);
  if (rows.length === 0) return null;
  const actual = rows.reduce((sum, row) => sum + row.amount, 0);
  const forecast = rows.reduce((sum, row) => sum + row.originalForecast, 0);
  if (forecast === 0) return null;
  return 1 - Math.abs(actual - forecast) / forecast;
}

export function calculateCostPerContent(
  row: MonthlyPnLRow,
  productionSummary: ProductionSummaryRow[]
): number | null {
  const summary = productionSummary.find(item => item.workMonth === row.month);
  if (!summary || summary.totalContent <= 0) return null;
  return row.cogs / summary.totalContent;
}

export function calculateWeightedPipeline(deals: SponsorPipelineDeal[]): number {
  return deals.reduce((sum, deal) => sum + (deal.weightedValue ?? deal.dealValue * (deal.probability / 100)), 0);
}

export function buildScenarioForecast(
  data: NormalizedTransaction[],
  openingBalance: number,
  settings?: DashboardSettings | null
) {
  const resolved = resolveSettings(settings);
  const monthlyRows = buildMonthlyPnLRows(data, resolved);
  const recent = monthlyRows.slice(-resolved.scenario.breakEvenLookbackMonths);
  const avgOutflow = recent.length > 0 ? recent.reduce((sum, row) => sum + row.cogs + row.opEx + row.capEx, 0) / recent.length : 0;
  const avgRevenue = recent.length > 0 ? recent.reduce((sum, row) => sum + row.revenue, 0) / recent.length : 0;
  const currentCash = getCurrentCash(data, openingBalance);

  const baseInflow = avgRevenue;
  const baseOutflow = avgOutflow;
  const bestInflow = avgRevenue * (1 + resolved.scenario.bestCaseRevenueLiftPct / 100);
  const worstInflow = avgRevenue * (1 - resolved.scenario.worstCaseRevenueHaircutPct / 100);

  return {
    breakEvenRevenue: avgOutflow,
    base: { monthlyNet: baseInflow - baseOutflow, endingCash: currentCash + (baseInflow - baseOutflow) * resolved.scenario.projectionMonths },
    best: { monthlyNet: bestInflow - baseOutflow, endingCash: currentCash + (bestInflow - baseOutflow) * resolved.scenario.projectionMonths },
    worst: { monthlyNet: worstInflow - baseOutflow, endingCash: currentCash + (worstInflow - baseOutflow) * resolved.scenario.projectionMonths },
  };
}
