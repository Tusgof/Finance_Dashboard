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
        color: '#667085',
        font: { family: 'Inter', size: 11 },
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 8,
      },
    },
    tooltip: {
      backgroundColor: '#ffffff',
      titleColor: '#101828',
      bodyColor: '#475467',
      borderColor: '#d9e1ec',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 10,
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
      ticks: { color: '#667085', font: { family: 'Inter', size: 11 } },
      grid: { color: 'rgba(15,23,42,0.06)' },
      border: { color: 'transparent' },
    },
    y: {
      ticks: {
        color: '#667085',
        font: { family: 'Inter', size: 11 },
        callback: (v) => '฿' + (Number(v) >= 1000 ? (Number(v) / 1000).toFixed(0) + 'K' : v),
      },
      grid: { color: 'rgba(15,23,42,0.06)' },
      border: { color: 'transparent' },
    },
  },
};
