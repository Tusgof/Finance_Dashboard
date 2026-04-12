'use client';

import HealthCards from './HealthCards';
import MarginChart from './charts/MarginChart';
import FixedVarChart from './charts/FixedVarChart';
import MonthlyPnlTable from './MonthlyPnlTable';
import SectionShell from './SectionShell';

export default function PnLCostSection() {
  return (
    <SectionShell
      id="pnl-cost"
      eyebrow="Section 3"
      title="P&L & Cost"
      subtitle="Profitability, margin, and cost structure in one working view."
    >
      <div className="section-stack">
        <HealthCards />
        <MonthlyPnlTable />
        <div className="section-split">
          <MarginChart />
          <FixedVarChart />
        </div>
      </div>
    </SectionShell>
  );
}
