'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardContext } from './DashboardContext';
import { getFilteredData } from '@/lib/dataUtils';
import type { DataFile, FilterType, ProductionSummaryRow, SponsorPipelineDeal, Transaction } from '@/lib/types';

import Header from './Header';
import FilterBar from './FilterBar';
import TransactionTable from './TransactionTable';
import CashOverviewSection from './sections/CashOverviewSection';
import RevenueSponsorSection from './sections/RevenueSponsorSection';
import PnLCostSection from './sections/PnLCostSection';
import ScenarioPlannerSection from './sections/ScenarioPlannerSection';

type DashboardPage = 'cash' | 'revenue' | 'pnl' | 'scenario' | 'ledger';

const PAGES: { id: DashboardPage; label: string; title: string; description: string }[] = [
  { id: 'cash', label: 'Cash', title: 'Cash Overview', description: 'Current cash position, runway, balance trend, and core alerts.' },
  { id: 'revenue', label: 'Revenue', title: 'Revenue & Sponsor', description: 'Monthly sponsor revenue trend and committed pipeline.' },
  { id: 'pnl', label: 'Cash P&L', title: 'Cash View', description: 'Monthly cash after COGS, OpEx, and CapEx with split forecast variance.' },
  { id: 'scenario', label: 'Scenario', title: 'Scenario Planner', description: 'Best/base/worst projection, break-even revenue, and what-if sliders.' },
  { id: 'ledger', label: 'Ledger', title: 'Transaction Ledger', description: 'Paged source data for inspection and search.' },
];

