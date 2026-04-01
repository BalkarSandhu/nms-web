import React from 'react';

type MetricBarCardProps = {
  title: string;
  value: number;
  unit: string;
};

const getMetricColor = (title: string, value: number) => {
  if (title === 'Packet Loss') {
    if (value <= 1) return '#22c55e';
    if (value <= 3) return '#f59e0b';
    return '#ef4444';
  }
  if (title === 'Avg Jitter (ms)') {
    if (value <= 20) return '#22c55e';
    if (value <= 50) return '#f59e0b';
    return '#ef4444';
  }
  if (title === 'Avg Latency (ms)') {
    if (value <= 80) return '#22c55e';
    if (value <= 120) return '#f59e0b';
    return '#ef4444';
  }
  return '#22c55e';
};

const getMetricBarPercent = (title: string, value: number) => {
  if (title === 'Packet Loss') {
    return Math.max(0, Math.min(100, 100 - value));
  }

  // Lower is better for jitter/latency: scale to 100 using a soft cap
  const cap = title === 'Avg Jitter (ms)' ? 100 : 200;
  const percent = Math.max(0, Math.min(100, Math.round((1 - value / cap) * 100)));
  return percent;
};

export default function MetricBarCard({ title, value, unit }: MetricBarCardProps) {
  const color = getMetricColor(title, value);
  const barPercent = getMetricBarPercent(title, value);
  const formattedValue = title === 'Packet Loss' ? `${value.toFixed(2)}%` : `${value.toFixed(2)}${unit}`;

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
      <h4 className="text-xs font-semibold text-slate-300 mb-2">{title}</h4>
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
