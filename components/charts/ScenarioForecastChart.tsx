'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Chart, type ChartDataset, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { fmt } from '@/lib/dataUtils';
import { buildMonthlyPnLRows, getCurrentCash, normalizeTransactions } from '@/lib/dashboardMetrics';
import type { DashboardSettings } from '@/lib/types';

interface ScenarioForecastChartProps {
  settings: DashboardSettings;
}

function addMonth(month: string, offset: number): string {
  const [year, rawMonth] = month.split('-').map(Number);
  const date = new Date(year, rawMonth - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function label(month: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(`${month}-01`));
}

export default function ScenarioForecastChart({ settings }: ScenarioForecastChartProps) {
  const { rawData, openingBalance } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const scenarioData = useMemo(() => {
    const normalized = normalizeTransactions(rawData, settings);
    const rows = buildMonthlyPnLRows(normalized, settings);
    const recent = rows.slice(-settings.scenario.breakEvenLookbackMonths);
    const avgOutflow = recent.length > 0 ? recent.reduce((sum, row) => sum + row.cogs + row.opEx + row.capEx, 0) / recent.length : 0;
    const avgRevenue = recent.length > 0 ? recent.reduce((sum, row) => sum + row.revenue, 0) / recent.length : 0;
    const currentCash = getCurrentCash(normalized, openingBalance);
    const startMonth = rows.at(-1)?.month ?? new Date().toISOString().slice(0, 7);
    const months = Array.from({ length: settings.scenario.projectionMonths + 1 }, (_, index) => addMonth(startMonth, index));

    const monthlyNet = {
      best: avgRevenue * (1 + settings.scenario.bestCaseRevenueLiftPct / 100) - avgOutflow,
      base: avgRevenue - avgOutflow,
      worst: avgRevenue * (1 - settings.scenario.worstCaseRevenueHaircutPct / 100) - avgOutflow,
    };

    return {
      months,
      best: months.map((_, index) => currentCash + monthlyNet.best * index),
      base: months.map((_, index) => currentCash + monthlyNet.base * index),
      worst: months.map((_, index) => currentCash + monthlyNet.worst * index),
    };
  }, [rawData, openingBalance, settings]);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const datasets: ChartDataset<'line'>[] = [
      { label: 'Best', data: scenarioData.best, borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.10)', tension: 0.3, borderWidth: 3, pointRadius: 4 },
      { label: 'Base', data: scenarioData.base, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.10)', tension: 0.3, borderWidth: 3, pointRadius: 4 },
      { label: 'Worst', data: scenarioData.worst, borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.08)', tension: 0.3, borderWidth: 3, pointRadius: 4 },
    ];

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: scenarioData.months.map(label),
        datasets,
      },
      options: {
        ...chartDefaults,
        plugins: {
          ...chartDefaults.plugins,
          annotation: {
            annotations: {
              zeroLine: { type: 'line', yMin: 0, yMax: 0, borderColor: 'rgba(220,38,38,0.65)', borderWidth: 2, borderDash: [6, 6] },
            },
          },
          tooltip: {
            ...((chartDefaults.plugins as Record<string, unknown>)?.tooltip as object),
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ฿${fmt(Number((ctx.parsed as { y?: number }).y ?? 0))}`,
            },
          },
        },
        scales: {
          ...chartDefaults.scales,
          y: {
            ...((chartDefaults.scales as Record<string, unknown>)?.y as object),
            ticks: {
              color: '#667085',
              font: { family: 'Inter', size: 11 },
              callback: value => `฿${Number(value) >= 1000 || Number(value) <= -1000 ? `${(Number(value) / 1000).toFixed(0)}K` : value}`,
            },
          },
        },
      } as ChartOptions,
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [scenarioData]);

  return (
    <div className="chart-card full-width">
      <div className="chart-header">
        <div>
          <div className="chart-title">Best / Base / Worst Cash Forecast</div>
          <div className="chart-subtitle">Projected cash balance from recent run-rate assumptions</div>
        </div>
      </div>
      <div className="chart-wrapper tall">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
