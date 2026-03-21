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
        color: '#344054',
        font: { family: 'Inter', size: 12, weight: 'bold' },
        padding: 18,
        usePointStyle: true,
        pointStyleWidth: 9,
      },
    },
    tooltip: {
      backgroundColor: '#ffffff',
      titleColor: '#101828',
      bodyColor: '#344054',
      borderColor: '#cfd8e3',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 10,
      titleFont: { family: 'Inter', weight: 'bold', size: 13 },
      bodyFont: { family: 'Inter', size: 12 },
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
      ticks: { color: '#344054', font: { family: 'Inter', size: 11, weight: 'normal' } },
      grid: { color: 'rgba(15,23,42,0.08)' },
      border: { color: 'rgba(15,23,42,0.08)' },
    },
    y: {
      ticks: {
        color: '#344054',
        font: { family: 'Inter', size: 11, weight: 'normal' },
        callback: (v) => '฿' + (Number(v) >= 1000 ? (Number(v) / 1000).toFixed(0) + 'K' : v),
      },
      grid: { color: 'rgba(15,23,42,0.08)' },
      border: { color: 'rgba(15,23,42,0.08)' },
    },
  },
};
