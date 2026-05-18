import { ReactNode, useState } from "react";
import { ArrowLeft, FileDown, ChevronDown, FileText, Sheet, Map as MapIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ExportFormat = "pdf" | "csv";

export function ExportMenu({
  onExport,
  disabled,
}: {
  onExport?: (format: ExportFormat) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const pick = (format: ExportFormat) => {
    setOpen(false);
    onExport?.(format);
  };

  const items: { format: ExportFormat; label: string; icon: ReactNode; note?: string }[] = [
    { format: "pdf", label: "PDF", icon: <FileText className="size-4" />, note: "Default" },
    { format: "csv", label: "CSV", icon: <Sheet className="size-4" /> },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none"
          style={{
            background: "linear-gradient(180deg, var(--brand) 0%, var(--brand-strong) 100%)",
            color: "var(--bg-app)",
            boxShadow: "0 6px 14px -8px rgba(6,182,212,0.7)",
          }}
        >
          <FileDown className="size-4" />
          Export
          <ChevronDown className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-44 p-1"
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-soft)",
          color: "var(--text-hi)",
        }}
      >
        {items.map((it) => (
          <button
            key={it.format}
            type="button"
            onClick={() => pick(it.format)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors"
            style={{ color: "var(--text-mid)", background: "transparent" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--brand-soft)";
              e.currentTarget.style.color = "var(--brand)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-mid)";
            }}
          >
            {it.icon}
            <span className="flex-1 text-left">{it.label}</span>
            {it.note && (
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded"
                style={{
                  color: "var(--brand)",
                  background: "var(--brand-soft)",
                  border: "1px solid var(--border-brand)",
                }}
              >
                {it.note}
              </span>
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export type HeaderMetric = { label: string; value: number | string; color: string };

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  onBack?: () => void;
  onShowTopology?: () => void;
  /** When provided, the top-right shows these metric tiles (instead of actions). */
  metrics?: HeaderMetric[];
}

export function PageHeader({ title, description, icon, actions, meta, onBack, onShowTopology, metrics }: PageHeaderProps) {
  return (
    <header
      className="flex flex-col gap-3 px-5 py-4 border-b"
      style={{ borderColor: 'var(--border-soft)' }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title="Back"
              aria-label="Back"
              className="inline-flex items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--bg-panel)] text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:border-[var(--border-brand)] transition-colors shrink-0"
              style={{ width: 34, height: 34, cursor: 'pointer' }}
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          {icon && (
            <span
              className="size-10 inline-flex items-center justify-center rounded-lg shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(34,211,238,0.18) 0%, rgba(6,182,212,0.10) 100%)',
                border: '1px solid var(--border-brand)',
                color: 'var(--brand)',
              }}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1
              className="text-xl font-bold leading-tight tracking-tight truncate"
              style={{ color: 'var(--text-hi)' }}
            >
              {title}
            </h1>
            {description && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-lo)' }}>
                {description}
              </p>
            )}
          </div>
        </div>
        {metrics && metrics.length > 0 ? (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="flex flex-col px-3 py-1.5 rounded-md"
                style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-soft)',
                  minWidth: 110,
                }}
              >
                <span
                  className="text-lg font-bold leading-none tabular-nums"
                  style={{ color: m.color }}
                >
                  {m.value}
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] mt-1"
                  style={{ color: 'var(--text-lo)' }}
                >
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        ) : (onShowTopology || actions) ? (
          <div className="flex items-center gap-2 shrink-0">
            {onShowTopology && (
              <button
                type="button"
                onClick={onShowTopology}
                title="Show topology"
                aria-label="Show topology"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-colors"
                style={{
                  background: 'var(--brand-soft)',
                  border: '1px solid var(--border-brand)',
                  color: 'var(--brand)',
                  cursor: 'pointer',
                }}
              >
                <MapIcon className="size-4" />
                Topology
              </button>
            )}
            {actions}
          </div>
        ) : null}
      </div>
      {meta && <div className="flex items-center gap-2 flex-wrap">{meta}</div>}
    </header>
  );
}

export interface ToolbarButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  icon?: ReactNode;
  asChild?: boolean;
  type?: 'button' | 'submit';
}

export function ToolbarButton({
  variant = 'secondary',
  onClick,
  disabled,
  children,
  icon,
  type = 'button',
}: ToolbarButtonProps) {
  const base =
    'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none';

  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(180deg, var(--brand) 0%, var(--brand-strong) 100%)',
      color: 'var(--bg-app)',
      boxShadow: '0 6px 14px -8px rgba(6,182,212,0.7)',
    },
    secondary: {
      background: 'rgba(15,23,42,0.6)',
      color: 'var(--text-mid)',
      border: '1px solid var(--border-soft)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-mid)',
    },
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={base} style={styles[variant]}>
      {icon}
      {children}
    </button>
  );
}
