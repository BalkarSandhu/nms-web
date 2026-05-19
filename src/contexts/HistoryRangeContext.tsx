import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Global History timeline range, surfaced in the second top bar (next to
 * "Bharat Coking Coal Limited" / Live status) and applied to every area.
 * Kept as a local string union so this module stays light (no jsPDF pull).
 */
export type HistoryRange = '24h' | '1w' | '1m' | '3m';

export const HISTORY_RANGES: { key: HistoryRange; label: string }[] = [
  { key: '24h', label: '24 Hours' },
  { key: '1w', label: '1 Week' },
  { key: '1m', label: '1 Month' },
  { key: '3m', label: '3 Months' },
];

interface HistoryRangeCtx {
  range: HistoryRange;
  setRange: (r: HistoryRange) => void;
}

const Ctx = createContext<HistoryRangeCtx | undefined>(undefined);

export function HistoryRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<HistoryRange>('24h');
  return <Ctx.Provider value={{ range, setRange }}>{children}</Ctx.Provider>;
}

export function useHistoryRange(): HistoryRangeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useHistoryRange must be used within a HistoryRangeProvider');
  }
  return ctx;
}
