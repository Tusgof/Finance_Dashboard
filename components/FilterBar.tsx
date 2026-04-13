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
    { label: 'All Months', value: 'all' },
    { label: 'Actual Only', value: 'actual' },
    { label: 'Committed Only', value: 'committed' },
    { label: 'Forecast Only', value: 'forecast' },
    ...monthFilters,
  ];

  return (
    <div className="filters-bar">
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
  );
}
