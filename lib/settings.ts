import fs from 'fs';
import path from 'path';
import type {
  CostClassificationSettings,
  DashboardSettings,
  HealthThresholds,
  NumericRangeSetting,
  RefreshSourceConfig,
  RevenueSourceMapping,
  ScenarioSettings,
} from './types';
import { DEFAULT_DASHBOARD_SETTINGS, SHEET_ID, buildCsvExportUrl } from './settingsDefaults';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');

function cloneSettings<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const cleaned = value.map(item => normalizeString(item)).filter(Boolean);
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : [...fallback];
}

function normalizeRange(value: unknown, fallback: NumericRangeSetting): NumericRangeSetting {
  if (!isRecord(value)) return { ...fallback };
  return {
    default: normalizeNumber(value.default, fallback.default),
    min: normalizeNumber(value.min, fallback.min),
    max: normalizeNumber(value.max, fallback.max),
    step: normalizeNumber(value.step, fallback.step),
  };
}

function normalizeBucket(
  value: unknown,
  fallback: { label: string; keywords: string[] }
): { label: string; keywords: string[] } {
  if (!isRecord(value)) return { ...fallback, keywords: [...fallback.keywords] };
  return {
    label: normalizeString(value.label, fallback.label),
    keywords: normalizeStringArray(value.keywords, fallback.keywords),
  };
}

function normalizeRevenueSources(value: unknown, fallback: RevenueSourceMapping[]): RevenueSourceMapping[] {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback.map(item => ({ label: item.label, keywords: [...item.keywords] }));
  }

  const merged = new Map<string, RevenueSourceMapping>();
  for (const item of fallback) {
    merged.set(item.label, { label: item.label, keywords: [...item.keywords] });
  }

  for (const item of value) {
    if (!isRecord(item)) continue;
    const label = normalizeString(item.label);
    if (!label) continue;

    const existing = merged.get(label);
    merged.set(label, {
      label,
      keywords: normalizeStringArray(item.keywords, existing?.keywords ?? []),
    });
  }

  return Array.from(merged.values());
}

function normalizeCostClassification(
  value: unknown,
  fallback: CostClassificationSettings
): CostClassificationSettings {
  if (!isRecord(value)) {
    return {
      fixed: { ...fallback.fixed, keywords: [...fallback.fixed.keywords] },
      production: { ...fallback.production, keywords: [...fallback.production.keywords] },
      onetime: { ...fallback.onetime, keywords: [...fallback.onetime.keywords] },
      directKeywords: [...fallback.directKeywords],
      peopleCostKeywords: [...fallback.peopleCostKeywords],
    };
  }

  return {
    fixed: normalizeBucket(value.fixed, fallback.fixed),
    production: normalizeBucket(value.production, fallback.production),
    onetime: normalizeBucket(value.onetime, fallback.onetime),
    directKeywords: normalizeStringArray(value.directKeywords, fallback.directKeywords),
    peopleCostKeywords: normalizeStringArray(value.peopleCostKeywords, fallback.peopleCostKeywords),
  };
}

