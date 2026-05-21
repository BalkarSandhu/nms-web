import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchServiceStats } from '@/store/servicesSlice';
import { PageHeader, ToolbarButton } from '@/components/page-header';
import { LoadingPage } from '@/components/loading-screen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import {
  Activity, Check, ChevronsUpDown, Layers, Pause, Play, RefreshCw, Square, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'running' | 'stopped' | 'paused';

export default function ServicesPage() {
  const dispatch = useAppDispatch();
  const { stats, loading, error } = useAppSelector((s) => s.services);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    if (!stats || stats.length === 0) {
      dispatch(fetchServiceStats());
    }
  }, [dispatch]);

  const totals = useMemo(() => {
    return stats.reduce(
      (acc, s) => {
        acc.running += s.running;
        acc.stopped += s.stopped;
        acc.paused += s.paused;
        acc.total += s.total;
        return acc;
      },
      { running: 0, stopped: 0, paused: 0, total: 0 },
    );
  }, [stats]);

  const selectedWorker = useMemo(
    () => stats.find((w) => w.worker_id === selectedWorkerId) ?? null,
    [stats, selectedWorkerId],
  );

  const visible = useMemo(() => {
    return stats.filter((w) => {
      if (selectedWorkerId && w.worker_id !== selectedWorkerId) return false;
      if (filter === 'running' && w.running === 0) return false;
      if (filter === 'stopped' && w.stopped === 0) return false;
      if (filter === 'paused' && w.paused === 0) return false;
      return true;
    });
  }, [stats, selectedWorkerId, filter]);

  if (loading && stats.length === 0) {
    return <LoadingPage />;
  }

  return (
    <div className="p-4 flex gap-4 min-h-[90vh] max-h-full w-full fade-in">
      <div className="flex-1 flex flex-col overflow-hidden nms-panel">
        <PageHeader
          title="Services"
          description="Per-worker service runtime status"
          icon={<Layers className="size-5" />}
          actions={
            <ToolbarButton
              variant="primary"
              onClick={() => dispatch(fetchServiceStats())}
              disabled={loading}
              icon={<RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </ToolbarButton>
          }
        />

        <div className="flex-1 overflow-auto px-5 py-4">
          {/* Global KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <KpiTile
              label="Total Services"
              value={totals.total}
              accent="cyan"
              icon={<Activity className="h-3.5 w-3.5" />}
              sub={`${stats.length} worker${stats.length !== 1 ? 's' : ''}`}
            />
            <KpiTile
              label="Running"
              value={totals.running}
              accent="emerald"
              icon={<Play className="h-3.5 w-3.5" />}
              sub={totals.total ? `${Math.round((totals.running / totals.total) * 100)}%` : '0%'}
            />
            <KpiTile
              label="Stopped"
              value={totals.stopped}
              accent="red"
              icon={<Square className="h-3.5 w-3.5" />}
              sub={totals.total ? `${Math.round((totals.stopped / totals.total) * 100)}%` : '0%'}
            />
            <KpiTile
              label="Paused"
              value={totals.paused}
              accent="amber"
              icon={<Pause className="h-3.5 w-3.5" />}
              sub={totals.total ? `${Math.round((totals.paused / totals.total) * 100)}%` : '0%'}
            />
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  className="flex items-center gap-2 px-3 h-9 rounded-md border bg-[var(--bg-panel)]/60 text-xs text-[var(--text-hi)] hover:border-[var(--border-brand)] transition-colors w-64"
                  style={{ borderColor: 'var(--border-soft)' }}
                >
                  <Users className="size-3.5 text-[var(--text-lo)]" />
                  <span className="flex-1 text-left truncate">
                    {selectedWorker ? selectedWorker.worker_name : 'All workers'}
                  </span>
                  <ChevronsUpDown className="size-3.5 text-[var(--text-lo)]" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search workers…" className="h-9" />
                  <CommandList>
                    <CommandEmpty>No workers found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__all__"
                        onSelect={() => {
                          setSelectedWorkerId(null);
                          setPickerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 size-4',
                            selectedWorkerId === null ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span className="font-medium">All workers</span>
                        <span className="ml-auto text-[11px] text-[var(--text-lo)]">
                          {stats.length}
                        </span>
                      </CommandItem>
                      {stats.map((w) => (
                        <CommandItem
                          key={w.worker_id || w.worker_name}
                          value={`${w.worker_name} ${w.worker_id}`}
                          onSelect={() => {
                            setSelectedWorkerId(w.worker_id);
                            setPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 size-4',
                              selectedWorkerId === w.worker_id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-sm">{w.worker_name}</div>
                            {w.worker_id && (
                              <div className="truncate font-mono text-[10px] text-[var(--text-lo)]">
                                {w.worker_id}
                              </div>
                            )}
                          </div>
                          <span className="ml-2 text-[11px] text-emerald-300 tabular-nums shrink-0">
                            {w.running}/{w.total}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedWorker && (
              <button
                type="button"
                onClick={() => setSelectedWorkerId(null)}
                className="h-9 px-2 rounded-md text-[11px] text-[var(--text-lo)] hover:text-[var(--text-hi)] underline underline-offset-2"
              >
                Clear
              </button>
            )}

            <div className="flex items-center gap-1">
              {(['all', 'running', 'stopped', 'paused'] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`h-9 px-3 rounded-md text-xs font-semibold capitalize transition-colors border ${
                    filter === f
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
                      : 'text-[var(--text-lo)] hover:text-[var(--text-hi)] border-transparent'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="ml-auto text-xs text-[var(--text-lo)]">
              {visible.length} of {stats.length} workers
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-2 rounded border text-sm bg-red-900/30 border-red-700/40 text-red-300">
              {error}
            </div>
          )}

          {/* Card grid */}
          {visible.length === 0 ? (
            <div className="text-center py-16">
              <Layers className="h-10 w-10 mx-auto text-[var(--text-dim)] mb-3 opacity-60" />
              <p className="text-sm text-[var(--text-lo)]">
                {stats.length === 0 ? 'No service data available' : 'No workers match the current filter'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {visible.map((w) => (
                <WorkerServiceCard key={w.worker_id || w.worker_name} stats={w} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkerServiceCard({ stats }: { stats: import('@/store/servicesSlice').WorkerServiceStats }) {
  const { worker_name, worker_id, running, stopped, paused, total } = stats;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  const healthHue =
    total === 0
      ? 'border-slate-700'
      : stopped > 0
      ? 'border-red-500/40'
      : paused > 0
      ? 'border-amber-500/40'
      : 'border-emerald-500/40';

  return (
    <div
      className={`rounded-xl border ${healthHue} bg-slate-800/60 p-4 hover:bg-slate-800 transition-colors`}
    >
      {/* Title */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-slate-100 font-semibold text-sm truncate">{worker_name}</div>
          {worker_id && (
            <div className="text-slate-500 text-[11px] font-mono truncate mt-0.5">{worker_id}</div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-cyan-300 font-bold tabular-nums text-lg leading-none">{total}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Total</div>
        </div>
      </div>

      {/* Stacked distribution bar */}
      <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden flex mb-3">
        <div className="h-full bg-emerald-400" style={{ width: `${pct(running)}%` }} />
        <div className="h-full bg-amber-400" style={{ width: `${pct(paused)}%` }} />
        <div className="h-full bg-red-400" style={{ width: `${pct(stopped)}%` }} />
      </div>

      {/* Status tiles */}
      <div className="grid grid-cols-3 gap-2">
        <StatusTile color="emerald" icon={<Play className="h-3 w-3" />} label="Running" value={running} />
        <StatusTile color="red" icon={<Square className="h-3 w-3" />} label="Stopped" value={stopped} />
        <StatusTile color="amber" icon={<Pause className="h-3 w-3" />} label="Paused" value={paused} />
      </div>
    </div>
  );
}

function StatusTile({
  color, icon, label, value,
}: {
  color: 'emerald' | 'red' | 'amber';
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  const styles = {
    emerald: 'bg-emerald-500/10 border-emerald-600/30 text-emerald-300',
    red:     'bg-red-500/10 border-red-600/30 text-red-300',
    amber:   'bg-amber-500/10 border-amber-600/30 text-amber-300',
  } as const;
  return (
    <div className={`rounded-lg border p-2 text-center ${styles[color]}`}>
      <div className="text-lg font-bold tabular-nums leading-none">{value}</div>
      <div className="flex items-center justify-center gap-1 text-[10px] mt-1 opacity-90">
        {icon}
        {label}
      </div>
    </div>
  );
}

function KpiTile({
  label, value, accent = 'cyan', icon, sub,
}: {
  label: string;
  value: number;
  accent?: 'cyan' | 'emerald' | 'amber' | 'red';
  icon?: React.ReactNode;
  sub?: string;
}) {
  const styles: Record<string, { fg: string; bg: string; border: string }> = {
    cyan:    { fg: 'text-cyan-300',    bg: 'bg-cyan-500/10',    border: 'border-cyan-600/30' },
    emerald: { fg: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-600/30' },
    amber:   { fg: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-600/30' },
    red:     { fg: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-600/30' },
  };
  const c = styles[accent];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
      <div className="flex items-center gap-2 text-xs text-slate-300">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${c.fg}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
