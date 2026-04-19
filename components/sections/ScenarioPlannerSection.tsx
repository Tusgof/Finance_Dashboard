'use client';

import { useMemo } from 'react';
import { useDashboard } from '../DashboardContext';
import { fmt } from '@/lib/dataUtils';
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

export default function ScenarioPlannerSection() {
  const { rawData, openingBalance } = useDashboard();
  const normalized = useMemo(() => normalizeTransactions(rawData), [rawData]);
  const projection = useMemo(() => buildScenarioProjection(normalized, openingBalance), [normalized, openingBalance]);
  const latest = projection.at(-1);
  const startingCash = getCurrentCash(normalized, openingBalance);

  return (
    <div className="page-stack">
      <div className="health-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
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

      <div className="scenario-panel">
        <h3>Current Situation Cash Scenario</h3>
        <div className="scenario-results">
          <div className="scenario-result">
            <div className="sr-label">Base case logic</div>
            <div className="sr-value">Uses current forecast and committed rows as the expected running balance path.</div>
          </div>
          <div className="scenario-result">
            <div className="sr-label">Bull case logic</div>
            <div className="sr-value">Assumes two new clients are closed each month, creating THB 30,000 cash in every month after a 2-month credit term.</div>
          </div>
          <div className="scenario-result">
            <div className="sr-label">Bear case logic</div>
            <div className="sr-value">Delays forecast sponsor/client inflows by 1 month. Ad revenue rows are not delayed.</div>
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
