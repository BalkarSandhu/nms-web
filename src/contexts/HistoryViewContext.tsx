import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Devices ⇄ Locations selector for the History page. Lifted out of
 * ScopedReportDashboard so the toggle can live in the global top header
 * bar (just before Logout, mirroring the Dashboard's mode toggle) and
 * drive BOTH the History landing area cards and the opened Area Card.
 */
export type HistoryView = 'devices' | 'locations';

interface HistoryViewCtx {
  view: HistoryView;
  setView: (v: HistoryView) => void;
}

const Ctx = createContext<HistoryViewCtx | undefined>(undefined);

export function HistoryViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<HistoryView>('devices');
  return <Ctx.Provider value={{ view, setView }}>{children}</Ctx.Provider>;
}

export function useHistoryView(): HistoryViewCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useHistoryView must be used within a HistoryViewProvider');
  }
  return ctx;
}
