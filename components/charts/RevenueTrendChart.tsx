'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Chart, type ChartDataset, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { fmt } from '@/lib/dataUtils';

const COLORS = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#0891b2',
  '#7c3aed',
  '#64748b',
  '#0f766e',
];

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(`${month}-01`));
}

export default function RevenueTrendChart() {
  const { filteredData } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const inflows = useMemo(
    () => filteredData.filter(row => row.type === 'Inflow' && row.status !== 'Cancelled'),
    [filteredData]
  );

  const months = useMemo(
    () => Array.from(new Set(inflows.map(row => row.workMonth || row.month).filter(Boolean))).sort(),
    [inflows]
  );

  const sponsors = useMemo(
    () => Array.from(new Set(inflows.map(row => row.sponsor || row.subCategory || 'Other'))).sort(),
    [inflows]
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const datasets: ChartDataset<'bar'>[] = sponsors.map((sponsor, index) => ({
      label: sponsor,
      data: months.map(month =>
        inflows
          .filter(row => (row.workMonth || row.month) === month && (row.sponsor || row.subCategory || 'Other') === sponsor)
          .reduce((sum, row) => sum + row.amount, 0)
      ),
      backgroundColor: COLORS[index % COLORS.length],
      borderRadius: 8,
      stack: 'revenue',
    }));

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: months.map(monthLabel),
        datasets,
      },
      options: {
        ...chartDefaults,
        plugins: {
          ...chartDefaults.plugins,
          tooltip: {
            ...((chartDefaults.plugins as Record<string, unknown>)?.tooltip as object),
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ฿${fmt(Number((ctx.parsed as { y?: number }).y ?? 0))}`,
            },
          },
        },
        scales: {
          ...(chartDefaults.scales as Record<string, unknown>),
          x: { ...((chartDefaults.scales as Record<string, unknown>)?.x as object), stacked: true },
          y: {
            ...((chartDefaults.scales as Record<string, unknown>)?.y as object),
            stacked: true,
            ticks: {
              color: '#667085',
              font: { family: 'Inter', size: 11 },
              callback: value => `฿${Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}K` : value}`,
            },
          },
        },
      } as ChartOptions,
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [inflows, months, sponsors]);

  return (
    <div className="chart-card full-width">
      <div className="chart-header">
        <div>
          <div className="chart-title">Monthly Revenue Trend</div>
          <div className="chart-subtitle">Stacked by sponsor/source</div>
        </div>
      </div>
      <div className="chart-wrapper tall">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
