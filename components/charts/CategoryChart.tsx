'use client';

import { useEffect, useRef } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { fmt } from '@/lib/dataUtils';

const COLORS = ['#3b82f6','#ef4444','#f59e0b','#a855f7','#06b6d4','#22c55e','#ec4899','#f97316'];

export default function CategoryChart() {
  const { filteredData } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const data = filteredData.filter(d => d.type === 'Outflow');
    const cats: Record<string, number> = {};
    data.forEach(d => { cats[d.category] = (cats[d.category] || 0) + d.amount; });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const total = data.reduce((s, d) => s + d.amount, 0);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: sorted.map(s => s[0]),
        datasets: [{ data: sorted.map(s => s[1]), backgroundColor: COLORS.slice(0, sorted.length), borderWidth: 0, hoverOffset: 8 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'right', labels: { color: '#8b8fa3', font: { family: 'Inter', size: 11 }, padding: 10, usePointStyle: true, pointStyleWidth: 8 } },
          tooltip: {
            ...(chartDefaults.plugins as Record<string, unknown>)?.tooltip as object,
            callbacks: { label: (ctx) => ` ${ctx.label}: ฿${fmt(ctx.raw as number)} (${total > 0 ? ((ctx.raw as number / total) * 100).toFixed(1) : 0}%)` },
          },
        },
      } as ChartOptions,
    });

    return () => { chartRef.current?.destroy(); };
  }, [filteredData]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Expense Breakdown by Category</div>
          <div className="chart-subtitle">Percentage of total spending</div>
        </div>
      </div>
      <div className="chart-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
