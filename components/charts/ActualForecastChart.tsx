'use client';

import { useEffect, useRef } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';

const MONTHS = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];
const LABELS = ['Jan','Feb','Mar','Apr','May','Jun'];

export default function ActualForecastChart() {
  const { rawData } = useDashboard(); // uses rawData (not filteredData) — shows all months
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const actual = MONTHS.map(m => rawData.filter(d => d.month === m && d.status === 'Actual' && d.type === 'Outflow').reduce((s, d) => s + d.amount, 0));
    const forecast = MONTHS.map(m => rawData.filter(d => d.month === m && d.status === 'Forecast' && d.type === 'Outflow').reduce((s, d) => s + d.amount, 0));

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: LABELS,
        datasets: [
          { label: 'Actual', data: actual, backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 6, barPercentage: 0.4, categoryPercentage: 0.7 },
          { label: 'Forecast', data: forecast, backgroundColor: 'rgba(245,158,11,0.5)', borderRadius: 6, barPercentage: 0.4, categoryPercentage: 0.7, borderWidth: 2, borderColor: 'rgba(245,158,11,0.8)' },
        ],
      },
      options: { ...chartDefaults, plugins: { ...chartDefaults.plugins } } as ChartOptions,
    });

    return () => { chartRef.current?.destroy(); };
  }, [rawData]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Actual vs Forecast</div>
          <div className="chart-subtitle">Actual spending vs forecasted amounts</div>
        </div>
      </div>
      <div className="chart-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
