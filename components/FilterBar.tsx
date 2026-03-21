'use client';

import { useDashboard } from './DashboardContext';
import type { FilterType } from '@/lib/types';

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All Months', value: 'all' },
  { label: 'Jan 2026', value: '2026-01' },
  { label: 'Feb 2026', value: '2026-02' },
  { label: 'Mar 2026', value: '2026-03' },
  { label: 'Apr 2026', value: '2026-04' },
  { label: 'May 2026', value: '2026-05' },
  { label: 'Jun 2026', value: '2026-06' },
  { label: 'Actual Only', value: 'actual' },
  { label: 'Forecast Only', value: 'forecast' },
];

export default function FilterBar() {
  const { currentFilter, setCurrentFilter } = useDashboard();

  return (
    <div className="filters-bar">
      {FILTERS.map(f => (
        <button
          key={f.value}
          className={`filter-btn${currentFilter === f.value ? ' active' : ''}`}
          onClick={() => setCurrentFilter(f.value)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
