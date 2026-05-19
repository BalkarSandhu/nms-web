import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

/**
 * Lets the History page publish a "go back to areas" handler so the global
 * second top bar can render the back arrow (left of the company name)
 * instead of it consuming a row inside the page content.
 */
interface HistoryNavCtx {
  back: (() => void) | null;
  setBack: (fn: (() => void) | null) => void;
}

const Ctx = createContext<HistoryNavCtx | undefined>(undefined);

export function HistoryNavProvider({ children }: { children: ReactNode }) {
  const [back, setBackState] = useState<(() => void) | null>(null);
  // Store the function itself (wrap so setState doesn't treat it as an updater).
  const setBack = useCallback((fn: (() => void) | null) => setBackState(() => fn), []);
  return <Ctx.Provider value={{ back, setBack }}>{children}</Ctx.Provider>;
}

export function useHistoryNav(): HistoryNavCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useHistoryNav must be used within a HistoryNavProvider');
  }
  return ctx;
}
