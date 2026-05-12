import { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({ title, description, icon, actions, meta }: PageHeaderProps) {
  return (
    <header
      className="flex flex-col gap-3 px-5 py-4 border-b"
      style={{ borderColor: 'var(--border-soft)' }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
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
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
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
