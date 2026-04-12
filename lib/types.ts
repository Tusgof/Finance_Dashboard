export interface Transaction {
  date: string;         // "YYYY-MM-DD"
  dueDate?: string;     // "YYYY-MM-DD" from sheet Due Date
  type: 'Inflow' | 'Outflow';
  category: string;     // Thai category string
  desc: string;         // Thai description
  amount: number;       // Always positive
  status: 'Actual' | 'Forecast';
  entity: 'Revenue' | 'Video Production' | 'News Production' | 'Administrative' | 'Finance' | 'Marketing';
  month: string;        // "YYYY-MM"
  balance: number;      // Running balance after this transaction
}

export type FilterType = 'all' | 'actual' | 'forecast' | `${number}-${number}`;

export interface DashboardContextType {
  rawData: Transaction[];
  openingBalance: number;
  currentFilter: FilterType;
  setCurrentFilter: (f: FilterType) => void;
  filteredData: Transaction[];
}

export interface BackupMeta {
  filename: string;         // e.g. "2026-03-21T10-30-00.json"
  timestamp: string;        // ISO string for display
  count: number;            // Number of transactions
  openingBalance: number;
}

export interface DataFile {
  rawData: Transaction[];
  openingBalance: number;
}

export interface RevenueSourceMapping {
  label: string;
  keywords: string[];
}

export interface CostKeywordBucket {
  label: string;
  keywords: string[];
}

export interface CostClassificationSettings {
  fixed: CostKeywordBucket;
  production: CostKeywordBucket;
  onetime: CostKeywordBucket;
  directKeywords: string[];
}

export interface HealthThresholds {
  cashRunwayMonths: {
    healthyMin: number;
    cautionMin: number;
  };
  grossMarginPct: {
    healthyMin: number;
    cautionMin: number;
  };
  revenueHHI: {
    diversifiedMax: number;
    moderateMax: number;
  };
  execToProdRatio: {
    healthyMax: number;
    cautionMax: number;
  };
  breakEvenGapPct: {
    surplusMin: number;
    nearMin: number;
  };
}

export interface NumericRangeSetting {
  default: number;
  min: number;
  max: number;
  step: number;
}

export interface ScenarioSettings {
  revenueTarget: NumericRangeSetting;
  execSalaryAdjustmentPct: NumericRangeSetting;
  productionCostAdjustmentPct: NumericRangeSetting;
  projectionMonths: number;
}

export interface RefreshSourceConfig {
  sheetId: string;
  csvExportUrl: string;
  fallbackOpeningBalance: number;
}

export interface DashboardSettings {
  revenueSources: RevenueSourceMapping[];
  costClassification: CostClassificationSettings;
  healthThresholds: HealthThresholds;
  scenario: ScenarioSettings;
  refresh: RefreshSourceConfig;
}
