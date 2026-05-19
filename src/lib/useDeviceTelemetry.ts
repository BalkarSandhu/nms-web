import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/auth";

export type TimeRangeKey = "24h" | "7d" | "30d" | "custom";
export type Granularity = "raw" | "hourly" | "daily";

export type HistoryEntry = {
  id: number;
  device_id: number;
  timestamp: string;
  is_reachable: boolean;
  latency_ms: number;
  jitter_ms: number;
  packet_loss_percent: number;
  source: string;
};

export type UptimeData = {
  avg_jitter_ms: number;
  avg_latency_ms: number;
  avg_packet_loss_percent: number;
  device_id: number;
  longest_downtime_seconds: number;
  max_latency_ms: number;
  offline_checks: number;
  online_checks: number;
  period_end: string;
  period_start: string;
  power_cut_count: number;
  power_restored_count: number;
  total_checks: number;
  uptime_pct: number;
};

export interface TelemetryRange {
  timeRange: TimeRangeKey;
  granularity: Granularity;
  customStart?: string;
  customEnd?: string;
}

export function computeRange({ timeRange, granularity, customStart, customEnd }: TelemetryRange) {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now);
  let gran: Granularity = "hourly";

  if (timeRange === "24h") {
    start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    gran = "hourly";
  } else if (timeRange === "7d") {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    gran = "daily";
  } else if (timeRange === "30d") {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    gran = "daily";
  } else {
    if (customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
    } else {
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      gran = "hourly";
    }
  }

  const effectiveGranularity = timeRange === "custom" ? granularity : gran;
  return { start, end, granularity: effectiveGranularity };
}

/**
 * Run `fn` over `items` with a bounded number of concurrent promises.
 * Returns results in input order, with allSettled-style outcomes — firing
 * every device request at once trips ERR_HTTP2_PROTOCOL_ERROR / is slow.
 *
 * `onProgress(done, total)` fires after each item settles, so callers can
 * drive a "fetched N of M" progress indicator.
 */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  let done = 0;
  const worker = async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      try {
        results[idx] = { status: "fulfilled", value: await fn(items[idx], idx) };
      } catch (reason) {
        results[idx] = { status: "rejected", reason };
      }
      done++;
      onProgress?.(done, items.length);
    }
  };
  const pool = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: pool }, () => worker()));
  return results;
}

/** Fetches a single device's history (range-bound) — same endpoint device-info uses. */
export async function fetchDeviceHistory(
  deviceId: number,
  start: Date,
  end: Date,
  granularity: Granularity,
): Promise<HistoryEntry[]> {
  const baseUrl = `${import.meta.env.VITE_NMS_HOST}/devices/${deviceId}/history`;
  const params = new URLSearchParams();
  params.append("start", start.toISOString());
  params.append("end", end.toISOString());
  params.append("granularity", granularity);
  if (granularity === "raw") {
    params.append("page", "1");
    params.append("page_size", "1000");
  }

  const res = await authenticatedFetch(`${baseUrl}?${params.toString()}`);
  if (!res.ok) throw new Error(`History API error ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

/** Fetches a single device's uptime summary for a coarse range. */
export async function fetchDeviceUptime(
  deviceId: number,
  range: "24h" | "7d" | "30d" = "24h",
): Promise<UptimeData> {
  const baseUrl = `${import.meta.env.VITE_NMS_HOST}/devices/${deviceId}/uptime`;
  const params = new URLSearchParams();
  params.append("range", range);
  const res = await authenticatedFetch(`${baseUrl}?${params.toString()}`);
  if (!res.ok) throw new Error(`Uptime API error ${res.status}`);
  const json = await res.json();
  if (!json || typeof json !== "object" || !("uptime_pct" in json)) {
    throw new Error("Uptime response format is invalid");
  }
  return json as UptimeData;
}

/** Hook: fetch history + uptime for a single device. */
export function useDeviceTelemetry(deviceId: number | null, range: TelemetryRange) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [uptime, setUptime] = useState<UptimeData | null>(null);
  const [uptimeLoading, setUptimeLoading] = useState(false);
  const [uptimeError, setUptimeError] = useState<string | null>(null);

  // Stabilise dependencies — JSON-encode the range object so the effect doesn't re-fire on every render.
  const rangeKey = useMemo(() => JSON.stringify(range), [range]);

  useEffect(() => {
    if (!deviceId) {
      setHistory([]);
      setUptime(null);
      return;
    }

    const parsed: TelemetryRange = JSON.parse(rangeKey);
    const { start, end, granularity } = computeRange(parsed);

    setHistoryLoading(true);
    setHistoryError(null);
    fetchDeviceHistory(deviceId, start, end, granularity)
      .then(setHistory)
      .catch((err) => {
        setHistoryError(err.message || "Failed to fetch history");
        setHistory([]);
      })
      .finally(() => setHistoryLoading(false));

    setUptimeLoading(true);
    setUptimeError(null);
    const summaryRange: "24h" | "7d" | "30d" =
      parsed.timeRange === "7d"  ? "7d"  :
      parsed.timeRange === "30d" ? "30d" : "24h";
    fetchDeviceUptime(deviceId, summaryRange)
      .then(setUptime)
      .catch((err) => {
        setUptimeError(err.message || "Failed to fetch uptime");
        setUptime(null);
      })
      .finally(() => setUptimeLoading(false));
  }, [deviceId, rangeKey]);

  return { history, historyLoading, historyError, uptime, uptimeLoading, uptimeError };
}
