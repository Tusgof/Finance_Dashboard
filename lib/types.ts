export type TransactionType = 'Inflow' | 'Outflow';
export type TransactionStatus = 'Actual' | 'Committed' | 'Forecast' | 'Cancelled';
export type MainCategory = 'Revenue' | 'COGS' | 'OpEx' | 'CapEx';
export type CostBehavior = 'Fixed' | 'Variable';

export interface Transaction {
  date: string;
  dueDate?: string;
  workMonth?: string;
  month: string;
  type: TransactionType;
  status: TransactionStatus;
  category: string;
  mainCategory?: MainCategory;
  subCategory?: string;
  desc: string;
  description?: string;
  amount: number;
  originalForecast?: number;
  person?: string;
  costBehavior?: CostBehavior;
  sponsor?: string;
  note?: string;
  entity?: 'Revenue' | 'Video Production' | 'News Production' | 'Administrative' | 'Finance' | 'Marketing';
  balance: number;
}

export interface ProductionSummaryRow {
  workMonth: string;
  totalContent: number;
  organicContent: number;
  sponsoredContent: number;
  sponsor?: string;
  totalCogs?: number;
  costPerContent?: number;
}

export interface SponsorPipelineDeal {
  sponsor: string;
  dealValue: number;
  status: string;
  probability: number;
  expectedDate?: string;
  weightedValue?: number;
  note?: string;
}

export interface DashboardDataFile {
  rawData: Transaction[];
  openingBalance: number;
  productionSummary: ProductionSummaryRow[];
  sponsorPipeline: SponsorPipelineDeal[];
}

export type DataFile = DashboardDataFile;

export type FilterType = 'all' | 'actual' | 'committed' | 'forecast' | 'cancelled' | `${number}-${number}`;

export interface DashboardContextType {
  rawData: Transaction[];
  openingBalance: number;
  currentFilter: FilterType;
  setCurrentFilter: (f: FilterType) => void;
  filteredData: Transaction[];
  productionSummary: ProductionSummaryRow[];
  sponsorPipeline: SponsorPipelineDeal[];
}

export interface BackupMeta {
  filename: string;
  timestamp: string;
  count: number;
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
  peopleCostKeywords: string[];
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
  revenueDropRatio: {
    warningMax: number;
  };
  headcountCostRatio: {
    healthyMax: number;
    cautionMax: number;
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
  variableCostReductionPct: NumericRangeSetting;
  newDealRevenue: NumericRangeSetting;
  bestCaseRevenueLiftPct: number;
  worstCaseRevenueHaircutPct: number;
  projectionMonths: number;
  breakEvenLookbackMonths: number;
  runwayLookbackMonths: number;
}

export interface RefreshSourceConfig {
  sheetId: string;
  csvExportUrl: string;
  productionSummaryPath: string;
  sponsorPipelinePath: string;
  fallbackOpeningBalance: number;
}

export interface DashboardSettings {
  revenueSources: RevenueSourceMapping[];
  costClassification: CostClassificationSettings;
  healthThresholds: HealthThresholds;
  scenario: ScenarioSettings;
  refresh: RefreshSourceConfig;
}

export interface NormalizedTransaction {
  date: string;
  workMonth: string;
  type: TransactionType;
  status: TransactionStatus;
  mainCategory: MainCategory;
  subCategory: string;
  description: string;
  amount: number;
  originalForecast: number;
  person: string;
  costBehavior: CostBehavior;
  sponsor: string;
  note: string;
  balance: number;
}
