'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { DEFAULT_DASHBOARD_SETTINGS, getAvailableMonths, getCostType, loadDashboardSettings } from '@/lib/dataUtils';

export default function DirectIndirectStackedChart() {
  const { filteredData, currentFilter } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [settings, setSettings] = useState(DEFAULT_DASHBOARD_SETTINGS);

  const filteredVideoProduction = useMemo(
    () => filteredData
      .filter((d) => d.category === 'ต้นทุนสินค้า' && d.entity === 'Video Production')
      .map((d) => ({ ...d, costType: getCostType(d, settings) })),
    [filteredData, settings]
  );

  const months = useMemo(() => getAvailableMonths(filteredVideoProduction), [filteredVideoProduction]);
  const labels = useMemo(
    () => months.map((month) => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(`${month}-01`))),
    [months]
  );

  useEffect(() => {
    let active = true;
    void loadDashboardSettings().then(next => {
      if (active) setSettings(next);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const activeMonths = new Set(filteredVideoProduction.map((d) => d.month));
    const showAll = currentFilter === 'all' || currentFilter === 'actual' || currentFilter === 'forecast';

    const direct = months.map((month) =>
      showAll || activeMonths.has(month)
        ? filteredVideoProduction.filter((d) => d.month === month && d.costType === 'Direct').reduce((s, d) => s + d.amount, 0)
        : 0
    );
    const indirect = months.map((month) =>
      showAll || activeMonths.has(month)
        ? filteredVideoProduction.filter((d) => d.month === month && d.costType === 'Indirect').reduce((s, d) => s + d.amount, 0)
        : 0
    );

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Direct', data: direct, backgroundColor: 'rgba(37,99,235,0.75)', borderRadius: 8, barPercentage: 0.5 },
          { label: 'Indirect', data: indirect, backgroundColor: 'rgba(217,119,6,0.70)', borderRadius: 8, barPercentage: 0.5 },
        ],
      },
      options: {
        ...chartDefaults,
        scales: {
          ...(chartDefaults.scales as Record<string, unknown>),
          x: { ...(chartDefaults.scales as Record<string, unknown>)?.x as object, stacked: true },
          y: { ...(chartDefaults.scales as Record<string, unknown>)?.y as object, stacked: true },
        },
      } as ChartOptions,
    });

    return () => { chartRef.current?.destroy(); };
  }, [filteredVideoProduction, currentFilter, months, labels]);

  return (
    <div className="chart-card" style={{ borderColor: 'var(--border)' }}>
      <div className="chart-header">
        <div>
          <div className="chart-title">Direct vs Indirect by Month</div>
          <div className="chart-subtitle">Stacked monthly comparison</div>
        </div>
      </div>
      <div className="chart-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
