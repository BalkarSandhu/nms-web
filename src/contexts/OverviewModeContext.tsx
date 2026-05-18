import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Network-overview display mode, toggled from the top header bar.
 *  - 'devices' → area cards show device metrics (% devices online)
 *  - 'links'   → area cards show location metrics (% locations online)
 */
export type OverviewMode = 'devices' | 'links';

interface OverviewModeCtx {
  mode: OverviewMode;
  setMode: (m: OverviewMode) => void;
}

const Ctx = createContext<OverviewModeCtx | undefined>(undefined);

export function OverviewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<OverviewMode>('devices');
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}

export function useOverviewMode(): OverviewModeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useOverviewMode must be used within an OverviewModeProvider');
  }
  return ctx;
}
