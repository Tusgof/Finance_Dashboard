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

export default function DashboardClient() {
  const [rawData, setRawData] = useState<Transaction[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('actual');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch data on mount
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
        <KpiGrid />

        {/* Main charts row */}
        <div className="charts-grid">
          <CashFlowChart />
          <CategoryChart />
          <RevenueChart />
          <EntityChart />
          <ActualForecastChart />
        </div>

        {/* Video Production Breakdown */}
        <VideoProductionSection />

        {/* Section A: Financial Health & Survival */}
        <div style={{ marginTop: 32 }}>
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

        {/* Section B: Strategic Cost & Revenue Analysis */}
        <div style={{ marginTop: 32 }}>
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

        <TransactionTable />
      </div>
    </DashboardContext.Provider>
  );
}
