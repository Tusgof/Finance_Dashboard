'use client';

import type { ReactNode } from 'react';

interface SectionShellProps {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  children: ReactNode;
  action?: ReactNode;
}

export default function SectionShell({ id, title, subtitle, eyebrow, children, action }: SectionShellProps) {
  return (
    <section id={id} className="dashboard-section">
      <div className="section-header dashboard-section-header">
        <div className="section-header-copy">
          <div className="section-eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
          <div className="section-sub">{subtitle}</div>
        </div>
        {action ? <div className="section-action">{action}</div> : null}
      </div>
      <div className="dashboard-section-body">{children}</div>
    </section>
  );
}
