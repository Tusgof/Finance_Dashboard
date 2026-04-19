'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { fmt } from '@/lib/dataUtils';
import { chartDefaults } from '@/lib/chartDefaults';
import { getCurrentCash, normalizeTransactions } from '@/lib/dashboardMetrics';
import type { NormalizedTransaction } from '@/lib/types';

type ProjectionRow = {
  month: string;
  baseNet: number;
  bullNet: number;
  bearNet: number;
  baseBalance: number;
  bullBalance: number;
  bearBalance: number;
};

type CaseKey = 'base' | 'bull' | 'bear';

type ScenarioCase = {
  key: CaseKey;
  label: string;
  balance: number;
  net: number;
  status: string;
  color: string;
};

const BULL_MONTHLY_NEW_CASH = 30000;
const BULL_CREDIT_TERM_MONTHS = 2;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(month: string, offset: number): string {
  const [year, rawMonth] = month.split('-').map(Number);
  if (!year || !rawMonth) return month;
  return monthKey(new Date(year, rawMonth - 1 + offset, 1));
}

function nextMonth(month: string): string {
  return addMonths(month, 1);
}

function sortMonths(months: Iterable<string>): string[] {
  return Array.from(new Set(months)).filter(Boolean).sort();
}

function isAdRevenue(row: NormalizedTransaction): boolean {
  const text = [row.sponsor, row.subCategory, row.description, row.note].join(' ').toLowerCase();
  return text.includes('ad') || text.includes('ads') || text.includes('facebook') || text.includes('meta') || text.includes('tiktok');
}

function isShiftableForecastCustomerInflow(row: NormalizedTransaction): boolean {
  return row.type === 'Inflow' && row.status === 'Forecast' && row.mainCategory === 'Revenue' && !isAdRevenue(row);
}

function cashMonth(row: NormalizedTransaction): string {
  return /^\d{4}-\d{2}/.test(row.date) ? row.date.slice(0, 7) : row.workMonth;
}

function signedAmount(row: NormalizedTransaction): number {
  return row.type === 'Inflow' ? row.amount : -row.amount;
}

function sumMonthNet(rows: NormalizedTransaction[], month: string): number {
  return rows
    .filter(row => cashMonth(row) === month && row.status !== 'Cancelled')
    .reduce((sum, row) => sum + signedAmount(row), 0);
}

function buildScenarioProjection(data: NormalizedTransaction[], openingBalance: number): ProjectionRow[] {
  const activeRows = data.filter(row => row.status !== 'Cancelled');
  const actualMonths = sortMonths(activeRows.filter(row => row.status === 'Actual').map(cashMonth));
  const latestActualMonth = actualMonths.at(-1) ?? sortMonths(activeRows.map(cashMonth)).at(0) ?? monthKey(new Date());
  const currentCash = getCurrentCash(data, openingBalance);
  const futureRows = activeRows.filter(row => row.status !== 'Actual' && cashMonth(row) >= latestActualMonth);
  const baseMonths = sortMonths(futureRows.map(cashMonth));
  const fallbackStartMonth = nextMonth(latestActualMonth);
  const projectionStartMonth = baseMonths[0] ?? fallbackStartMonth;
  const projectionEndMonth = addMonths((baseMonths.at(-1) ?? projectionStartMonth), 1);

  const months: string[] = [];
  for (let month = projectionStartMonth; month <= projectionEndMonth; month = nextMonth(month)) {
    months.push(month);
  }

  const bullStartMonth = addMonths(latestActualMonth, BULL_CREDIT_TERM_MONTHS);
  let baseBalance = currentCash;
  let bullBalance = currentCash;
  let bearBalance = currentCash;

  return months.map((month) => {
    const baseNet = sumMonthNet(futureRows, month);
    const bullExtra = month >= bullStartMonth ? BULL_MONTHLY_NEW_CASH : 0;
    const bullNet = baseNet + bullExtra;
    const bearNet = futureRows.reduce((sum, row) => {
      const rowMonth = cashMonth(row);
      const shiftedMonth = isShiftableForecastCustomerInflow(row) ? nextMonth(rowMonth) : rowMonth;
      return shiftedMonth === month ? sum + signedAmount(row) : sum;
    }, 0);

    baseBalance += baseNet;
    bullBalance += bullNet;
    bearBalance += bearNet;

    return {
      month,
      baseNet,
      bullNet,
      bearNet,
      baseBalance,
      bullBalance,
      bearBalance,
    };
  });
}

