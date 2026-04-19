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

      const fresh: DataFile = await fetch('/api/data').then(r => r.json());
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
                    <div className="validation-subtitle">
                      {validationReport.managementReady ? 'Ready for management use with warnings.' : 'Review before relying on management metrics.'}
                    </div>
                  </div>
                  <div className="validation-badges">
                    <span className={`validation-badge ${validationReport.renderingReady ? 'ok' : 'warn'}`}>
                      Render {validationReport.renderingReady ? 'ready' : 'warnings'}
                    </span>
                    <span className={`validation-badge ${validationReport.managementReady ? 'ok' : 'warn'}`}>
                      Management {validationReport.managementReady ? 'ready' : 'warnings'}
                    </span>
                  </div>
                </div>
                <div className="validation-list">
                  {validationReport.issues.slice(0, 4).map(issue => (
                    <div key={`${issue.code}-${issue.rowIndex ?? issue.workMonth ?? issue.message}`} className="validation-item">
                      <span className={`validation-pill ${issue.scope === 'management' ? 'management' : 'rendering'}`}>
                        {issue.scope}
                      </span>
                      <span>{issue.message}</span>
                    </div>
                  ))}
                  {validationReport.issues.length > 4 ? (
                    <div className="validation-item validation-more">
                      +{validationReport.issues.length - 4} more warnings
                    </div>
                  ) : null}
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
