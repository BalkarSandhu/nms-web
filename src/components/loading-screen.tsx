import { Network } from "lucide-react";

export const LoadingPage = () => (
  <div
    className="w-full h-full min-h-screen flex flex-col items-center justify-center gap-6"
    style={{
      background:
        'radial-gradient(700px 400px at 50% 30%, rgba(34,211,238,0.10), transparent 60%), var(--bg-app)',
    }}
  >
    <div className="relative size-20 flex items-center justify-center">
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: '2px solid rgba(34,211,238,0.15)',
          borderTopColor: 'var(--brand)',
          animation: 'spin 1.1s linear infinite',
        }}
      />
      <span
        className="absolute inset-2 rounded-full"
        style={{
          border: '2px solid rgba(16,185,129,0.10)',
          borderRightColor: 'var(--status-online)',
          animation: 'spin 1.6s linear infinite reverse',
        }}
      />
      <span
        className="relative size-9 inline-flex items-center justify-center rounded-lg"
        style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-strong) 100%)',
          color: 'var(--bg-app)',
          boxShadow: '0 0 22px rgba(34,211,238,0.55)',
        }}
      >
        <Network className="size-5" />
      </span>
    </div>
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-hi)' }}>
        DWINMS
      </span>
      <span className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-lo)' }}>
        Connecting to network
      </span>
    </div>
  </div>
);
