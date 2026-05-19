// Shared per-device telemetry aggregation helpers.
//
// These were previously private to ScopedReportDashboard. They are now shared
// with the History landing page so the area cards can be recomputed from
// historical telemetry for the selected timeline (not just live status).

import type { HistoryEntry, Granularity } from "@/lib/useDeviceTelemetry";
import type { RangeKey } from "@/lib/report-generator";

export interface Bucket {
  bucketStart: number;
  timeLabel: string;
  online: number;
  offline: number;
  total: number;
  latencySum: number; latencyCount: number;
  jitterSum: number;  jitterCount: number;
  lossSum: number;    lossCount: number;
}

export interface DeviceAggregate {
  uptimePct: number;
  totalChecks: number;
  onlineChecks: number;
  offlineChecks: number;
  avgLatency: number;
  maxLatency: number;
  avgJitter: number;
  avgPacketLoss: number;
  incidentCount: number;
  longestDowntimeMs: number;
}

export function emptyAgg(): DeviceAggregate {
  return {
    uptimePct: 0, totalChecks: 0, onlineChecks: 0, offlineChecks: 0,
    avgLatency: 0, maxLatency: 0, avgJitter: 0, avgPacketLoss: 0,
    incidentCount: 0, longestDowntimeMs: 0,
  };
}

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

// `granularity` = server fetch resolution (raw|hourly|daily, kept light for
// speed). `bucketSize` = how points are grouped for charts/aggregation:
//   1h → 5-minute · 24h → 2-hour · 1w → daily · 1m → weekly · 3m → monthly.
export function rangeToWindow(
  range: RangeKey,
): { start: Date; end: Date; granularity: Granularity; bucketSize: number } {
  const end = new Date();
  let start: Date;
  let granularity: Granularity;
  let bucketSize: number;
  switch (range) {
    case "1h":  start = new Date(end.getTime() - HOUR_MS);       granularity = "raw";    bucketSize = 5 * 60 * 1000; break;
    case "24h": start = new Date(end.getTime() - 24 * HOUR_MS);  granularity = "hourly"; bucketSize = 2 * HOUR_MS;   break;
    case "1w":  start = new Date(end.getTime() - 7 * DAY_MS);    granularity = "daily";  bucketSize = DAY_MS;        break;
    case "1m":  start = new Date(end.getTime() - 30 * DAY_MS);   granularity = "daily";  bucketSize = 7 * DAY_MS;    break;
    case "3m":  start = new Date(end.getTime() - 90 * DAY_MS);   granularity = "daily";  bucketSize = 30 * DAY_MS;   break;
    default:    start = new Date(end.getTime() - 24 * HOUR_MS);  granularity = "hourly"; bucketSize = 2 * HOUR_MS;   break;
  }
  return { start, end, granularity, bucketSize };
}

export function aggregate(history: HistoryEntry[]): DeviceAggregate {
  if (history.length === 0) return emptyAgg();
  const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let online = 0, offline = 0;
  let latSum = 0, latCount = 0, latMax = 0;
  let jitSum = 0, jitCount = 0;
  let lossSum = 0, lossCount = 0;

  // Outage events
  let incidents = 0;
  let longest = 0;
  let openStart: string | null = null;

  for (const e of sorted) {
    if (e.is_reachable) {
      online++;
      if (openStart !== null) {
        const d = new Date(e.timestamp).getTime() - new Date(openStart).getTime();
        incidents++;
        if (d > longest) longest = d;
        openStart = null;
      }
    } else {
      offline++;
      if (openStart === null) openStart = e.timestamp;
    }
    if (typeof e.latency_ms === "number" && !isNaN(e.latency_ms)) {
      latSum += e.latency_ms; latCount++;
      if (e.latency_ms > latMax) latMax = e.latency_ms;
    }
    if (typeof e.jitter_ms === "number" && !isNaN(e.jitter_ms)) {
      jitSum += e.jitter_ms; jitCount++;
    }
    if (typeof e.packet_loss_percent === "number" && !isNaN(e.packet_loss_percent)) {
      lossSum += e.packet_loss_percent; lossCount++;
    }
  }
  if (openStart !== null) {
    incidents++;
    const d = Date.now() - new Date(openStart).getTime();
    if (d > longest) longest = d;
  }

  const total = online + offline;
  return {
    uptimePct: total ? (online / total) * 100 : 0,
    totalChecks: total,
    onlineChecks: online,
    offlineChecks: offline,
    avgLatency: latCount ? latSum / latCount : 0,
    maxLatency: latMax,
    avgJitter:  jitCount ? jitSum / jitCount : 0,
    avgPacketLoss: lossCount ? lossSum / lossCount : 0,
    incidentCount: incidents,
    longestDowntimeMs: longest,
  };
}

export function combine(aggs: DeviceAggregate[]): DeviceAggregate {
  const ok = aggs.filter(a => a.totalChecks > 0);
  if (!ok.length) return emptyAgg();
  const total = ok.reduce((s, a) => s + a.totalChecks, 0);
  const online = ok.reduce((s, a) => s + a.onlineChecks, 0);
  const offline = ok.reduce((s, a) => s + a.offlineChecks, 0);
  const weight = (sel: (a: DeviceAggregate) => number) =>
    ok.reduce((s, a) => s + sel(a) * a.totalChecks, 0) / (total || 1);
  return {
    uptimePct: total ? (online / total) * 100 : 0,
    totalChecks: total,
    onlineChecks: online,
    offlineChecks: offline,
    avgLatency: weight(a => a.avgLatency),
    maxLatency: ok.reduce((m, a) => Math.max(m, a.maxLatency), 0),
    avgJitter:  weight(a => a.avgJitter),
    avgPacketLoss: weight(a => a.avgPacketLoss),
    incidentCount: ok.reduce((s, a) => s + a.incidentCount, 0),
    longestDowntimeMs: ok.reduce((m, a) => Math.max(m, a.longestDowntimeMs), 0),
  };
}

/** A device's state at the END of the window = its most recent probe's
 *  reachability. `null` when the device has no telemetry in the range. */
export function lastReachableState(history: HistoryEntry[]): boolean | null {
  if (history.length === 0) return null;
  let latestTs = -Infinity;
  let state: boolean | null = null;
  for (const e of history) {
    const t = new Date(e.timestamp).getTime();
    if (t >= latestTs) { latestTs = t; state = !!e.is_reachable; }
  }
  return state;
}

export function fmtPct(n: number, dp = 1) { return `${n.toFixed(dp)}%`; }
export function fmtMs(n: number) { return n > 0 ? `${n.toFixed(1)} ms` : "—"; }
