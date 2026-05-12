import * as React from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

export type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
};

const STYLES: Record<NonNullable<ToastProps["type"]>, { bg: string; border: string; color: string; icon: React.ReactNode }> = {
  success: {
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.45)',
    color: '#6EE7B7',
    icon: <CheckCircle2 className="size-4" />,
  },
  error: {
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.45)',
    color: '#FCA5A5',
    icon: <AlertCircle className="size-4" />,
  },
  info: {
    bg: 'rgba(34,211,238,0.12)',
    border: 'rgba(34,211,238,0.45)',
    color: '#67E8F9',
    icon: <Info className="size-4" />,
  },
};

export const Toast: React.FC<ToastProps> = ({ message, type = "info" }) => {
  if (!message) return null;
  const s = STYLES[type];

  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg shadow-lg z-50 inline-flex items-center gap-2 text-sm font-medium fade-in backdrop-blur"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        boxShadow: '0 12px 28px -8px rgba(0,0,0,0.5)',
      }}
    >
      {s.icon}
      {message}
    </div>
  );
};
