'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardContext } from './DashboardContext';
import { getFilteredData } from '@/lib/dataUtils';
import type { DataFile, FilterType, ProductionSummaryRow, SponsorPipelineDeal, Transaction } from '@/lib/types';

import Header from './Header';
import FilterBar from './FilterBar';
import KpiGrid from './KpiGrid';
import TransactionTable from './TransactionTable';
import CashOverviewSection from './sections/CashOverviewSection';
import RevenueSponsorSection from './sections/RevenueSponsorSection';
import PnLCostSection from './sections/PnLCostSection';
import ScenarioPlannerSection from './sections/ScenarioPlannerSection';

type DashboardView = 'cash' | 'revenue' | 'pnl' | 'scenario' | 'transactions';

const VIEWS: { id: DashboardView; label: string; title: string; description: string }[] = [
  { id: 'cash', label: 'Cash', title: 'Cash Overview', description: 'Cash balance, runway, and immediate warning signals.' },
  { id: 'revenue', label: 'Revenue', title: 'Revenue & Sponsor', description: 'Revenue trend and expected sponsor pipeline.' },
  { id: 'pnl', label: 'P&L', title: 'P&L & Cost', description: 'Monthly P&L, cost per content, and forecast variance.' },
  { id: 'scenario', label: 'Scenario', title: 'Scenario Planner', description: 'Break-even, best/base/worst view, and what-if planning.' },
  { id: 'transactions', label: 'Transactions', title: 'Transaction Details', description: 'Raw ledger inspection and search.' },
];

export default function DashboardClient() {
  const [rawData, setRawData] = useState<Transaction[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [productionSummary, setProductionSummary] = useState<ProductionSummaryRow[]>([]);
  const [sponsorPipeline, setSponsorPipeline] = useState<SponsorPipelineDeal[]>([]);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('actual');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<DashboardView>('cash');

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then((d: DataFile) => {
        setRawData(d.rawData);
        setOpeningBalance(d.openingBalance);
        setProductionSummary(d.productionSummary ?? []);
        setSponsorPipeline(d.sponsorPipeline ?? []);
        setLastRefresh(new Date().toISOString());
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
      setProductionSummary(fresh.productionSummary ?? []);
      setSponsorPipeline(fresh.sponsorPipeline ?? []);
      setLastRefresh(new Date().toISOString());
    } finally {
      setRefreshing(false);
    }
  };

  const activeViewMeta = VIEWS.find(view => view.id === activeView) ?? VIEWS[0];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontSize: 16 }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <DashboardContext.Provider
      value={{ rawData, openingBalance, currentFilter, setCurrentFilter, filteredData, productionSummary, sponsorPipeline }}
    >
      <Header onRefresh={handleRefresh} refreshing={refreshing} lastRefresh={lastRefresh} />
      <FilterBar />

      <div className="main">
        <div className="workspace-nav">
          <div className="workspace-nav-header">
            <div>
              <div className="workspace-title">{activeViewMeta.title}</div>
              <div className="workspace-subtitle">{activeViewMeta.description}</div>
            </div>
          </div>
          <div className="workspace-tabs" role="tablist" aria-label="Dashboard views">
            {VIEWS.map(view => (
              <button
                key={view.id}
                className={`workspace-tab${activeView === view.id ? ' active' : ''}`}
                onClick={() => setActiveView(view.id)}
                type="button"
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>

        <KpiGrid />

        {activeView === 'cash' && <CashOverviewSection />}
        {activeView === 'revenue' && <RevenueSponsorSection />}
        {activeView === 'pnl' && <PnLCostSection />}
        {activeView === 'scenario' && <ScenarioPlannerSection />}
        {activeView === 'transactions' && (
          <div className="page-stack">
            <TransactionTable />
          </div>
        )}
      </div>
    </DashboardContext.Provider>
  );
}
