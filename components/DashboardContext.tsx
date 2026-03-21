'use client';

import { createContext, useContext } from 'react';
import type { DashboardContextType } from '@/lib/types';

export const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboard(): DashboardContextType {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used inside DashboardContext.Provider');
  return ctx;
}
