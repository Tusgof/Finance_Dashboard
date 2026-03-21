'use client';

import { useEffect, useRef } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { chartDefaults } from '@/lib/chartDefaults';
import { fmt } from '@/lib/dataUtils';

const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7'];

export default function RevenueChart() {
  const { filteredData } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const data = filteredData.filter(d => d.type === 'Inflow');
    const sources: Record<string, number> = {};
    data.forEach(d => {
      let src = 'Other';
      if (d.desc.includes('Eightcap')) src = 'Eightcap';
      else if (d.desc.includes('InnovestX')) src = 'InnovestX';
      else if (d.desc.includes('OceanLife')) src = 'OceanLife';
      else if (d.desc.includes('เงินเทอร์โบ')) src = 'เงินเทอร์โบ';
      else if (d.desc.includes('Facebook')) src = 'Facebook Ads';
      else if (d.desc.includes('TikTok')) src = 'TikTok';
      sources[src] = (sources[src] || 0) + d.amount;
    });
    const sorted = Object.entries(sources).sort((a, b) => b[1] - a[1]);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: sorted.map(s => s[0]),
        datasets: [{ label: 'Revenue', data: sorted.map(s => s[1]), backgroundColor: COLORS.slice(0, sorted.length), borderRadius: 10, barPercentage: 0.6 }],
      },
      options: {
        ...chartDefaults,
        indexAxis: 'y',
        plugins: {
          ...chartDefaults.plugins,
          legend: { display: false },
          tooltip: {
            ...(chartDefaults.plugins as Record<string, unknown>)?.tooltip as object,
            callbacks: { label: (ctx) => ` Revenue: ฿${fmt((ctx.parsed as { x: number }).x)}` },
          },
        },
        scales: {
          x: { ...(chartDefaults.scales as Record<string, unknown>)?.x as object, ticks: { color: '#667085', font: { family: 'Inter', size: 11 }, callback: (v: unknown) => '฿' + (Number(v) >= 1000 ? (Number(v) / 1000).toFixed(0) + 'K' : v) } },
          y: { ...(chartDefaults.scales as Record<string, unknown>)?.x as object, grid: { display: false } },
        },
      } as ChartOptions,
    });

    return () => { chartRef.current?.destroy(); };
  }, [filteredData]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Revenue Sources</div>
          <div className="chart-subtitle">Income by source type</div>
        </div>
      </div>
      <div className="chart-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
