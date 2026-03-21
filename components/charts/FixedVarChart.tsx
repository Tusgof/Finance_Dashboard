'use client';

import { useEffect, useRef } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { classifyCost } from '@/lib/dataUtils';
import { fmt } from '@/lib/dataUtils';

const MONTHS = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];
const LABELS = ['Jan','Feb','Mar','Apr','May','Jun'];

export default function FixedVarChart() {
  const { filteredData } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const data = filteredData.filter(d => d.type === 'Outflow');
    const fixed = MONTHS.map(m => data.filter(d => d.month === m && classifyCost(d.desc) === 'fixed').reduce((s, d) => s + d.amount, 0));
    const production = MONTHS.map(m => data.filter(d => d.month === m && classifyCost(d.desc) === 'production').reduce((s, d) => s + d.amount, 0));
    const onetime = MONTHS.map(m => data.filter(d => d.month === m && classifyCost(d.desc) === 'onetime').reduce((s, d) => s + d.amount, 0));

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: LABELS,
        datasets: [
          { label: 'Fixed/Recurring', data: fixed, backgroundColor: 'rgba(100,116,139,0.7)', borderRadius: 4, barPercentage: 0.6 },
          { label: 'Production Variable', data: production, backgroundColor: 'rgba(6,182,212,0.7)', borderRadius: 4, barPercentage: 0.6 },
          { label: 'One-time', data: onetime, backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 4, barPercentage: 0.6 },
        ],
      },
      options: {
        ...chartDefaults,
        plugins: {
          ...chartDefaults.plugins,
          tooltip: {
            ...(chartDefaults.plugins as Record<string, unknown>)?.tooltip as object,
            callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ฿${fmt((ctx.parsed as { y: number }).y)}` },
          },
        },
        scales: {
          ...(chartDefaults.scales as Record<string, unknown>),
          x: { ...(chartDefaults.scales as Record<string, unknown>)?.x as object, stacked: true },
          y: { ...(chartDefaults.scales as Record<string, unknown>)?.y as object, stacked: true },
        },
      } as ChartOptions,
    });

    return () => { chartRef.current?.destroy(); };
  }, [filteredData]);

  return (
    <div className="chart-card" style={{ borderColor: 'var(--border)' }}>
      <div className="chart-header">
        <div>
          <div className="chart-title">Fixed vs Variable Costs</div>
          <div className="chart-subtitle">Monthly cost classification breakdown</div>
        </div>
      </div>
      <div className="chart-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
