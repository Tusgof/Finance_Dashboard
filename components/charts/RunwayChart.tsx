'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Chart, type ChartOptions, type ScriptableContext, type ScriptableLineSegmentContext } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';

function monthToDate(month: string): Date {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, (m || 1) - 1, 1);
}

function dateToMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function addMonths(month: string, count: number): string {
  const d = monthToDate(month);
  d.setMonth(d.getMonth() + count);
  return dateToMonth(d);
}

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(monthToDate(month));
}

export default function RunwayChart() {
  const { rawData } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const series = useMemo(() => {
    const monthKeys = Array.from(new Set(rawData.map(d => d.month))).sort();
    const balancesByMonth = monthKeys.map(m => {
      const md = rawData.filter(d => d.month === m);
      return md.length > 0 ? md[md.length - 1].balance : null;
    });

    const actualMonthCount = balancesByMonth.filter(v => v !== null).length;
    const actualDeltas: number[] = [];
    balancesByMonth.forEach((val, idx) => {
      const prev = idx > 0 ? balancesByMonth[idx - 1] : null;
      if (val !== null && prev !== null) actualDeltas.push(val - prev);
    });

    const avgDelta = actualDeltas.length > 0
      ? actualDeltas.slice(-3).reduce((s, v) => s + v, 0) / actualDeltas.slice(-3).length
      : 0;

    const lastKnownMonth = monthKeys[monthKeys.length - 1];
    const futureMonths: string[] = [];
    const futureBalances: number[] = [];
    let prevBalance = balancesByMonth.filter((v): v is number => v !== null).at(-1) ?? 0;
    const maxProjectionMonths = 24;
    for (let i = 1; i <= maxProjectionMonths; i++) {
      const nextMonth = addMonths(lastKnownMonth, i);
      prevBalance += avgDelta;
      futureMonths.push(nextMonth);
      futureBalances.push(prevBalance);
      if (prevBalance < 0) break;
    }

    return {
      labels: [...monthKeys, ...futureMonths].map(monthLabel),
      balances: [...balancesByMonth, ...futureBalances],
      projectedStartIndex: balancesByMonth.length - 1,
      actualMonthCount,
    };
  }, [rawData]);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const pointColors = series.balances.map((b, idx) => idx <= series.projectedStartIndex ? ((b ?? 0) < 0 ? '#dc2626' : '#2563eb') : '#94a3b8');

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: series.labels,
        datasets: [{
          label: 'Balance',
          data: series.balances,
          borderColor: '#2563eb',
          backgroundColor: (ctx: ScriptableContext<'line'>) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return 'rgba(37,99,235,0.08)';
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(37,99,235,0.12)');
            gradient.addColorStop(0.7, 'rgba(37,99,235,0.06)');
            gradient.addColorStop(1, 'rgba(37,99,235,0.02)');
            return gradient;
          },
          fill: true,
          tension: 0.3,
          borderWidth: 3,
          pointBackgroundColor: pointColors,
          pointRadius: 6,
          pointHoverRadius: 8,
          segment: {
            borderDash: (ctx: ScriptableLineSegmentContext) => {
              return ctx.p1DataIndex > series.projectedStartIndex ? [6, 4] : [];
            },
          },
        }],
      },
      options: {
        ...chartDefaults,
        plugins: {
          ...chartDefaults.plugins,
          legend: { display: false },
          annotation: {
            annotations: {
              zeroLine: {
                type: 'line',
                yMin: 0,
                yMax: 0,
                borderColor: 'rgba(220,38,38,0.55)',
                borderWidth: 2,
                borderDash: [8, 4],
                label: {
                  display: true,
                  content: 'Cash Zero',
                  position: 'start',
                  backgroundColor: 'rgba(220,38,38,0.9)',
                  color: '#fff',
                  font: { size: 11, weight: 'bold', family: 'Inter' },
                  padding: { top: 4, bottom: 4, left: 8, right: 8 },
                  borderRadius: 4,
                },
              },
            },
          },
          tooltip: {
            ...(chartDefaults.plugins as Record<string, unknown>)?.tooltip as object,
            callbacks: {
              label: (ctx) => ` Balance: ฿${Number((ctx.parsed as { y?: number }).y ?? ctx.raw).toFixed(2)}`,
            },
          },
        },
        scales: {
          ...chartDefaults.scales,
          y: {
            ...(chartDefaults.scales as Record<string, unknown>)?.y as object,
            ticks: { color: '#344054', font: { family: 'Inter', size: 11 }, callback: (v) => '฿' + (Number(v) / 1000).toFixed(0) + 'K' },
          },
          x: {
            ...(chartDefaults.scales as Record<string, unknown>)?.x as object,
            ticks: { color: '#344054', font: { family: 'Inter', size: 11 } },
          },
        },
      } as ChartOptions,
    });

    return () => { chartRef.current?.destroy(); };
  }, [series]);

  return (
    <div className="chart-card full-width">
      <div className="chart-header">
        <div>
          <div className="chart-title">Cash Runway Projection</div>
          <div className="chart-subtitle">Historical balance projected until cash turns negative</div>
        </div>
      </div>
      <div className="chart-wrapper" style={{ height: 320 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
