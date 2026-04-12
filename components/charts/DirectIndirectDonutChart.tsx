'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { DEFAULT_DASHBOARD_SETTINGS, fmt, getCostType, loadDashboardSettings } from '@/lib/dataUtils';

export default function DirectIndirectDonutChart() {
  const { filteredData } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [settings, setSettings] = useState(DEFAULT_DASHBOARD_SETTINGS);

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

    const vp = filteredData
      .filter(d => d.category === 'ต้นทุนสินค้า' && d.entity === 'Video Production')
      .map(d => ({ ...d, costType: getCostType(d, settings) }));
    const totalDirect = vp.filter(d => d.costType === 'Direct').reduce((s, d) => s + d.amount, 0);
    const totalIndirect = vp.filter(d => d.costType === 'Indirect').reduce((s, d) => s + d.amount, 0);
    const total = totalDirect + totalIndirect;

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Direct (ทางตรง)', 'Indirect (ทางอ้อม)'],
        datasets: [{
          data: [totalDirect, totalIndirect],
          backgroundColor: ['rgba(37,99,235,0.85)', 'rgba(217,119,6,0.78)'],
          borderWidth: 0,
          hoverOffset: 10,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#667085', font: { family: 'Inter', size: 12, weight: 'bold' }, padding: 20, usePointStyle: true } },
          tooltip: {
            ...(chartDefaults.plugins as Record<string, unknown>)?.tooltip as object,
            callbacks: {
              label: (ctx) => {
                const pct = total > 0 ? ((ctx.raw as number / total) * 100).toFixed(1) : '0';
                return ` ${ctx.label}: ฿${fmt(ctx.raw as number)} (${pct}%)`;
              },
            },
          },
        },
      } as ChartOptions,
    });

    return () => { chartRef.current?.destroy(); };
  }, [filteredData, settings]);

  return (
    <div className="chart-card" style={{ borderColor: 'var(--border)' }}>
      <div className="chart-header">
        <div>
          <div className="chart-title">Cost Type Ratio</div>
          <div className="chart-subtitle">Overall Direct vs Indirect split</div>
        </div>
      </div>
      <div className="chart-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
