'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardContext } from './DashboardContext';
import { getFilteredData } from '@/lib/dataUtils';
import type { Transaction, FilterType, DataFile } from '@/lib/types';

import Header from './Header';
import FilterBar from './FilterBar';
import KpiGrid from './KpiGrid';
import VideoProductionSection from './VideoProductionSection';
import HealthCards from './HealthCards';
import ScenarioPanel from './ScenarioPanel';
import TransactionTable from './TransactionTable';

import CashFlowChart from './charts/CashFlowChart';
import CategoryChart from './charts/CategoryChart';
import RevenueChart from './charts/RevenueChart';
import EntityChart from './charts/EntityChart';
import ActualForecastChart from './charts/ActualForecastChart';
import RunwayChart from './charts/RunwayChart';
import MarginChart from './charts/MarginChart';
import FixedVarChart from './charts/FixedVarChart';
import PersonnelChart from './charts/PersonnelChart';

type DashboardView = 'overview' | 'production' | 'health' | 'transactions';

const VIEWS: { id: DashboardView; label: string; title: string; description: string }[] = [
  {
    id: 'overview',
    label: 'Overview',
    title: 'Financial Overview',
    description: 'Top KPIs and core charts for daily monitoring.',
  },
  {
    id: 'production',
    label: 'Production',
    title: 'Production & Cost Analysis',
    description: 'Video production cost structure, operating mix, and planning tools.',
  },
  {
    id: 'health',
    label: 'Health',
    title: 'Health & Survival',
    description: 'Runway, margin, and continuity indicators in one place.',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    title: 'Transaction Details',
    description: 'Search and inspect the raw transaction ledger without extra scrolling.',
  },
];

export default function DashboardClient() {
  const [rawData, setRawData] = useState<Transaction[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('actual');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<DashboardView>('overview');

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then((d: DataFile) => {
        setRawData(d.rawData);
        setOpeningBalance(d.openingBalance);
        setLastRefresh(new Date().toISOString());
        setLoading(false);
      });
  }, []);

  const filteredData = useMemo(
    () => getFilteredData(rawData, currentFilter),
    [rawData, currentFilter]
  );

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
      value={{ rawData, openingBalance, currentFilter, setCurrentFilter, filteredData }}
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

        {activeView === 'overview' && (
          <div className="page-stack">
            <div className="charts-grid">
              <CashFlowChart />
              <CategoryChart />
              <RevenueChart />
              <EntityChart />
              <ActualForecastChart />
            </div>
          </div>
        )}

        {activeView === 'production' && (
          <div className="page-stack">
            <VideoProductionSection />
            <div className="page-section">
              <div className="section-header">
                <div className="section-icon" style={{ background: 'var(--accent-purple-bg)', color: 'var(--accent-purple)' }}>&#9881;</div>
                <div>
                  <h2>Strategic Cost &amp; Revenue Analysis</h2>
                  <div className="section-sub">Cost structure, personnel, and scenario planning</div>
                </div>
              </div>
              <div className="charts-grid">
                <FixedVarChart />
                <PersonnelChart />
              </div>
              <ScenarioPanel />
            </div>
          </div>
        )}

        {activeView === 'health' && (
          <div className="page-stack">
            <div className="page-section">
              <div className="section-header">
                <div className="section-icon" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>&#9888;</div>
                <div>
                  <h2>Financial Health &amp; Survival</h2>
                  <div className="section-sub">Critical indicators for business continuity</div>
                </div>
              </div>
              <HealthCards />
              <div className="charts-grid" style={{ gridTemplateColumns: '1fr' }}>
                <RunwayChart />
              </div>
              <div className="charts-grid" style={{ gridTemplateColumns: '1fr', marginTop: 20 }}>
                <MarginChart />
              </div>
            </div>
          </div>
        )}

        {activeView === 'transactions' && (
          <div className="page-stack">
            <TransactionTable />
          </div>
        )}
      </div>
    </DashboardContext.Provider>
  );
}
