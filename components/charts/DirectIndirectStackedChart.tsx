'use client';

import { useEffect, useRef } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { getCostType } from '@/lib/dataUtils';

const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
const LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export default function DirectIndirectStackedChart() {
  const { filteredData, currentFilter } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const filteredVP = filteredData
      .filter(d => d.category === 'ต้นทุนสินค้า' && d.entity === 'Video Production')
      .map(d => ({ ...d, costType: getCostType(d) }));
    const activeMonths = new Set(filteredVP.map(d => d.month));

    const showAll = currentFilter === 'all' || currentFilter === 'actual' || currentFilter === 'forecast';
    const direct = MONTHS.map(m =>
      showAll || activeMonths.has(m)
        ? filteredVP.filter(d => d.month === m && d.costType === 'Direct').reduce((s, d) => s + d.amount, 0) : 0
    );
    const indirect = MONTHS.map(m =>
      showAll || activeMonths.has(m)
        ? filteredVP.filter(d => d.month === m && d.costType === 'Indirect').reduce((s, d) => s + d.amount, 0) : 0
    );

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: LABELS,
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
  }, [filteredData, currentFilter]);

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