function normalizeHealthThresholds(value: unknown, fallback: HealthThresholds): HealthThresholds {
  if (!isRecord(value)) {
    return {
      cashRunwayMonths: { ...fallback.cashRunwayMonths },
      grossMarginPct: { ...fallback.grossMarginPct },
      revenueHHI: { ...fallback.revenueHHI },
      revenueDropRatio: { ...fallback.revenueDropRatio },
      headcountCostRatio: { ...fallback.headcountCostRatio },
      execToProdRatio: { ...fallback.execToProdRatio },
      breakEvenGapPct: { ...fallback.breakEvenGapPct },
    };
  }

  return {
    cashRunwayMonths: isRecord(value.cashRunwayMonths)
      ? {
          healthyMin: normalizeNumber(value.cashRunwayMonths.healthyMin, fallback.cashRunwayMonths.healthyMin),
          cautionMin: normalizeNumber(value.cashRunwayMonths.cautionMin, fallback.cashRunwayMonths.cautionMin),
        }
      : { ...fallback.cashRunwayMonths },
    grossMarginPct: isRecord(value.grossMarginPct)
      ? {
          healthyMin: normalizeNumber(value.grossMarginPct.healthyMin, fallback.grossMarginPct.healthyMin),
          cautionMin: normalizeNumber(value.grossMarginPct.cautionMin, fallback.grossMarginPct.cautionMin),
        }
      : { ...fallback.grossMarginPct },
    revenueHHI: isRecord(value.revenueHHI)
      ? {
          diversifiedMax: normalizeNumber(value.revenueHHI.diversifiedMax, fallback.revenueHHI.diversifiedMax),
          moderateMax: normalizeNumber(value.revenueHHI.moderateMax, fallback.revenueHHI.moderateMax),
        }
      : { ...fallback.revenueHHI },
    revenueDropRatio: isRecord(value.revenueDropRatio)
      ? {
          warningMax: normalizeNumber(value.revenueDropRatio.warningMax, fallback.revenueDropRatio.warningMax),
        }
      : { ...fallback.revenueDropRatio },
    headcountCostRatio: isRecord(value.headcountCostRatio)
      ? {
          healthyMax: normalizeNumber(value.headcountCostRatio.healthyMax, fallback.headcountCostRatio.healthyMax),
          cautionMax: normalizeNumber(value.headcountCostRatio.cautionMax, fallback.headcountCostRatio.cautionMax),
        }
      : { ...fallback.headcountCostRatio },
    execToProdRatio: isRecord(value.execToProdRatio)
      ? {
          healthyMax: normalizeNumber(value.execToProdRatio.healthyMax, fallback.execToProdRatio.healthyMax),
          cautionMax: normalizeNumber(value.execToProdRatio.cautionMax, fallback.execToProdRatio.cautionMax),
        }
      : { ...fallback.execToProdRatio },
    breakEvenGapPct: isRecord(value.breakEvenGapPct)
      ? {
          surplusMin: normalizeNumber(value.breakEvenGapPct.surplusMin, fallback.breakEvenGapPct.surplusMin),
          nearMin: normalizeNumber(value.breakEvenGapPct.nearMin, fallback.breakEvenGapPct.nearMin),
        }
      : { ...fallback.breakEvenGapPct },
  };
}

function normalizeScenarioSettings(value: unknown, fallback: ScenarioSettings): ScenarioSettings {
  if (!isRecord(value)) {
    return {
      revenueTarget: { ...fallback.revenueTarget },
      execSalaryAdjustmentPct: { ...fallback.execSalaryAdjustmentPct },
      productionCostAdjustmentPct: { ...fallback.productionCostAdjustmentPct },
      variableCostReductionPct: { ...fallback.variableCostReductionPct },
      newDealRevenue: { ...fallback.newDealRevenue },
      bullMonthlyCash: fallback.bullMonthlyCash,
      bullCreditTermMonths: fallback.bullCreditTermMonths,
      bestCaseRevenueLiftPct: fallback.bestCaseRevenueLiftPct,
      worstCaseRevenueHaircutPct: fallback.worstCaseRevenueHaircutPct,
      projectionMonths: fallback.projectionMonths,
      breakEvenLookbackMonths: fallback.breakEvenLookbackMonths,
      runwayLookbackMonths: fallback.runwayLookbackMonths,
    };
  }

  return {
    revenueTarget: normalizeRange(value.revenueTarget, fallback.revenueTarget),
    execSalaryAdjustmentPct: normalizeRange(value.execSalaryAdjustmentPct, fallback.execSalaryAdjustmentPct),
    productionCostAdjustmentPct: normalizeRange(
      value.productionCostAdjustmentPct,
      fallback.productionCostAdjustmentPct
    ),
    variableCostReductionPct: normalizeRange(value.variableCostReductionPct, fallback.variableCostReductionPct),
    newDealRevenue: normalizeRange(value.newDealRevenue, fallback.newDealRevenue),
    bullMonthlyCash: normalizeNumber(value.bullMonthlyCash, fallback.bullMonthlyCash),
    bullCreditTermMonths: normalizeNumber(value.bullCreditTermMonths, fallback.bullCreditTermMonths),
    bestCaseRevenueLiftPct: normalizeNumber(value.bestCaseRevenueLiftPct, fallback.bestCaseRevenueLiftPct),
    worstCaseRevenueHaircutPct: normalizeNumber(value.worstCaseRevenueHaircutPct, fallback.worstCaseRevenueHaircutPct),
    projectionMonths: normalizeNumber(value.projectionMonths, fallback.projectionMonths),
    breakEvenLookbackMonths: normalizeNumber(value.breakEvenLookbackMonths, fallback.breakEvenLookbackMonths),
    runwayLookbackMonths: normalizeNumber(value.runwayLookbackMonths, fallback.runwayLookbackMonths),
  };
}

