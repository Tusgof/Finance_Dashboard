'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { fmt, getAvailableMonths } from '@/lib/dataUtils';

export default function CashFlowChart() {
  const { filteredData, rawData } = useDashboard();
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

    const inflows = months.map((month) => filteredData.filter((d) => d.month === month && d.type === 'Inflow').reduce((s, d) => s + d.amount, 0));
    const outflows = months.map((month) => filteredData.filter((d) => d.month === month && d.type === 'Outflow').reduce((s, d) => s + d.amount, 0));
    const balances = months.map((month) => {
      const monthData = rawData.filter((d) => d.month === month);
      return monthData.length > 0 ? monthData[monthData.length - 1].balance : null;
    });

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Income', data: inflows, backgroundColor: 'rgba(22,163,74,0.72)', borderRadius: 10, barPercentage: 0.35, categoryPercentage: 0.7 },
          { label: 'Expenses', data: outflows, backgroundColor: 'rgba(220,38,38,0.72)', borderRadius: 10, barPercentage: 0.35, categoryPercentage: 0.7 },
          { label: 'Balance', data: balances, type: 'line', borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.10)', pointBackgroundColor: '#2563eb', pointRadius: 5, pointHoverRadius: 7, tension: 0.4, fill: true, yAxisID: 'y1', borderWidth: 3 },
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
            ticks: { color: '#667085', font: { family: 'Inter', size: 11 }, callback: (v) => '฿' + (Number(v) / 1000).toFixed(0) + 'K' },
            grid: { drawOnChartArea: false },
            border: { color: 'transparent' },
          },
        },
      } as ChartOptions,
    });

    return () => { chartRef.current?.destroy(); };
  }, [filteredData, rawData, months, labels]);

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
