import React from 'react';

type AvgLatencyCardProps = {
  value: number;
};

const getLatencyColor = (value: number) => {
  if (value <= 80) return '#22c55e';
  if (value <= 120) return '#f59e0b';
  return '#ef4444';
};

const getLatencyBarPercent = (value: number) => {
  const cap = 200;
  const percent = Math.max(0, Math.min(100, Math.round((1 - value / cap) * 100)));
  return percent;
};

export default function AvgLatencyCard({ value }: AvgLatencyCardProps) {
  const color = getLatencyColor(value);
  const barPercent = getLatencyBarPercent(value);
  const formattedValue = `${value.toFixed(2)}ms`;

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
      <h4 className="text-xs font-semibold text-slate-300 mb-2">Avg Latency</h4>
      <div className="flex items-end justify-between gap-4">
        <span className="text-3xl font-bold" style={{ color }}>{formattedValue}</span>
        <span className="text-xs text-slate-400">{barPercent}% productive</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-700 mt-3">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${barPercent}%`, backgroundColor: color }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}