function normalizeRefreshConfig(value: unknown, fallback: RefreshSourceConfig): RefreshSourceConfig {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  const sheetId = normalizeString(value.sheetId, fallback.sheetId || SHEET_ID);
  const legacyDefaultCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const rawCsvExportUrl = normalizeString(value.csvExportUrl, buildCsvExportUrl(sheetId));
  const csvExportUrl = rawCsvExportUrl === legacyDefaultCsvUrl
    ? buildCsvExportUrl(sheetId)
    : rawCsvExportUrl;

  return {
    sheetId,
    csvExportUrl,
    productionSummaryPath: normalizeString(value.productionSummaryPath, fallback.productionSummaryPath),
    sponsorPipelinePath: normalizeString(value.sponsorPipelinePath, fallback.sponsorPipelinePath),
    fallbackOpeningBalance: normalizeNumber(value.fallbackOpeningBalance, fallback.fallbackOpeningBalance),
  };
}

export const DEFAULT_SETTINGS: DashboardSettings = DEFAULT_DASHBOARD_SETTINGS;

export function getDefaultSettings(): DashboardSettings {
  return cloneSettings(DEFAULT_SETTINGS);
}

export function normalizeSettings(value: unknown): DashboardSettings {
  const input = isRecord(value) ? value : {};
  return {
    revenueSources: normalizeRevenueSources(input.revenueSources, DEFAULT_SETTINGS.revenueSources),
    costClassification: normalizeCostClassification(input.costClassification, DEFAULT_SETTINGS.costClassification),
    healthThresholds: normalizeHealthThresholds(input.healthThresholds, DEFAULT_SETTINGS.healthThresholds),
    scenario: normalizeScenarioSettings(input.scenario, DEFAULT_SETTINGS.scenario),
    refresh: normalizeRefreshConfig(input.refresh, DEFAULT_SETTINGS.refresh),
  };
}

function ensureSettingsDirectory(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function writeSettingsFile(settings: DashboardSettings): void {
  ensureSettingsDirectory();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

function shouldPersistNormalizedSettings(): boolean {
  return process.env.NEXT_PHASE !== 'phase-production-build';
}

export function loadSettings(): DashboardSettings {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      const defaults = getDefaultSettings();
      writeSettingsFile(defaults);
      return defaults;
    }

    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8').trim();
    if (!raw) {
      const defaults = getDefaultSettings();
      writeSettingsFile(defaults);
      return defaults;
    }

    const parsed = JSON.parse(raw);
    const normalized = normalizeSettings(parsed);

    if (shouldPersistNormalizedSettings() && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      writeSettingsFile(normalized);
    }

    return normalized;
  } catch {
    const defaults = getDefaultSettings();
    try {
      writeSettingsFile(defaults);
    } catch {
      // Ignore secondary write failures and return safe defaults.
    }
    return defaults;
  }
}

export function saveSettings(value: unknown): DashboardSettings {
  const normalized = normalizeSettings(value);
  writeSettingsFile(normalized);
  return normalized;
}

export const SETTINGS_PATHNAME = SETTINGS_PATH;


