'use client';

import { useEffect, useRef } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { fmt } from '@/lib/dataUtils';

const MONTHS = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];
const LABELS = ['Jan','Feb','Mar','Apr','May','Jun'];

export default function CashFlowChart() {
  const { filteredData, rawData } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const inflows = MONTHS.map(m => filteredData.filter(d => d.month === m && d.type === 'Inflow').reduce((s, d) => s + d.amount, 0));
    const outflows = MONTHS.map(m => filteredData.filter(d => d.month === m && d.type === 'Outflow').reduce((s, d) => s + d.amount, 0));
    const balances = MONTHS.map(m => {
      const md = rawData.filter(d => d.month === m);
      return md.length > 0 ? md[md.length - 1].balance : null;
    });

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: LABELS,
        datasets: [
          { label: 'Income', data: inflows, backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 6, barPercentage: 0.35, categoryPercentage: 0.7 },
          { label: 'Expenses', data: outflows, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6, barPercentage: 0.35, categoryPercentage: 0.7 },
          { label: 'Balance', data: balances, type: 'line', borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', pointBackgroundColor: '#3b82f6', pointRadius: 5, pointHoverRadius: 7, tension: 0.4, fill: true, yAxisID: 'y1', borderWidth: 3 },
        ],
      },
      options: {
        ...chartDefaults,
        plugins: {
          ...chartDefaults.plugins,
          tooltip: {
            ...(chartDefaults.plugins as Record<string, unknown>)?.tooltip as object,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ฿${fmt(Number((ctx.parsed as { y?: number }).y ?? ctx.raw))}`,
            },
          },
        },
        scales: {
          ...chartDefaults.scales,
          y1: {
            position: 'right',
            ticks: { color: '#5f6275', font: { family: 'Inter', size: 11 }, callback: (v) => '฿' + (Number(v)/1000).toFixed(0) + 'K' },
            grid: { drawOnChartArea: false },
            border: { color: 'transparent' },
          },
        },
      } as ChartOptions,
    });

    return () => { chartRef.current?.destroy(); };
  }, [filteredData, rawData]);

  return (
    <div className="chart-card full-width">
      <div className="chart-header">
        <div>
          <div className="chart-title">Cash Flow &amp; Running Balance</div>
          <div className="chart-subtitle">Monthly inflow, outflow, and balance trend</div>
        </div>
      </div>
      <div className="chart-wrapper tall">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
