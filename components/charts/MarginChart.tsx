'use client';

import { useEffect, useRef } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';

const MONTHS = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];
const LABELS = ['Jan','Feb','Mar','Apr','May','Jun'];

export default function MarginChart() {
  const { rawData } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const grossMargins: (number | null)[] = [];
    const opMargins: (number | null)[] = [];

    MONTHS.forEach(m => {
      const mData = rawData.filter(d => d.month === m);
      const revenue = mData.filter(d => d.type === 'Inflow').reduce((s, d) => s + d.amount, 0);
      const cogs = mData.filter(d => d.type === 'Outflow' && d.category === 'ต้นทุนสินค้า').reduce((s, d) => s + d.amount, 0);
      const opex = mData.filter(d => d.type === 'Outflow' && d.category === 'ค่าใช้จ่ายดำเนินงาน').reduce((s, d) => s + d.amount, 0);

      if (revenue > 0) {
        grossMargins.push(Math.max(-200, Math.min(100, (revenue - cogs) / revenue * 100)));
        opMargins.push(Math.max(-200, Math.min(100, (revenue - cogs - opex) / revenue * 100)));
      } else {
        grossMargins.push(mData.length > 0 ? -200 : null);
        opMargins.push(mData.length > 0 ? -200 : null);
      }
    });

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: LABELS,
        datasets: [
          { label: 'Gross Margin %', data: grossMargins, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: false, tension: 0.3, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#22c55e' },
          { label: 'Operating Margin %', data: opMargins, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: false, tension: 0.3, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#3b82f6' },
        ],
      },
      options: {
        ...chartDefaults,
        plugins: {
          ...chartDefaults.plugins,
          annotation: {
            annotations: {
              zeroLine: { type: 'line', yMin: 0, yMax: 0, borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderDash: [4, 4] },
            },
          },
          tooltip: {
            ...(chartDefaults.plugins as Record<string, unknown>)?.tooltip as object,
            callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.parsed as { y: number }).y.toFixed(1)}%` },
          },
        },
        scales: {
          ...chartDefaults.scales,
          y: {
            ...(chartDefaults.scales as Record<string, unknown>)?.y as object,
            min: -200, max: 100,
            ticks: { color: '#5f6275', font: { family: 'Inter', size: 11 }, callback: (v) => v + '%' },
          },
        },
      } as ChartOptions,
    });

    return () => { chartRef.current?.destroy(); };
  }, [rawData]);

  return (
    <div className="chart-card full-width" style={{ borderColor: 'var(--border)' }}>
      <div className="chart-header">
        <div>
          <div className="chart-title">Gross &amp; Operating Margin Trend</div>
          <div className="chart-subtitle">Monthly margin % (capped at -200% to 100%)</div>
        </div>
      </div>
      <div className="chart-wrapper" style={{ height: 280 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
