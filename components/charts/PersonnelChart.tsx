'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { fmt, getAvailableMonths } from '@/lib/dataUtils';

export default function PersonnelChart() {
  const { filteredData } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const months = useMemo(() => getAvailableMonths(filteredData), [filteredData]);
  const labels = useMemo(
    () => months.map((month) => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(`${month}-01`))),
    [months]
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const data = filteredData.filter((d) => d.type === 'Outflow');
    const exec = months.map((month) => data.filter((d) => d.month === month && /เงินเดือน.*(CEO|COO|CFO|CLO|CDO|CMO|CHRO|CCO|CTO|กรรมการ)/.test(d.desc)).reduce((s, d) => s + d.amount, 0));
    const freelancer = months.map((month) => data.filter((d) => d.month === month && /ค่าจ้าง/.test(d.desc) && !/กรรมการ/.test(d.desc)).reduce((s, d) => s + d.amount, 0));
    const bonuses = months.map((month) => data.filter((d) => d.month === month && /โบนัส/.test(d.desc)).reduce((s, d) => s + d.amount, 0));

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Executive Salaries', data: exec, backgroundColor: 'rgba(124,58,237,0.68)', borderRadius: 8, barPercentage: 0.5, categoryPercentage: 0.7 },
          { label: 'Freelancer Costs', data: freelancer, backgroundColor: 'rgba(8,145,178,0.68)', borderRadius: 8, barPercentage: 0.5, categoryPercentage: 0.7 },
          { label: 'Bonuses', data: bonuses, backgroundColor: 'rgba(217,119,6,0.68)', borderRadius: 8, barPercentage: 0.5, categoryPercentage: 0.7 },
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
  }, [filteredData, months, labels]);

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
