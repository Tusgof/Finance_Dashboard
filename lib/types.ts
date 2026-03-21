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

export type FilterType =
  | 'all'
  | 'actual'
  | 'forecast'
  | '2026-01'
  | '2026-02'
  | '2026-03'
  | '2026-04'
  | '2026-05'
  | '2026-06';

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