function money(value: number): string {
  return `THB ${fmt(value)}`;
}

function tone(value: number): string {
  if (value > 0) return 'var(--accent-green)';
  if (value < 0) return 'var(--accent-red)';
  return 'var(--text-muted)';
}

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(new Date(`${month}-01`));
}

function firstNegativeMonth(projection: ProjectionRow[], key: CaseKey): string {
  const field = `${key}Balance` as const;
  return projection.find(row => row[field] < 0)?.month ?? 'No negative month';
}

function lowestBalance(projection: ProjectionRow[], key: CaseKey): number {
  const field = `${key}Balance` as const;
  if (projection.length === 0) return 0;
  return Math.min(...projection.map(row => row[field]));
}

export default function ScenarioPlannerSection() {
  const { rawData, openingBalance } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const normalized = useMemo(() => normalizeTransactions(rawData), [rawData]);
  const projection = useMemo(() => buildScenarioProjection(normalized, openingBalance), [normalized, openingBalance]);
  const latest = projection.at(-1);
  const startingCash = getCurrentCash(normalized, openingBalance);
  const finalGap = (latest?.bullBalance ?? startingCash) - (latest?.bearBalance ?? startingCash);
  const caseSummaries: ScenarioCase[] = [
    {
      key: 'base',
      label: 'Base',
      balance: latest?.baseBalance ?? startingCash,
      net: latest?.baseNet ?? 0,
      status: 'Current forecast path',
      color: '#d97706',
    },
    {
      key: 'bull',
      label: 'Bull',
      balance: latest?.bullBalance ?? startingCash,
      net: latest?.bullNet ?? 0,
      status: 'New-client upside',
      color: '#16a34a',
    },
    {
      key: 'bear',
      label: 'Bear',
      balance: latest?.bearBalance ?? startingCash,
      net: latest?.bearNet ?? 0,
      status: 'Delayed client cash',
      color: '#dc2626',
    },
  ];

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: projection.map(row => monthLabel(row.month)),
        datasets: [
          {
            label: 'Base Case',
            data: projection.map(row => row.baseBalance),
            borderColor: '#d97706',
            backgroundColor: 'rgba(217,119,6,0.10)',
            pointBackgroundColor: '#d97706',
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            tension: 0.35,
          },
          {
            label: 'Bull Case',
            data: projection.map(row => row.bullBalance),
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22,163,74,0.10)',
            pointBackgroundColor: '#16a34a',
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            tension: 0.35,
          },
          {
            label: 'Bear Case',
            data: projection.map(row => row.bearBalance),
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220,38,38,0.10)',
            pointBackgroundColor: '#dc2626',
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            tension: 0.35,
          },
        ],
      },
      options: {
        ...chartDefaults,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          ...chartDefaults.plugins,
          legend: {
            labels: {
              color: '#344054',
              font: { family: 'Inter', size: 12, weight: 'bold' },
              padding: 16,
              usePointStyle: true,
            },
          },
          tooltip: {
            ...((chartDefaults.plugins as Record<string, unknown>)?.tooltip as object),
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${money(Number((ctx.parsed as { y?: number }).y ?? ctx.raw))}`,
            },
          },
          annotation: {
            annotations: {
              zeroLine: {
                type: 'line',
                yMin: 0,
                yMax: 0,
                borderColor: 'rgba(220,38,38,0.45)',
                borderWidth: 2,
                borderDash: [6, 6],
                label: {
                  display: true,
                  content: 'Zero cash',
                  color: '#dc2626',
                  backgroundColor: 'rgba(255,255,255,0.92)',
                  borderColor: 'rgba(220,38,38,0.30)',
                  borderWidth: 1,
                },
              },
            },
          },
        },
        scales: {
          ...(chartDefaults.scales as Record<string, unknown>),
          y: {
            ...((chartDefaults.scales as Record<string, unknown>)?.y as object),
            ticks: {
              color: '#344054',
              font: { family: 'Inter', size: 11 },
              callback: value => `THB ${Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}K` : value}`,
            },
          },
        },
      } as ChartOptions,
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [projection]);

  return (
    <div className="page-stack">
      <div className="scenario-summary-grid">
        <div className="health-card">
          <div className="health-label">Starting Cash</div>
          <div className="health-value">{money(startingCash)}</div>
          <div className="health-status green"><span className="health-dot green"></span>Latest actual running balance</div>
        </div>
        <div className="health-card">
          <div className="health-label">Base Case</div>
          <div className="health-value" style={{ color: tone(latest?.baseBalance ?? 0) }}>{money(latest?.baseBalance ?? startingCash)}</div>
          <div className="health-status amber"><span className="health-dot amber"></span>Forecast running balance</div>
        </div>
        <div className="health-card">
          <div className="health-label">Bull Case</div>
          <div className="health-value" style={{ color: tone(latest?.bullBalance ?? 0) }}>{money(latest?.bullBalance ?? startingCash)}</div>
          <div className="health-status green"><span className="health-dot green"></span>+THB 30,000 monthly after credit term</div>
        </div>
        <div className="health-card">
          <div className="health-label">Bear Case</div>
          <div className="health-value" style={{ color: tone(latest?.bearBalance ?? 0) }}>{money(latest?.bearBalance ?? startingCash)}</div>
          <div className="health-status red"><span className="health-dot red"></span>Forecast clients pay one month late</div>
        </div>
      </div>

      <div className="scenario-workspace">
        <div className="chart-card scenario-chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Scenario Running Balance</div>
              <div className="chart-subtitle">Base, Bull, and Bear cash balance by cash month</div>
            </div>
          </div>
          <div className="chart-wrapper scenario-chart-wrapper">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <aside className="scenario-insights" aria-label="Scenario insights">
          <div className="scenario-insight-block">
            <div className="scenario-insight-label">Spread at final month</div>
            <div className="scenario-insight-value">{money(finalGap)}</div>
            <div className="scenario-insight-note">Bull ending cash minus Bear ending cash</div>
          </div>

          {caseSummaries.map(item => (
            <div className="scenario-case-row" key={item.key}>
              <div className="scenario-case-marker" style={{ background: item.color }} />
              <div>
                <div className="scenario-case-title">{item.label}</div>
                <div className="scenario-case-detail">{item.status}</div>
              </div>
              <div className="scenario-case-number" style={{ color: tone(item.balance) }}>{money(item.balance)}</div>
            </div>
          ))}

          <div className="scenario-risk-list">
            <div className="scenario-risk-title">Cash risk check</div>
            {caseSummaries.map(item => (
              <div className="scenario-risk-row" key={`${item.key}-risk`}>
                <span>{item.label}</span>
                <strong>{firstNegativeMonth(projection, item.key)}</strong>
              </div>
            ))}
            <div className="scenario-risk-row">
              <span>Lowest Bear balance</span>
              <strong style={{ color: tone(lowestBalance(projection, 'bear')) }}>{money(lowestBalance(projection, 'bear'))}</strong>
            </div>
          </div>
        </aside>
      </div>

      <div className="scenario-panel scenario-logic-panel">
        <h3>Scenario Logic</h3>
        <div className="scenario-results scenario-logic-grid">
          <div className="scenario-result">
            <div className="sr-label">Base case</div>
            <div className="sr-value">Current committed and forecast rows drive the running balance path.</div>
          </div>
          <div className="scenario-result">
            <div className="sr-label">Bull case</div>
            <div className="sr-value">Two new clients per month create THB 30,000 monthly cash after a 2-month credit term.</div>
          </div>
          <div className="scenario-result">
            <div className="sr-label">Bear case</div>
            <div className="sr-value">Forecast sponsor/client inflows move one month later. Ad revenue is kept on schedule.</div>
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>Projected Running Balance</h3>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cash Month</th>
                <th>Base Net</th>
                <th>Base Balance</th>
                <th>Bull Net</th>
                <th>Bull Balance</th>
                <th>Bear Net</th>
                <th>Bear Balance</th>
              </tr>
            </thead>
            <tbody>
              {projection.map(row => (
                <tr key={row.month}>
                  <td>{row.month}</td>
                  <td style={{ color: tone(row.baseNet) }}>{money(row.baseNet)}</td>
                  <td style={{ color: tone(row.baseBalance) }}>{money(row.baseBalance)}</td>
                  <td style={{ color: tone(row.bullNet) }}>{money(row.bullNet)}</td>
                  <td style={{ color: tone(row.bullBalance) }}>{money(row.bullBalance)}</td>
                  <td style={{ color: tone(row.bearNet) }}>{money(row.bearNet)}</td>
                  <td style={{ color: tone(row.bearBalance) }}>{money(row.bearBalance)}</td>
                </tr>
              ))}
              {projection.length === 0 ? (
                <tr>
                  <td colSpan={7}>No forecast rows available.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