export default function DashboardClient() {
  const [rawData, setRawData] = useState<Transaction[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [snapshotMeta, setSnapshotMeta] = useState<DataFile['snapshotMeta']>(undefined);
  const [validationReport, setValidationReport] = useState<DataFile['validationReport']>(undefined);
  const [productionSummary, setProductionSummary] = useState<ProductionSummaryRow[]>([]);
  const [sponsorPipeline, setSponsorPipeline] = useState<SponsorPipelineDeal[]>([]);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('actual');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<DashboardPage>('cash');

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then((d: DataFile) => {
        setRawData(d.rawData);
        setOpeningBalance(d.openingBalance);
        setSnapshotMeta(d.snapshotMeta);
        setValidationReport(d.validationReport);
        setProductionSummary(d.productionSummary ?? []);
        setSponsorPipeline(d.sponsorPipeline ?? []);
        setLoading(false);
      });
  }, []);

  const filteredData = useMemo(() => getFilteredData(rawData, currentFilter), [rawData, currentFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        alert('Refresh failed: ' + (err.error ?? 'Unknown error'));
        return;
      }

      const refreshed = await res.json();
      const fresh: DataFile = Array.isArray(refreshed.rawData)
        ? refreshed
        : await fetch('/api/data').then(r => r.json());
      setRawData(fresh.rawData);
      setOpeningBalance(fresh.openingBalance);
      setSnapshotMeta(fresh.snapshotMeta);
      setValidationReport(fresh.validationReport);
      setProductionSummary(fresh.productionSummary ?? []);
      setSponsorPipeline(fresh.sponsorPipeline ?? []);
    } finally {
      setRefreshing(false);
    }
  };

  const activeMeta = PAGES.find(page => page.id === activePage) ?? PAGES[0];
  const validationSubtitle = validationReport
    ? !validationReport.criticalReady
      ? 'Fix critical data issues before relying on this snapshot.'
      : !validationReport.managementReady
        ? 'Snapshot renders, but some metrics still need cleanup before decision use.'
        : validationReport.infoIssues.length > 0
          ? 'Snapshot is ready. Informational notes are listed for follow-up.'
          : 'Snapshot is ready for management use.'
    : '';
  const validationGroups = validationReport
    ? [
        {
          level: 'critical' as const,
          title: 'Critical',
          action: 'Fix before using cash truth.',
          ready: validationReport.criticalReady,
          issues: validationReport.criticalIssues,
        },
        {
          level: 'management' as const,
          title: 'Management',
          action: 'Clean up before relying on these numbers.',
          ready: validationReport.managementReady,
          issues: validationReport.managementIssues,
        },
        {
          level: 'info' as const,
          title: 'Info',
          action: 'Context for follow-up only.',
          ready: validationReport.infoIssues.length === 0,
          issues: validationReport.infoIssues,
        },
      ]
    : [];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontSize: 16 }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <DashboardContext.Provider
      value={{ rawData, openingBalance, snapshotMeta, validationReport: validationReport ?? null, currentFilter, setCurrentFilter, filteredData, productionSummary, sponsorPipeline }}
    >
      <Header onRefresh={handleRefresh} refreshing={refreshing} snapshotMeta={snapshotMeta ?? null} />

      <div className="main">
        <div className="dashboard-shell">
          <aside className="dashboard-sidebar" aria-label="Dashboard navigation">
            <div className="sidebar-block">
              <div className="sidebar-label">Pages</div>
              <div className="workspace-tabs" role="tablist" aria-label="Dashboard pages">
                {PAGES.map(page => (
                  <button
                    key={page.id}
                    type="button"
                    className={`workspace-tab${activePage === page.id ? ' active' : ''}`}
                    onClick={() => setActivePage(page.id)}
                  >
                    <span>{page.label}</span>
                    <span className="tab-helper">{page.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sidebar-block">
              <div className="sidebar-label">Ledger Scope</div>
              <FilterBar />
            </div>
          </aside>

          <div className="dashboard-content">
            {validationReport && validationReport.issues.length > 0 ? (
              <div className="validation-panel" role="status" aria-live="polite">
                <div className="validation-panel-header">
                  <div>
                    <div className="validation-title">Snapshot Validation</div>
                    <div className="validation-subtitle">{validationSubtitle}</div>
                  </div>
                  <div className="validation-badges">
                    <span className={`validation-badge ${validationReport.criticalReady ? 'ok' : 'critical'}`}>
                      Critical {validationReport.criticalIssues.length > 0 ? validationReport.criticalIssues.length : 'clear'}
                    </span>
                    <span className={`validation-badge ${validationReport.managementReady ? 'ok' : 'warn'}`}>
                      Management {validationReport.managementIssues.length > 0 ? validationReport.managementIssues.length : 'clear'}
                    </span>
                    <span className={`validation-badge ${validationReport.infoIssues.length > 0 ? 'info' : 'ok'}`}>
                      Info {validationReport.infoIssues.length > 0 ? validationReport.infoIssues.length : 'clear'}
                    </span>
                  </div>
                </div>
                <div className="validation-groups">
                  {validationGroups
                    .filter(group => group.issues.length > 0)
                    .map(group => (
                      <section key={group.level} className="validation-group">
                        <div className="validation-group-header">
                          <div>
                            <div className={`validation-group-title ${group.level}`}>{group.title}</div>
                            <div className="validation-group-action">{group.action}</div>
                          </div>
                          <span className={`validation-badge ${group.ready ? 'ok' : group.level === 'critical' ? 'critical' : group.level === 'info' ? 'info' : 'warn'}`}>
                            {group.issues.length} issue{group.issues.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="validation-list">
                          {group.issues.slice(0, 2).map(issue => (
                            <div key={`${group.level}-${issue.code}-${issue.rowIndex ?? issue.workMonth ?? issue.message}`} className="validation-item">
                              <span className={`validation-pill ${issue.level}`}>
                                {issue.level}
                              </span>
                              <span>{issue.message}</span>
                            </div>
                          ))}
                          {group.issues.length > 2 ? (
                            <div className="validation-item validation-more">
                              +{group.issues.length - 2} more {group.level} item{group.issues.length - 2 === 1 ? '' : 's'}
                            </div>
                          ) : null}
                        </div>
                      </section>
                    ))}
                </div>
              </div>
            ) : null}

            <div className="workspace-nav">
              <div className="workspace-nav-header">
                <div>
                  <div className="workspace-title">{activeMeta.title}</div>
                  <div className="workspace-subtitle">{activeMeta.description}</div>
                </div>
              </div>
            </div>

            {activePage === 'cash' && <CashOverviewSection />}
            {activePage === 'revenue' && <RevenueSponsorSection />}
            {activePage === 'pnl' && <PnLCostSection />}
            {activePage === 'scenario' && <ScenarioPlannerSection />}
            {activePage === 'ledger' && <TransactionTable />}
          </div>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
