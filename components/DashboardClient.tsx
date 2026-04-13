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

export default function DashboardClient() {
  const [rawData, setRawData] = useState<Transaction[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [productionSummary, setProductionSummary] = useState<ProductionSummaryRow[]>([]);
  const [sponsorPipeline, setSponsorPipeline] = useState<SponsorPipelineDeal[]>([]);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('actual');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        <KpiGrid />

        <div className="page-stack">
          <CashOverviewSection />
          <RevenueSponsorSection />
          <PnLCostSection />
          <ScenarioPlannerSection />
          <TransactionTable />
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
