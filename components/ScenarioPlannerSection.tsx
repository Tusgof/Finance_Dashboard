'use client';

import ScenarioPanel from './ScenarioPanel';
import SectionShell from './SectionShell';

export default function ScenarioPlannerSection() {
  return (
    <SectionShell
      id="scenario-planner"
      eyebrow="Section 4"
      title="Scenario Planner"
      subtitle="A simple what-if panel for revenue, salary, and production cost changes."
    >
      <ScenarioPanel />
    </SectionShell>
  );
}
