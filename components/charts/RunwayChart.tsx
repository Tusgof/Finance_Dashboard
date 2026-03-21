'use client';

import { useEffect, useRef } from 'react';
import { Chart, type ChartOptions, type ScriptableContext, type ScriptableLineSegmentContext } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';

const MONTHS = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];
const LABELS = ['Jan','Feb','Mar','Apr','May','Jun'];

export default function RunwayChart() {
  const { rawData } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const balances: (number | null)[] = MONTHS.map(m => {
      const md = rawData.filter(d => d.month === m);
      return md.length > 0 ? md[md.length - 1].balance : null;
    });

    const pointColors = balances.map(b => b !== null && b < 0 ? '#ef4444' : '#3b82f6');

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: LABELS,
        datasets: [{
          label: 'Balance',
          data: balances,
          borderColor: '#3b82f6',
          backgroundColor: (ctx: ScriptableContext<'line'>) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return 'rgba(59,130,246,0.1)';
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(34,197,94,0.15)');
            gradient.addColorStop(0.7, 'rgba(59,130,246,0.05)');
            gradient.addColorStop(1, 'rgba(239,68,68,0.15)');
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
              const idx = ctx.p1DataIndex;
              return rawData.some(d => d.month === MONTHS[idx] && d.status === 'Forecast') ? [6, 4] : [];
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
                borderColor: 'rgba(239,68,68,0.7)',
                borderWidth: 2,
                borderDash: [8, 4],
                label: {
                  display: true,
                  content: 'Cash Zero',
                  position: 'start',
                  backgroundColor: 'rgba(239,68,68,0.8)',
                  color: '#fff',
                  font: { size: 11, weight: 'bold', family: 'Inter' },
                  padding: { top: 4, bottom: 4, left: 8, right: 8 },
                  borderRadius: 4,
                },
              },
            },
          },
        },
        scales: {
          ...chartDefaults.scales,
          y: {
            ...(chartDefaults.scales as Record<string, unknown>)?.y as object,
            ticks: { color: '#5f6275', font: { family: 'Inter', size: 11 }, callback: (v) => '฿' + (Number(v)/1000).toFixed(0) + 'K' },
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
          <div className="chart-title">Cash Runway Projection</div>
          <div className="chart-subtitle">Balance forecast with zero-crossing analysis</div>
        </div>
      </div>
      <div className="chart-wrapper" style={{ height: 320 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
