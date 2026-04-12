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

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');
const SHEET_ID = '1_3sPKPWT04HTdgFhDuYC0YyakXzKCi0D33YZQsqOnK8';

function buildCsvExportUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
}

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
  const cleaned = value
    .map(item => normalizeString(item))
    .filter(Boolean);
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
      fixed: normalizeBucket(fallback.fixed, fallback.fixed),
      production: normalizeBucket(fallback.production, fallback.production),
      onetime: normalizeBucket(fallback.onetime, fallback.onetime),
      directKeywords: [...fallback.directKeywords],
    };
  }

  return {
    fixed: normalizeBucket(value.fixed, fallback.fixed),
    production: normalizeBucket(value.production, fallback.production),
    onetime: normalizeBucket(value.onetime, fallback.onetime),
    directKeywords: normalizeStringArray(value.directKeywords, fallback.directKeywords),
  };
}

function normalizeHealthThresholds(
  value: unknown,
  fallback: HealthThresholds
): HealthThresholds {
  if (!isRecord(value)) {
    return {
      cashRunwayMonths: { ...fallback.cashRunwayMonths },
      grossMarginPct: { ...fallback.grossMarginPct },
      revenueHHI: { ...fallback.revenueHHI },
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

function normalizeScenarioSettings(
  value: unknown,
  fallback: ScenarioSettings
): ScenarioSettings {
  if (!isRecord(value)) {
    return {
      revenueTarget: { ...fallback.revenueTarget },
      execSalaryAdjustmentPct: { ...fallback.execSalaryAdjustmentPct },
      productionCostAdjustmentPct: { ...fallback.productionCostAdjustmentPct },
      projectionMonths: fallback.projectionMonths,
    };
  }

  return {
    revenueTarget: normalizeRange(value.revenueTarget, fallback.revenueTarget),
    execSalaryAdjustmentPct: normalizeRange(value.execSalaryAdjustmentPct, fallback.execSalaryAdjustmentPct),
    productionCostAdjustmentPct: normalizeRange(
      value.productionCostAdjustmentPct,
      fallback.productionCostAdjustmentPct
    ),
    projectionMonths: normalizeNumber(value.projectionMonths, fallback.projectionMonths),
  };
}

function normalizeRefreshConfig(
  value: unknown,
  fallback: RefreshSourceConfig
): RefreshSourceConfig {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  const sheetId = normalizeString(value.sheetId, fallback.sheetId);
  const csvExportUrl = normalizeString(value.csvExportUrl, buildCsvExportUrl(sheetId));

  return {
    sheetId,
    csvExportUrl,
    fallbackOpeningBalance: normalizeNumber(value.fallbackOpeningBalance, fallback.fallbackOpeningBalance),
  };
}

export const DEFAULT_SETTINGS: DashboardSettings = {
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
      keywords: ['ค่าจ้าง', 'โบนัส', 'พากย์เสียง', 'เขียนบท', 'ทำฟุตเทจ', 'ตัดต่อ', 'กราฟิกข่าว', 'จัดหาข่าว', 'ดูแลลูกค้า', 'ดูแลคอมมูนิตี้'],
    },
    onetime: {
      label: 'One-time',
      keywords: ['อุปกรณ์', 'ไมค์', 'จอมอนิเตอร์', 'ฟอนต์', 'Freepik', 'Vecteezy', 'ตัวจ้างงาน', 'ภาษี'],
    },
    directKeywords: ['พากย์เสียง', 'เขียนบท', 'ทำฟุตเทจ', 'ตัดต่อ', 'Production', 'ค่าจ้าง', 'ค่าจ้างจัดทำของ', 'ค่าอุปกรณ์'],
  },
  healthThresholds: {
    cashRunwayMonths: {
      healthyMin: 6,
      cautionMin: 3,
    },
    grossMarginPct: {
      healthyMin: 30,
      cautionMin: 0,
    },
    revenueHHI: {
      diversifiedMax: 2500,
      moderateMax: 5000,
    },
    execToProdRatio: {
      healthyMax: 0.5,
      cautionMax: 1.5,
    },
    breakEvenGapPct: {
      surplusMin: 0,
      nearMin: -20,
    },
  },
  scenario: {
    revenueTarget: {
      default: 34000,
      min: 0,
      max: 200000,
      step: 1000,
    },
    execSalaryAdjustmentPct: {
      default: 0,
      min: -50,
      max: 0,
      step: 5,
    },
    productionCostAdjustmentPct: {
      default: 0,
      min: -30,
      max: 30,
      step: 5,
    },
    projectionMonths: 6,
  },
  refresh: {
    sheetId: SHEET_ID,
    csvExportUrl: buildCsvExportUrl(SHEET_ID),
    fallbackOpeningBalance: 124331.84,
  },
};

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

    return normalizeSettings(JSON.parse(raw));
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
