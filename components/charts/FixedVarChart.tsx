'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { DEFAULT_DASHBOARD_SETTINGS, classifyCost, fmt, getAvailableMonths, loadDashboardSettings } from '@/lib/dataUtils';

export default function FixedVarChart() {
  const { filteredData } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [settings, setSettings] = useState(DEFAULT_DASHBOARD_SETTINGS);

  const months = useMemo(() => getAvailableMonths(filteredData), [filteredData]);
  const labels = useMemo(
    () => months.map((month) => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(`${month}-01`))),
    [months]
  );

  useEffect(() => {
    let active = true;
    void loadDashboardSettings().then(next => {
      if (active) setSettings(next);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const data = filteredData.filter((d) => d.type === 'Outflow');
    const fixed = months.map((month) => data.filter((d) => d.month === month && classifyCost(d.desc, settings) === 'fixed').reduce((s, d) => s + d.amount, 0));
    const production = months.map((month) => data.filter((d) => d.month === month && classifyCost(d.desc, settings) === 'production').reduce((s, d) => s + d.amount, 0));
    const onetime = months.map((month) => data.filter((d) => d.month === month && classifyCost(d.desc, settings) === 'onetime').reduce((s, d) => s + d.amount, 0));

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Fixed/Recurring', data: fixed, backgroundColor: 'rgba(100,116,139,0.60)', borderRadius: 8, barPercentage: 0.6 },
          { label: 'Production Variable', data: production, backgroundColor: 'rgba(8,145,178,0.65)', borderRadius: 8, barPercentage: 0.6 },
          { label: 'One-time', data: onetime, backgroundColor: 'rgba(217,119,6,0.62)', borderRadius: 8, barPercentage: 0.6 },
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
        scales: {
          ...(chartDefaults.scales as Record<string, unknown>),
          x: { ...(chartDefaults.scales as Record<string, unknown>)?.x as object, stacked: true },
          y: { ...(chartDefaults.scales as Record<string, unknown>)?.y as object, stacked: true },
        },
      } as ChartOptions,
    });

    return () => { chartRef.current?.destroy(); };
  }, [filteredData, months, labels, settings]);

  return (
    <div className="chart-card" style={{ borderColor: 'var(--border)' }}>
      <div className="chart-header">
        <div>
          <div className="chart-title">Fixed vs Variable Costs</div>
          <div className="chart-subtitle">Monthly cost classification breakdown</div>
        </div>
      </div>
      <div className="chart-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
