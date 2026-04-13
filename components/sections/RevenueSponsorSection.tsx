'use client';

import { useMemo } from 'react';
import { useDashboard } from '../DashboardContext';
import RevenueTrendChart from '../charts/RevenueTrendChart';
import { fmt } from '@/lib/dataUtils';
import { calculateWeightedPipeline } from '@/lib/dashboardMetrics';

export default function RevenueSponsorSection() {
  const { sponsorPipeline } = useDashboard();
  const weightedPipeline = calculateWeightedPipeline(sponsorPipeline);
  const sortedDeals = useMemo(
    () =>
      [...sponsorPipeline].sort(
        (a, b) =>
          (b.weightedValue ?? b.dealValue * (b.probability / 100)) -
          (a.weightedValue ?? a.dealValue * (a.probability / 100))
      ),
    [sponsorPipeline]
  );

  return (
    <div className="page-stack">
      <div className="health-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <div className="health-card">
          <div className="health-label">Weighted Pipeline</div>
          <div className="health-value">฿{fmt(weightedPipeline)}</div>
          <div className="health-status green">
            <span className="health-dot green"></span>
            Committed/forecast revenue weighted by probability
          </div>
        </div>

        <div className="health-card">
          <div className="health-label">Pipeline Items</div>
          <div className="health-value">{sortedDeals.length}</div>
          <div className="health-status green">
            <span className="health-dot green"></span>
            Rows from Sponsor Pipeline tab
          </div>
        </div>
      </div>

      <RevenueTrendChart />

      <div className="table-card">
        <div className="table-header">
          <h3>Sponsor Pipeline</h3>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Sponsor</th>
                <th>Status</th>
                <th>Expected Date</th>
                <th>Deal Value</th>
                <th>Probability</th>
                <th>Weighted Value</th>
              </tr>
            </thead>
            <tbody>
              {sortedDeals.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: 'var(--text-muted)' }}>
                    No sponsor pipeline data yet.
                  </td>
                </tr>
              ) : (
                sortedDeals.map((deal, index) => {
                  const weighted = deal.weightedValue ?? deal.dealValue * (deal.probability / 100);
                  return (
                    <tr key={`${deal.sponsor}-${index}`}>
                      <td>{deal.sponsor}</td>
                      <td>{deal.status}</td>
                      <td>{deal.expectedDate || '-'}</td>
                      <td>฿{fmt(deal.dealValue)}</td>
                      <td>{deal.probability}%</td>
                      <td>฿{fmt(weighted)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
