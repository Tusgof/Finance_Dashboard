import {
  Chart,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  DoughnutController,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

// Module-level registration — runs once on first import
Chart.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  DoughnutController,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
  annotationPlugin
);

import { fmt } from './dataUtils';

export const chartDefaults: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#8b8fa3',
        font: { family: 'Inter', size: 11 },
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 8,
      },
    },
    tooltip: {
      backgroundColor: '#21242f',
      titleColor: '#f0f1f5',
      bodyColor: '#8b8fa3',
      borderColor: '#2d3141',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      titleFont: { family: 'Inter', weight: 'bold' },
      bodyFont: { family: 'Inter' },
      callbacks: {
        label: (ctx) => {
          const val = (ctx.parsed as { y?: number }).y ?? ctx.parsed ?? (ctx.raw as number);
          return ` ${ctx.dataset.label || ctx.label}: ฿${fmt(val as number)}`;
        },
      },
    } as NonNullable<NonNullable<ChartOptions['plugins']>['tooltip']>,
  },
  scales: {
    x: {
      ticks: { color: '#5f6275', font: { family: 'Inter', size: 11 } },
      grid: { color: 'rgba(45,49,65,0.5)' },
      border: { color: 'transparent' },
    },
    y: {
      ticks: {
        color: '#5f6275',
        font: { family: 'Inter', size: 11 },
        callback: (v) => '฿' + (Number(v) >= 1000 ? (Number(v) / 1000).toFixed(0) + 'K' : v),
      },
      grid: { color: 'rgba(45,49,65,0.5)' },
      border: { color: 'transparent' },
    },
  },
};
