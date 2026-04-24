import { DEFAULT_DASHBOARD_SETTINGS, getRevenueSourceLabel } from './dataUtils';
import type {
  CostBehavior,
  DashboardSettings,
  MainCategory,
  NormalizedTransaction,
  ProductionSummaryRow,
  SponsorPipelineDeal,
  RawTransactionRow,
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

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function utcMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function addMonths(month: string, offset: number): string {
  const [year, rawMonth] = month.split('-').map(Number);
  if (!year || !rawMonth) return month;
  return monthKey(new Date(year, rawMonth - 1 + offset, 1));
}

function nextMonth(month: string): string {
  return addMonths(month, 1);
}

function sortMonths(months: Iterable<string>): string[] {
  return Array.from(new Set(months)).filter(Boolean).sort();
}

function normalizeStatus(value?: string): TransactionStatus {
  if (value === 'Committed' || value === 'Forecast' || value === 'Cancelled' || value === 'Actual') {
    return value;
  }
  return 'Forecast';
}

function inferMainCategory(tx: RawTransactionRow): MainCategory {
  if (tx.mainCategory) return tx.mainCategory;

  const legacy = (tx.category || '').toLowerCase();
  if (tx.type === 'Inflow') return 'Revenue';
  if (legacy.includes('ต้นทุน') || legacy.includes('cogs')) return 'COGS';
  if (legacy.includes('capex') || legacy.includes('อุปกรณ์')) return 'CapEx';
  return 'OpEx';
}

function inferCostBehavior(tx: RawTransactionRow, settings: DashboardSettings): CostBehavior {
  if (tx.costBehavior === 'Fixed' || tx.costBehavior === 'Variable') return tx.costBehavior;
  const desc = tx.desc || tx.subCategory || '';
  const bucket = settings.costClassification;
  if (bucket.fixed.keywords.some(keyword => desc.includes(keyword))) return 'Fixed';
  return 'Variable';
}

function inferSponsor(tx: RawTransactionRow, settings: DashboardSettings): string {
  if (tx.sponsor?.trim()) return tx.sponsor.trim();
  if (tx.type !== 'Inflow') return '';
  const label = getRevenueSourceLabel(tx.desc || '', settings);
  return label === 'Other' ? '' : label;
}

function inferPerson(tx: RawTransactionRow, settings: DashboardSettings): string {
  if (tx.person?.trim()) return tx.person.trim();
  const desc = tx.desc || '';
  return settings.costClassification.peopleCostKeywords.some(keyword => desc.includes(keyword)) ? desc : '';
}

export function normalizeTransactions(
  rawData: RawTransactionRow[],
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
  const monthlyActualRows = buildMonthlyCashFlowRows(actual, openingBalance);
  return monthlyActualRows.at(-1)?.balance ?? openingBalance;
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
  revenueForecast: number;
  revenueVariance: number;
  revenueVariancePct: number | null;
  cogs: number;
  costForecast: number;
  costVariance: number;
  costVariancePct: number | null;
  grossProfit: number;
  grossMarginPct: number | null;
  opEx: number;
  operatingProfit: number;
  operatingMarginPct: number | null;
  capEx: number;
  peopleCost: number;
  headcountCostRatio: number | null;
  cashAfterCapEx: number;
  cashMarginPct: number | null;
}

export interface MonthlyCashFlowRow {
  month: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface ScenarioProjectionRow {
  month: string;
  actualBalance: number | null;
  baseNet: number;
  bullNet: number;
  bearNet: number;
  baseBalance: number | null;
  bullBalance: number | null;
  bearBalance: number | null;
}

export interface ApproximateBaseForecastZeroCrossing {
  crossingMonth: string;
  approximateNegativeDate: string;
  daysUntilCrossing: number;
  approximate: true;
}

function signedAmount(row: NormalizedTransaction): number {
  return row.type === 'Inflow' ? row.amount : -row.amount;
}

function accumulateBalances(startingBalance: number, monthlyNet: number[]): number[] {
  let runningBalance = startingBalance;
  return monthlyNet.map(net => {
    runningBalance += net;
    return runningBalance;
  });
}

function getScenarioStartingCash(data: NormalizedTransaction[], openingBalance: number): number {
  const actualRows = data.filter(row => row.status === 'Actual');
  const latestActualMonth = sortMonths(actualRows.map(row => row.workMonth)).at(-1);
  if (!latestActualMonth) return getCurrentCash(data, openingBalance);
  const monthlyActualRows = buildMonthlyCashFlowRows(actualRows, openingBalance);
  return monthlyActualRows.at(-1)?.balance ?? getCurrentCash(data, openingBalance);
}

function isAdRevenue(row: NormalizedTransaction): boolean {
  const text = [row.sponsor, row.subCategory, row.description, row.note].join(' ').toLowerCase();
  return text.includes('ad') || text.includes('ads') || text.includes('facebook') || text.includes('meta') || text.includes('tiktok');
}

function isShiftableCustomerInflow(row: NormalizedTransaction): boolean {
  return row.type === 'Inflow' && row.mainCategory === 'Revenue' && !isAdRevenue(row);
}

function sumMonthNet(rows: NormalizedTransaction[], month: string): number {
  return rows
    .filter(row => row.workMonth === month && row.status !== 'Cancelled')
    .reduce((sum, row) => sum + signedAmount(row), 0);
}

function monthStartUtc(month: string): Date {
  const [year, rawMonth] = month.split('-').map(Number);
  return new Date(Date.UTC(year, rawMonth - 1, 1));
}

function daysInMonthUtc(month: string): number {
  const [year, rawMonth] = month.split('-').map(Number);
  return new Date(Date.UTC(year, rawMonth, 0)).getUTCDate();
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function msUntilNextLocalMidnight(now: Date): number {
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  return Math.max(1, nextMidnight.getTime() - now.getTime());
}

export function buildMonthlyPnLRows(
  data: NormalizedTransaction[],
  settings?: DashboardSettings | null
): MonthlyPnLRow[] {
  const resolved = resolveSettings(settings);
  const byMonth = groupByMonth(data);

  return Object.keys(byMonth).sort().map((month) => {
    const rows = byMonth[month].filter(row => row.status !== 'Cancelled');
    const actualRows = rows.filter(row => row.status === 'Actual');
    const actualRevenueRows = actualRows.filter(row => row.type === 'Inflow');
    const actualCostRows = actualRows.filter(row => row.type === 'Outflow');
    const actualRevenue = actualRevenueRows.reduce((sum, row) => sum + row.amount, 0);
    const actualCost = actualCostRows.reduce((sum, row) => sum + row.amount, 0);
    const revenueForecast = actualRevenueRows.reduce((sum, row) => sum + (Number(row.originalForecast) || 0), 0);
    const costForecast = actualCostRows.reduce((sum, row) => sum + (Number(row.originalForecast) || 0), 0);
    const revenue = rows.filter(row => row.type === 'Inflow').reduce((sum, row) => sum + row.amount, 0);
    const cogs = rows.filter(row => row.type === 'Outflow' && row.mainCategory === 'COGS').reduce((sum, row) => sum + row.amount, 0);
    const opEx = rows.filter(row => row.type === 'Outflow' && row.mainCategory === 'OpEx').reduce((sum, row) => sum + row.amount, 0);
    const capEx = rows.filter(row => row.type === 'Outflow' && row.mainCategory === 'CapEx').reduce((sum, row) => sum + row.amount, 0);
    const peopleCost = rows
      .filter(row => row.type === 'Outflow' && row.person)
      .reduce((sum, row) => sum + row.amount, 0);
    const grossProfit = revenue - cogs;
    const operatingProfit = grossProfit - opEx;
    const cashAfterCapEx = operatingProfit - capEx;

    return {
      month,
      revenue,
      revenueForecast,
      revenueVariance: actualRevenue - revenueForecast,
      revenueVariancePct: revenueForecast > 0 ? ((actualRevenue - revenueForecast) / revenueForecast) * 100 : null,
      cogs,
      costForecast,
      costVariance: actualCost - costForecast,
      costVariancePct: costForecast > 0
        ? ((actualCost - costForecast) / costForecast) * 100
        : null,
      grossProfit,
      grossMarginPct: revenue > 0 ? (grossProfit / revenue) * 100 : null,
      opEx,
      operatingProfit,
      operatingMarginPct: revenue > 0 ? (operatingProfit / revenue) * 100 : null,
      capEx,
      peopleCost,
      headcountCostRatio: revenue > 0 ? peopleCost / revenue : null,
      cashAfterCapEx,
      cashMarginPct: revenue > 0 ? (cashAfterCapEx / revenue) * 100 : null,
    };
  });
}

export function buildMonthlyCashFlowRows(
  data: NormalizedTransaction[],
  openingBalance: number
): MonthlyCashFlowRow[] {
  const activeRows = data.filter(row => row.status !== 'Cancelled');
  const months = sortMonths(activeRows.map(row => row.workMonth));
  const inflows = months.map(month =>
    activeRows
      .filter(row => row.workMonth === month && row.type === 'Inflow')
      .reduce((sum, row) => sum + row.amount, 0)
  );
  const outflows = months.map(month =>
    activeRows
      .filter(row => row.workMonth === month && row.type === 'Outflow')
      .reduce((sum, row) => sum + row.amount, 0)
  );
  const balances = accumulateBalances(openingBalance, inflows.map((value, index) => value - outflows[index]));

  return months.map((month, index) => ({
    month,
    inflow: inflows[index],
    outflow: outflows[index],
    balance: balances[index],
  }));
}

export function buildScenarioProjection(
  data: NormalizedTransaction[],
  openingBalance: number,
  settings?: DashboardSettings | null
): ScenarioProjectionRow[] {
  const resolved = resolveSettings(settings);
  const activeRows = data.filter(row => row.status !== 'Cancelled');
  const actualRows = activeRows.filter(row => row.status === 'Actual');
  const actualMonthlyRows = buildMonthlyCashFlowRows(actualRows, openingBalance);
  const actualBalanceByMonth = new Map(actualMonthlyRows.map(row => [row.month, row.balance]));
  const actualMonths = actualMonthlyRows.map(row => row.month);
  const latestActualMonth = actualMonths.at(-1) ?? sortMonths(activeRows.map(row => row.workMonth)).at(0) ?? monthKey(new Date());
  const currentCash = getScenarioStartingCash(data, openingBalance);
  const futureRows = activeRows.filter(row => row.status !== 'Actual' && row.workMonth >= latestActualMonth);
  const baseMonths = sortMonths(futureRows.map(row => row.workMonth));
  const fallbackStartMonth = nextMonth(latestActualMonth);
  const firstActualMonth = actualMonths[0] ?? latestActualMonth;
  const forecastEndMonth = addMonths(baseMonths.at(-1) ?? fallbackStartMonth, 1);

  const months: string[] = [];
  for (let month = firstActualMonth; month <= forecastEndMonth; month = nextMonth(month)) {
    months.push(month);
  }

  const bullStartMonth = addMonths(latestActualMonth, resolved.scenario.bullCreditTermMonths);
  const baseNetByMonth = months.map(month => (month < latestActualMonth ? 0 : sumMonthNet(futureRows, month)));
  const bullNetByMonth = baseNetByMonth.map((baseNet, index) => {
    const month = months[index];
    const isBeforeScenario = month < latestActualMonth;
    const isScenarioStart = month === latestActualMonth;
    const bullExtra = !isBeforeScenario && !isScenarioStart && month >= bullStartMonth ? resolved.scenario.bullMonthlyCash : 0;
    return baseNet + bullExtra;
  });
  const bearNetByMonth = months.map(month => {
    if (month < latestActualMonth) return 0;
    return futureRows.reduce((sum, row) => {
      const shiftedMonth = isShiftableCustomerInflow(row) ? nextMonth(row.workMonth) : row.workMonth;
      return shiftedMonth === month ? sum + signedAmount(row) : sum;
    }, 0);
  });

  const baseBalances = accumulateBalances(currentCash, baseNetByMonth);
  const bullBalances = accumulateBalances(currentCash, bullNetByMonth);
  const bearBalances = accumulateBalances(currentCash, bearNetByMonth);

  return months.map((month, index) => ({
    month,
    actualBalance: month <= latestActualMonth ? actualBalanceByMonth.get(month) ?? null : null,
    baseNet: baseNetByMonth[index],
    bullNet: bullNetByMonth[index],
    bearNet: bearNetByMonth[index],
    baseBalance: month < latestActualMonth ? null : baseBalances[index],
    bullBalance: month < latestActualMonth ? null : bullBalances[index],
    bearBalance: month < latestActualMonth ? null : bearBalances[index],
  }));
}

export function getApproximateBaseForecastZeroCrossing(
  data: NormalizedTransaction[],
  openingBalance: number,
  today: Date,
  settings?: DashboardSettings | null
): ApproximateBaseForecastZeroCrossing | null {
  const projection = buildScenarioProjection(data, openingBalance, settings);
  const todayMonth = utcMonthKey(today);
  const currentCash = getScenarioStartingCash(data, openingBalance);
  const crossingIndex = projection.findIndex(row => row.month >= todayMonth && row.baseBalance !== null && row.baseBalance < 0);

  if (crossingIndex < 0) return null;

  const crossingRow = projection[crossingIndex];
  const monthStartBalance =
    crossingIndex === 0
      ? currentCash
      : (projection[crossingIndex - 1]?.baseBalance ?? currentCash);
  const monthEndBalance = crossingRow.baseBalance;
  if (monthEndBalance === null) return null;

  const monthStart = monthStartUtc(crossingRow.month);
  const monthSpanDays = Math.max(daysInMonthUtc(crossingRow.month) - 1, 0);
  const crossingOffsetDays =
    monthStartBalance <= 0
      ? 0
      : monthEndBalance >= 0
        ? monthSpanDays
        : monthSpanDays * (monthStartBalance / (monthStartBalance - monthEndBalance));
  const approximateNegativeDate = formatUtcDate(addUtcDays(monthStart, Math.round(crossingOffsetDays)));
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const crossingStart = new Date(Date.UTC(
    Number(approximateNegativeDate.slice(0, 4)),
    Number(approximateNegativeDate.slice(5, 7)) - 1,
    Number(approximateNegativeDate.slice(8, 10))
  ));
  const daysUntilCrossing = Math.max(0, Math.round((crossingStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)));

  return {
    crossingMonth: crossingRow.month,
    approximateNegativeDate,
    daysUntilCrossing,
    approximate: true,
  };
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
