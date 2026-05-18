import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * View state for a single area screen (reached by clicking an area card).
 *  - view 'table'    → a data table (DEFAULT); `tableKind` picks Devices or Locations
 *  - view 'topology' → the topology graph (opened via the Map icon)
 * Both are scoped to the area in the `?area=` query param.
 */
export type AreaView = 'topology' | 'table';
export type AreaTableKind = 'devices' | 'locations';

interface AreaViewCtx {
  view: AreaView;
  setView: (v: AreaView) => void;
  tableKind: AreaTableKind;
  setTableKind: (k: AreaTableKind) => void;
}

const Ctx = createContext<AreaViewCtx | undefined>(undefined);

export function AreaViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AreaView>('table');
  const [tableKind, setTableKind] = useState<AreaTableKind>('locations');
  return (
    <Ctx.Provider value={{ view, setView, tableKind, setTableKind }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAreaView(): AreaViewCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useAreaView must be used within an AreaViewProvider');
  }
  return ctx;
}
