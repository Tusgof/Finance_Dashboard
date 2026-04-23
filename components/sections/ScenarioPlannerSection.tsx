'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, type ChartOptions } from 'chart.js';
import { useDashboard } from '../DashboardContext';
import { DEFAULT_DASHBOARD_SETTINGS, fmt, loadDashboardSettings } from '@/lib/dataUtils';
import { chartDefaults } from '@/lib/chartDefaults';
import { buildScenarioProjection, getCurrentCash, normalizeTransactions, type ScenarioProjectionRow } from '@/lib/dashboardMetrics';

type CaseKey = 'base' | 'bull' | 'bear';

type ScenarioCase = {
  key: CaseKey;
  label: string;
  balance: number;
  net: number;
  status: string;
  color: string;
};

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

function firstNegativeMonth(projection: ScenarioProjectionRow[], key: CaseKey): string {
  const field = `${key}Balance` as const;
  return projection.find(row => row[field] !== null && row[field] < 0)?.month ?? 'No negative month';
}

function lowestBalance(projection: ScenarioProjectionRow[], key: CaseKey): number {
  const field = `${key}Balance` as const;
  const values = projection.map(row => row[field]).filter(value => value !== null);
  if (values.length === 0) return 0;
  return Math.min(...values);
}

export default function ScenarioPlannerSection() {
  const { rawData, openingBalance } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [settings, setSettings] = useState(DEFAULT_DASHBOARD_SETTINGS);
  const normalized = useMemo(() => normalizeTransactions(rawData), [rawData]);
  useEffect(() => {
    let active = true;
    void loadDashboardSettings().then(next => {
      if (active) setSettings(next);
    });
    return () => {
      active = false;
    };
  }, []);
  const projection = useMemo(() => buildScenarioProjection(normalized, openingBalance, settings), [normalized, openingBalance, settings]);
  const scenarioProjection = projection.filter(row => row.baseBalance !== null);
  const latest = scenarioProjection.at(-1);
  const startingCash = scenarioProjection[0]?.baseBalance !== null && scenarioProjection[0]?.baseBalance !== undefined
    ? scenarioProjection[0].baseBalance - scenarioProjection[0].baseNet
    : getCurrentCash(normalized, openingBalance);
  const finalGap = (latest?.bullBalance ?? startingCash) - (latest?.bearBalance ?? startingCash);
  const bullMonthlyCashLabel = `THB ${settings.scenario.bullMonthlyCash.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const bullCreditTermMonths = settings.scenario.bullCreditTermMonths;
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
      status: `+${bullMonthlyCashLabel} ต่อเดือนหลังเครดิตเทอม ${bullCreditTermMonths} เดือน`,
      color: '#16a34a',
    },
    {
      key: 'bear',
      label: 'Bear',
      balance: latest?.bearBalance ?? startingCash,
      net: latest?.bearNet ?? 0,
      status: 'ลูกค้าเลื่อนจ่าย',
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
            label: 'Actual History',
            data: projection.map(row => row.actualBalance),
            borderColor: '#64748b',
            backgroundColor: 'rgba(100,116,139,0.10)',
            pointBackgroundColor: '#64748b',
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            tension: 0.35,
            spanGaps: false,
          },
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
            spanGaps: false,
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
            spanGaps: false,
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
            spanGaps: false,
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
          <div className="health-status green"><span className="health-dot green"></span>ยอดเงินจริงล่าสุด</div>
        </div>
        <div className="health-card">
          <div className="health-label">Base Case</div>
          <div className="health-value" style={{ color: tone(latest?.baseBalance ?? 0) }}>{money(latest?.baseBalance ?? startingCash)}</div>
          <div className="health-status amber"><span className="health-dot amber"></span>เงินสดตามแผนปัจจุบัน</div>
        </div>
        <div className="health-card">
          <div className="health-label">Bull Case</div>
          <div className="health-value" style={{ color: tone(latest?.bullBalance ?? 0) }}>{money(latest?.bullBalance ?? startingCash)}</div>
          <div className="health-status green"><span className="health-dot green"></span>{`+${bullMonthlyCashLabel} ต่อเดือนหลังเครดิตเทอม ${bullCreditTermMonths} เดือน`}</div>
        </div>
        <div className="health-card">
          <div className="health-label">Bear Case</div>
          <div className="health-value" style={{ color: tone(latest?.bearBalance ?? 0) }}>{money(latest?.bearBalance ?? startingCash)}</div>
          <div className="health-status red"><span className="health-dot red"></span>ลูกค้าทั้งหมดเลื่อนจ่าย 1 เดือน ยกเว้น ad</div>
        </div>
      </div>

      <div className="scenario-workspace">
        <div className="chart-card scenario-chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Scenario Running Balance</div>
              <div className="chart-subtitle">ยอดเงินจริงย้อนหลัง และยอดเงินสดคาดการณ์ของแต่ละกรณี</div>
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
            <div className="scenario-insight-note">เงินปลายงวดของ Bull ลบ Bear</div>
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
            <div className="scenario-risk-title">ตรวจความเสี่ยงเงินสด</div>
            {caseSummaries.map(item => (
              <div className="scenario-risk-row" key={`${item.key}-risk`}>
                <span>{item.label}</span>
                <strong>{firstNegativeMonth(projection, item.key)}</strong>
              </div>
            ))}
            <div className="scenario-risk-row">
              <span>ยอดต่ำสุดของ Bear</span>
              <strong style={{ color: tone(lowestBalance(projection, 'bear')) }}>{money(lowestBalance(projection, 'bear'))}</strong>
            </div>
          </div>
        </aside>
      </div>

      <div className="scenario-panel scenario-logic-panel">
        <h3>วิธีคิด Scenario</h3>
        <div className="table-scroll">
          <table className="scenario-logic-table">
            <thead>
              <tr>
                <th>กรณี</th>
                <th>นับอะไร</th>
                <th>ปรับอะไรเพิ่ม</th>
                <th>ใช้ดูอะไร</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>ฐาน</td>
                <td>Committed + Forecast ที่ไม่ Cancelled</td>
                <td>ไม่ปรับเพิ่ม</td>
                <td>เงินสดตามแผนปัจจุบัน</td>
              </tr>
              <tr>
                <td>ดี</td>
                <td>เหมือนกรณีฐาน</td>
                <td>{`เพิ่มเงินเข้า ${bullMonthlyCashLabel} ต่อเดือน หลังเครดิตเทอม ${bullCreditTermMonths} เดือน`}</td>
                <td>ถ้าปิดลูกค้าใหม่ได้ต่อเนื่อง</td>
              </tr>
              <tr>
                <td>แย่</td>
                <td>เหมือนกรณีฐาน</td>
                <td>เลื่อนรายได้ลูกค้าทั้งหมดออกไป 1 เดือน ยกเว้นรายได้ ad</td>
                <td>ถ้าลูกค้าจ่ายช้ากว่าแผน</td>
              </tr>
            </tbody>
          </table>
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
              {scenarioProjection.map(row => (
                <tr key={row.month}>
                  <td>{row.month}</td>
                  <td style={{ color: tone(row.baseNet) }}>{money(row.baseNet)}</td>
                  <td style={{ color: tone(row.baseBalance ?? 0) }}>{money(row.baseBalance ?? 0)}</td>
                  <td style={{ color: tone(row.bullNet) }}>{money(row.bullNet)}</td>
                  <td style={{ color: tone(row.bullBalance ?? 0) }}>{money(row.bullBalance ?? 0)}</td>
                  <td style={{ color: tone(row.bearNet) }}>{money(row.bearNet)}</td>
                  <td style={{ color: tone(row.bearBalance ?? 0) }}>{money(row.bearBalance ?? 0)}</td>
                </tr>
              ))}
              {scenarioProjection.length === 0 ? (
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
