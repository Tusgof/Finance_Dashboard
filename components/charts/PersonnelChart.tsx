'use client';

import { useEffect, useRef } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { fmt } from '@/lib/dataUtils';

const MONTHS = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];
const LABELS = ['Jan','Feb','Mar','Apr','May','Jun'];

export default function PersonnelChart() {
  const { filteredData } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const data = filteredData.filter(d => d.type === 'Outflow');
    const exec = MONTHS.map(m => data.filter(d => d.month === m && /เงินเดือน.*(CEO|COO|CFO|CLO|CDO|CMO|CHRO|CCO|CTO|กรรมการ)/.test(d.desc)).reduce((s, d) => s + d.amount, 0));
    const freelancer = MONTHS.map(m => data.filter(d => d.month === m && /ค่าจ้าง/.test(d.desc) && !/กรรมการ/.test(d.desc)).reduce((s, d) => s + d.amount, 0));
    const bonuses = MONTHS.map(m => data.filter(d => d.month === m && /โบนัส/.test(d.desc)).reduce((s, d) => s + d.amount, 0));

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: LABELS,
        datasets: [
          { label: 'Executive Salaries', data: exec, backgroundColor: 'rgba(168,85,247,0.7)', borderRadius: 4, barPercentage: 0.5, categoryPercentage: 0.7 },
          { label: 'Freelancer Costs', data: freelancer, backgroundColor: 'rgba(6,182,212,0.7)', borderRadius: 4, barPercentage: 0.5, categoryPercentage: 0.7 },
          { label: 'Bonuses', data: bonuses, backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 4, barPercentage: 0.5, categoryPercentage: 0.7 },
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
      } as ChartOptions,
    });

    return () => { chartRef.current?.destroy(); };
  }, [filteredData]);

  return (
    <div className="chart-card" style={{ borderColor: 'var(--border)' }}>
      <div className="chart-header">
        <div>
          <div className="chart-title">Personnel Cost Structure</div>
          <div className="chart-subtitle">Executive vs Freelancer spending</div>
        </div>
      </div>
      <div className="chart-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
