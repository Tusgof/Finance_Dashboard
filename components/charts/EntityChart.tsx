'use client';

import { useEffect, useRef } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { fmt } from '@/lib/dataUtils';

const COLORS = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

export default function EntityChart() {
  const { filteredData } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const data = filteredData.filter(d => d.type === 'Outflow' && d.entity);
    const entities: Record<string, number> = {};
    data.forEach(d => { entities[d.entity] = (entities[d.entity] || 0) + d.amount; });
    const sorted = Object.entries(entities).sort((a, b) => b[1] - a[1]);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: sorted.map(s => s[0]),
        datasets: [{ data: sorted.map(s => s[1]), backgroundColor: COLORS.map(c => c + 'cc'), borderWidth: 2, borderColor: '#ffffff', hoverOffset: 8 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: { position: 'right', labels: { color: '#667085', font: { family: 'Inter', size: 11 }, padding: 8, usePointStyle: true } },
          tooltip: {
            ...(chartDefaults.plugins as Record<string, unknown>)?.tooltip as object,
            callbacks: {
              label: (ctx) => {
                const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const pct = ((ctx.raw as number / total) * 100).toFixed(1);
                return ` ${ctx.label}: ฿${fmt(ctx.raw as number)} (${pct}%)`;
              },
            },
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
          <div className="chart-title">Entity Spending Distribution</div>
          <div className="chart-subtitle">Spend by department/entity</div>
        </div>
      </div>
      <div className="chart-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
