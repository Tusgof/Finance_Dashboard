'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { getAvailableMonths } from '@/lib/dataUtils';

export default function ActualForecastChart() {
  const { rawData } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const months = useMemo(() => getAvailableMonths(rawData), [rawData]);
  const labels = useMemo(
    () => months.map((month) => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(`${month}-01`))),
    [months]
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const actual = months.map((month) => rawData.filter((d) => d.month === month && d.status === 'Actual' && d.type === 'Outflow').reduce((s, d) => s + d.amount, 0));
    const forecast = months.map((month) => rawData.filter((d) => d.month === month && d.status === 'Forecast' && d.type === 'Outflow').reduce((s, d) => s + d.amount, 0));

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Actual', data: actual, backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 6, barPercentage: 0.4, categoryPercentage: 0.7 },
          { label: 'Forecast', data: forecast, backgroundColor: 'rgba(245,158,11,0.5)', borderRadius: 6, barPercentage: 0.4, categoryPercentage: 0.7, borderWidth: 2, borderColor: 'rgba(245,158,11,0.8)' },
        ],
      },
      options: { ...chartDefaults, plugins: { ...chartDefaults.plugins } } as ChartOptions,
    });

    return () => { chartRef.current?.destroy(); };
  }, [rawData, months, labels]);

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
