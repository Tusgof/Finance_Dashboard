'use client';

import { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { formatMonthLabel, getAvailableMonths } from '@/lib/dataUtils';
import type { FilterType } from '@/lib/types';

export default function FilterBar() {
  const { rawData, currentFilter, setCurrentFilter } = useDashboard();

  const monthFilters = useMemo(
    () =>
      getAvailableMonths(rawData).map((month) => ({
        label: formatMonthLabel(month),
        value: month as FilterType,
      })),
    [rawData]
  );

  const filters: { label: string; value: FilterType }[] = [
    { label: 'All Ledger Rows', value: 'all' },
    { label: 'Actual Ledger Rows', value: 'actual' },
    { label: 'Committed Ledger Rows', value: 'committed' },
    { label: 'Forecast Ledger Rows', value: 'forecast' },
    ...monthFilters,
  ];

  return (
    <div className="filters-bar">
      <div className="filters-bar-buttons">
        {filters.map((filter) => (
          <button
            key={filter.value}
            className={`filter-btn${currentFilter === filter.value ? ' active' : ''}`}
            onClick={() => setCurrentFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="filters-bar-note">
        Ledger scope only. Cash, Revenue, P&amp;L, and Scenario use the full snapshot.
      </div>
    </div>
  );
}
