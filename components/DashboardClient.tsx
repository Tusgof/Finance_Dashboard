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
  { id: 'pnl', label: 'P&L', title: 'P&L & Cost', description: 'Monthly P&L, content cost, headcount ratio, and forecast accuracy.' },
  { id: 'scenario', label: 'Scenario', title: 'Scenario Planner', description: 'Best/base/worst projection, break-even revenue, and what-if sliders.' },
  { id: 'ledger', label: 'Ledger', title: 'Transaction Ledger', description: 'Paged source data for inspection and search.' },
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
  const [activePage, setActivePage] = useState<DashboardPage>('cash');

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
      value={{ rawData, openingBalance, currentFilter, setCurrentFilter, filteredData, productionSummary, sponsorPipeline }}
    >
      <Header onRefresh={handleRefresh} refreshing={refreshing} lastRefresh={lastRefresh} />
      <FilterBar />

      <div className="main">
        <div className="workspace-nav">
          <div className="workspace-nav-header">
            <div>
              <div className="workspace-title">{activeMeta.title}</div>
              <div className="workspace-subtitle">{activeMeta.description}</div>
            </div>
          </div>
          <div className="workspace-tabs" role="tablist" aria-label="Dashboard pages">
            {PAGES.map(page => (
              <button
                key={page.id}
                type="button"
                className={`workspace-tab${activePage === page.id ? ' active' : ''}`}
                onClick={() => setActivePage(page.id)}
              >
                {page.label}
              </button>
            ))}
          </div>
        </div>

        {activePage === 'cash' && <CashOverviewSection />}
        {activePage === 'revenue' && <RevenueSponsorSection />}
        {activePage === 'pnl' && <PnLCostSection />}
        {activePage === 'scenario' && <ScenarioPlannerSection />}
        {activePage === 'ledger' && <TransactionTable />}
      </div>
    </DashboardContext.Provider>
  );
}
