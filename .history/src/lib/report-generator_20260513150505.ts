import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { fetchDeviceHistory, type HistoryEntry, type Granularity } from "@/lib/useDeviceTelemetry";

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

export type RangeKey = "1h" | "24h" | "1w" | "1m" | "3m";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "1h",  label: "Last 1 hour"   },
  { key: "24h", label: "Last 24 hours" },
  { key: "1w",  label: "Last 1 week"   },
  { key: "1m",  label: "Last 1 month"  },
  { key: "3m",  label: "Last 3 months" },
];

export interface DeviceMeta {
  id: number;
  display?: string;
  hostname?: string;
  ip?: string;
  type?: string;
  location?: string;
  area?: string;
  is_reachable?: boolean;
}

export interface AreaMeta {
  id: string;
  name: string;
}

export interface LocationMeta {
  id: number | string;
  name: string;
}

export async function generateSingleDeviceReport(
  device: DeviceMeta,
  range: RangeKey,
  onProgress?: (msg: string) => void,
): Promise<void> {
  onProgress?.("Fetching history…");
  const { start, end, granularity } = rangeToWindow(range);
  const history = await fetchDeviceHistory(device.id, start, end, granularity);
  const agg = aggregateHistory(history);

  onProgress?.("Building PDF…");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  drawHeader(doc, "Device Telemetry Report", rangeLabel(range), W);
  drawDeviceMetaBlock(doc, device, 110);
  let y = 170;

  // KPI grid
  y = drawKpiGrid(doc, y, W, kpiTilesForAggregate(agg));

  // Latency summary text + reliability sentence
  y = drawNarrative(doc, y, W, deviceNarrative(device, agg, range));

  // Latency histogram (mini bar chart)
  y = drawSectionTitle(doc, y, "Latency distribution");
  y = drawLatencyHistogram(doc, y, W, history, agg);

  // Availability over time (online vs offline counts)
  y = drawSectionTitle(doc, y, "Availability over time");
  y = drawAvailabilityChart(doc, y, W, history, range);

  // Incidents table
  const incidents = computeIncidents(history);
  if (incidents.length > 0) {
    y = ensureSpace(doc, y, 200);
    y = drawSectionTitle(doc, y, "Outage events");
    autoTable(doc, {
      startY: y,
      margin: { left: 40, right: 40 },
      head: [["Started", "Ended", "Duration"]],
      body: incidents.slice(0, 20).map((i) => [
        new Date(i.start).toLocaleString(),
        i.end ? new Date(i.end).toLocaleString() : "ongoing",
        formatDuration(i.durationMs),
      ]),
      headStyles: { fillColor: [15, 23, 42], textColor: 226 },
      styles:     { fontSize: 9, cellPadding: 4 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  drawFooter(doc);
  const fname = `device-${slug(device.display || device.hostname || String(device.id))}-${range}.pdf`;
  doc.save(fname);
}

export async function generateMultipleDevicesReport(
  devices: DeviceMeta[],
  range: RangeKey,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const { start, end, granularity } = rangeToWindow(range);
  onProgress?.(`Fetching history for ${devices.length} device${devices.length === 1 ? "" : "s"}…`);

  const results = await Promise.allSettled(
    devices.map(async (d) => ({
      device: d,
      history: await fetchDeviceHistory(d.id, start, end, granularity),
    })),
  );

  const rows = results.map((r, idx) => {
    if (r.status === "fulfilled") {
      const agg = aggregateHistory(r.value.history);
      return { device: r.value.device, agg, ok: true as const };
    }
    return { device: devices[idx], agg: emptyAggregate(), ok: false as const };
  });

  const aggregateOfAll = combineAggregates(rows.map((r) => r.agg));

  onProgress?.("Building PDF…");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  drawHeader(doc, "Multi-Device Telemetry Report", rangeLabel(range), W);
  drawSummaryStrip(doc, 110, W, [
    { label: "Devices",    value: String(devices.length) },
    { label: "Avg Uptime", value: fmtPct(aggregateOfAll.uptimePct) },
    { label: "Avg Latency",value: fmtMs(aggregateOfAll.avgLatency) },
  ]);

  let y = 170;
  y = drawKpiGrid(doc, y, W, kpiTilesForAggregate(aggregateOfAll, /*compact*/ true));

  // Comparison table
  y = drawSectionTitle(doc, y, "Per-device comparison");
  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 40 },
    head: [["Device", "IP", "Type", "Uptime %", "Avg Latency", "Max Latency", "Packet Loss", "Outages"]],
    body: rows.map((r) => [
      r.device.display || r.device.hostname || `Device ${r.device.id}`,
      r.device.ip || "—",
      r.device.type || "—",
      r.ok ? fmtPct(r.agg.uptimePct) : "—",
      r.ok ? fmtMs(r.agg.avgLatency) : "—",
      r.ok ? fmtMs(r.agg.maxLatency) : "—",
      r.ok ? fmtPct(r.agg.avgPacketLoss, 2) : "—",
      r.ok ? String(r.agg.incidentCount) : "—",
    ]),
    headStyles: { fillColor: [15, 23, 42], textColor: 226 },
    styles:     { fontSize: 9, cellPadding: 4 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      // Tint uptime cells
      if (data.column.index === 3 && data.section === "body") {
        const v = parseFloat(String(data.cell.raw).replace("%", ""));
        if (!isNaN(v)) {
          if (v >= 95) data.cell.styles.textColor = [16, 185, 129];
          else if (v >= 80) data.cell.styles.textColor = [245, 158, 11];
          else data.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // Top 5 most reliable / 5 least reliable
  y = ensureSpace(doc, y, 220);
  y = drawSectionTitle(doc, y, "Top performers & under-performers");
  const sorted = [...rows].filter((r) => r.ok).sort((a, b) => b.agg.uptimePct - a.agg.uptimePct);
  const top = sorted.slice(0, 5);
  const bottom = sorted.slice(-5).reverse();

  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 40 },
    head: [["#", "Most reliable", "Uptime", "#", "Least reliable", "Uptime"]],
    body: Array.from({ length: Math.max(top.length, bottom.length) }, (_, i) => {
      const t = top[i];
      const b = bottom[i];
      return [
        t ? String(i + 1) : "",
        t ? (t.device.display || t.device.hostname || "") : "",
        t ? fmtPct(t.agg.uptimePct) : "",
        b ? String(i + 1) : "",
        b ? (b.device.display || b.device.hostname || "") : "",
        b ? fmtPct(b.agg.uptimePct) : "",
      ];
    }),
    headStyles: { fillColor: [15, 23, 42], textColor: 226 },
    styles:     { fontSize: 9, cellPadding: 4 },
  });

  drawFooter(doc);
  doc.save(`multi-device-${devices.length}-${range}.pdf`);
}

export async function generateAreaReport(
  area: AreaMeta,
  devices: DeviceMeta[],
  locations: LocationMeta[],
  range: RangeKey,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const { start, end, granularity } = rangeToWindow(range);
  onProgress?.(`Fetching telemetry for ${devices.length} device${devices.length === 1 ? "" : "s"} in ${area.name}…`);

  const results = await Promise.allSettled(
    devices.map(async (d) => ({
      device: d,
      history: await fetchDeviceHistory(d.id, start, end, granularity),
    })),
  );

  const perDevice = results.map((r, idx) => {
    if (r.status === "fulfilled") {
      return { device: r.value.device, agg: aggregateHistory(r.value.history), history: r.value.history, ok: true };
    }
    return { device: devices[idx], agg: emptyAggregate(), history: [] as HistoryEntry[], ok: false };
  });

  const overall = combineAggregates(perDevice.map((p) => p.agg));
  const allHistory = perDevice.flatMap((p) => p.history);

  onProgress?.("Building PDF…");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  drawHeader(doc, `Area Report — ${area.name}`, rangeLabel(range), W);

  drawSummaryStrip(doc, 110, W, [
    { label: "Devices",   value: String(devices.length) },
    { label: "Locations", value: String(uniqueCount(devices.map((d) => d.location))) },
    { label: "Period",    value: rangeLabel(range) },
  ]);

  let y = 170;

  // Headline KPI grid
  y = drawKpiGrid(doc, y, W, [
    { label: "Avg Uptime",        value: fmtPct(overall.uptimePct),                 tint: tintUptime(overall.uptimePct) },
    { label: "Longest downtime",  value: formatDuration(overall.longestDowntimeMs), tint: [239,68,68] },
    { label: "Avg Latency",       value: fmtMs(overall.avgLatency) },
    { label: "Max Latency",       value: fmtMs(overall.maxLatency) },
    { label: "Avg Jitter",        value: fmtMs(overall.avgJitter) },
    { label: "Avg Packet Loss",   value: fmtPct(overall.avgPacketLoss, 2),          tint: overall.avgPacketLoss > 1 ? [239,68,68] : [16,185,129] },
  ]);

  // Availability chart aggregated across area
  y = drawSectionTitle(doc, y, "Area availability over time");
  y = drawAvailabilityChart(doc, y, W, allHistory, range);

  // Latency distribution across area
  // y = drawSectionTitle(doc, y, "Latency distribution (all devices)");
  // y = drawLatencyHistogram(doc, y, W, allHistory, overall);

  // Per-location summary
  y = ensureSpace(doc, y, 200);
  y = drawSectionTitle(doc, y, "Per-location summary");
  const locRows = perLocationSummary(perDevice, locations);
  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 40 },
    head: [["Location", "Devices", "Online now", "Avg Uptime", "Avg Latency", "Outages"]],
    body: locRows.map((r) => [
      r.locationName,
      String(r.deviceCount),
      String(r.onlineNow),
      fmtPct(r.avgUptime),
      fmtMs(r.avgLatency),
      String(r.totalIncidents),
    ]),
    headStyles: { fillColor: [15, 23, 42], textColor: 226 },
    styles:     { fontSize: 9, cellPadding: 4 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // Per-device summary, ordered by uptime
  const devRows = perDevice
    .filter((p) => p.ok)
    .sort((a, b) => b.agg.uptimePct - a.agg.uptimePct);

  y = ensureSpace(doc, y, 240);
  y = drawSectionTitle(doc, y, "Per-device summary");
  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 40 },
    head: [["Device", "IP", "Type", "Location", "Uptime", "Avg Lat.", "Max Lat.", "Loss", "Outages"]],
    body: devRows.map((r) => [
      r.device.display || r.device.hostname || `Device ${r.device.id}`,
      r.device.ip || "—",
      r.device.type || "—",
      r.device.location || "—",
      fmtPct(r.agg.uptimePct),
      fmtMs(r.agg.avgLatency),
      fmtMs(r.agg.maxLatency),
      fmtPct(r.agg.avgPacketLoss, 2),
      String(r.agg.incidentCount),
    ]),
    headStyles: { fillColor: [15, 23, 42], textColor: 226 },
    styles:     { fontSize: 8.5, cellPadding: 3.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.column.index === 4 && data.section === "body") {
        const v = parseFloat(String(data.cell.raw).replace("%", ""));
        if (!isNaN(v)) {
          if (v >= 95) data.cell.styles.textColor = [16, 185, 129];
          else if (v >= 80) data.cell.styles.textColor = [245, 158, 11];
          else data.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
  });

  // Top/bottom
  let y2 = (doc as any).lastAutoTable.finalY + 14;
  y2 = ensureSpace(doc, y2, 200);
  y2 = drawSectionTitle(doc, y2, "Most & least reliable in area");
  const top = devRows.slice(0, 5);
  const bottom = devRows.slice(-5).reverse();
  autoTable(doc, {
    startY: y2,
    margin: { left: 40, right: 40 },
    head: [["#", "Most reliable", "Uptime", "#", "Least reliable", "Uptime"]],
    body: Array.from({ length: Math.max(top.length, bottom.length) }, (_, i) => {
      const t = top[i];
      const b = bottom[i];
      return [
        t ? String(i + 1) : "",
        t ? (t.device.display || t.device.hostname || "") : "",
        t ? fmtPct(t.agg.uptimePct) : "",
        b ? String(i + 1) : "",
        b ? (b.device.display || b.device.hostname || "") : "",
        b ? fmtPct(b.agg.uptimePct) : "",
      ];
    }),
    headStyles: { fillColor: [15, 23, 42], textColor: 226 },
    styles:     { fontSize: 9, cellPadding: 4 },
  });
  autoTable(doc, {
    startY: y2,
    margin: { left: 40, right: 40 },
    head: [["#", "Most reliable", "Uptime"]],
    body: Array.from({ length: Math.max(top.length, bottom.length) }, (_, i) => {
      const t = top[i];
      const b = bottom[i];
      return [
        t ? String(i + 1) : "",
        t ? (t.device.display || t.device.hostname || "") : "",
        t ? fmtPct(t.agg.uptimePct) : "",
      ];
    }),
    headStyles: { fillColor: [15, 23, 42], textColor: 226 },
    styles:     { fontSize: 9, cellPadding: 4 },
  });
  

  drawFooter(doc);
  doc.save(`area-${slug(area.name)}-${range}.pdf`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Aggregates
// ──────────────────────────────────────────────────────────────────────────────

interface Aggregate {
  uptimePct: number;
  totalChecks: number;
  onlineChecks: number;
  offlineChecks: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  avgJitter: number;
  avgPacketLoss: number;
  maxPacketLoss: number;
  incidentCount: number;
  longestDowntimeMs: number;
}

function emptyAggregate(): Aggregate {
  return {
    uptimePct: 0, totalChecks: 0, onlineChecks: 0, offlineChecks: 0,
    avgLatency: 0, maxLatency: 0, minLatency: 0, 
    avgJitter: 0, avgPacketLoss: 0, maxPacketLoss: 0,
    incidentCount: 0, longestDowntimeMs: 0,
  };
}

function aggregateHistory(history: HistoryEntry[]): Aggregate {
  if (history.length === 0) return emptyAggregate();

  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const total = sorted.length;
  let online = 0, offline = 0;
  const lat: number[] = [];
  const jit: number[] = [];
  const loss: number[] = [];

  for (const e of sorted) {
    if (e.is_reachable) online++; else offline++;
    if (typeof e.latency_ms === "number" && !isNaN(e.latency_ms)) lat.push(e.latency_ms);
    if (typeof e.jitter_ms === "number" && !isNaN(e.jitter_ms))   jit.push(e.jitter_ms);
    if (typeof e.packet_loss_percent === "number" && !isNaN(e.packet_loss_percent)) loss.push(e.packet_loss_percent);
  }

  const incidents = computeIncidents(sorted);
  const longestDowntimeMs = incidents.reduce((m, i) => Math.max(m, i.durationMs), 0);

  return {
    uptimePct:    total ? (online / total) * 100 : 0,
    totalChecks:  total,
    onlineChecks: online,
    offlineChecks: offline,
    avgLatency:   avg(lat),
    maxLatency:   max(lat),
    minLatency:   min(lat),
    avgJitter:    avg(jit),
    avgPacketLoss: avg(loss),
    maxPacketLoss: max(loss),
    incidentCount: incidents.length,
    longestDowntimeMs,
  };
}

function combineAggregates(aggs: Aggregate[]): Aggregate {
  const ok = aggs.filter((a) => a.totalChecks > 0);
  if (ok.length === 0) return emptyAggregate();

  const totalChecks  = ok.reduce((s, a) => s + a.totalChecks, 0);
  const onlineChecks = ok.reduce((s, a) => s + a.onlineChecks, 0);
  const offlineChecks = ok.reduce((s, a) => s + a.offlineChecks, 0);

  return {
    uptimePct:    totalChecks ? (onlineChecks / totalChecks) * 100 : 0,
    totalChecks, onlineChecks, offlineChecks,
    avgLatency:   weightedAvg(ok.map((a) => a.avgLatency),   ok.map((a) => a.totalChecks)),
    maxLatency:   max(ok.map((a) => a.maxLatency)),
    minLatency:   min(ok.map((a) => a.minLatency).filter((n) => n > 0)),
    avgJitter:    weightedAvg(ok.map((a) => a.avgJitter),    ok.map((a) => a.totalChecks)),
    avgPacketLoss: weightedAvg(ok.map((a) => a.avgPacketLoss),ok.map((a) => a.totalChecks)),
    maxPacketLoss: max(ok.map((a) => a.maxPacketLoss)),
    incidentCount: ok.reduce((s, a) => s + a.incidentCount, 0),
    longestDowntimeMs: max(ok.map((a) => a.longestDowntimeMs)),
  };
}

interface Incident {
  start: string;
  end: string | null;
  durationMs: number;
}
function computeIncidents(history: HistoryEntry[]): Incident[] {
  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const out: Incident[] = [];
  let openStart: string | null = null;
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    if (!e.is_reachable && openStart === null) {
      openStart = e.timestamp;
    } else if (e.is_reachable && openStart !== null) {
      const startMs = new Date(openStart).getTime();
      const endMs = new Date(e.timestamp).getTime();
      out.push({ start: openStart, end: e.timestamp, durationMs: Math.max(0, endMs - startMs) });
      openStart = null;
    }
  }
  if (openStart !== null) {
    out.push({ start: openStart, end: null, durationMs: Date.now() - new Date(openStart).getTime() });
  }
  return out.sort((a, b) => b.durationMs - a.durationMs);
}

function perLocationSummary(
  rows: Array<{ device: DeviceMeta; agg: Aggregate; ok: boolean }>,
  _locations: LocationMeta[],
) {
  const map = new Map<string, {
    locationName: string;
    deviceCount: number;
    onlineNow: number;
    uptimeSum: number;
    uptimeCount: number;
    latencySum: number;
    latencyCount: number;
    totalIncidents: number;
  }>();
  for (const r of rows) {
    const name = r.device.location || "Unknown";
    let m = map.get(name);
    if (!m) {
      m = { locationName: name, deviceCount: 0, onlineNow: 0, uptimeSum: 0, uptimeCount: 0, latencySum: 0, latencyCount: 0, totalIncidents: 0 };
      map.set(name, m);
    }
    m.deviceCount += 1;
    if (r.device.is_reachable) m.onlineNow += 1;
    if (r.ok) {
      m.uptimeSum     += r.agg.uptimePct;
      m.uptimeCount   += 1;
      m.latencySum    += r.agg.avgLatency;
      m.latencyCount  += 1;
      m.totalIncidents += r.agg.incidentCount;
    }
  }
  return [...map.values()]
    .map((m) => ({
      locationName: m.locationName,
      deviceCount:  m.deviceCount,
      onlineNow:    m.onlineNow,
      avgUptime:    m.uptimeCount ? m.uptimeSum / m.uptimeCount : 0,
      avgLatency:   m.latencyCount ? m.latencySum / m.latencyCount : 0,
      totalIncidents: m.totalIncidents,
    }))
    .sort((a, b) => b.avgUptime - a.avgUptime);
}

// ──────────────────────────────────────────────────────────────────────────────
// PDF drawing helpers
// ──────────────────────────────────────────────────────────────────────────────

function drawHeader(doc: jsPDF, title: string, period: string, W: number) {
  // Top brand bar
  doc.setFillColor(11, 18, 32);
  doc.rect(0, 0, W, 70, "F");

  // Accent
  doc.setFillColor(34, 211, 238);
  doc.rect(0, 0, 4, 70, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("DWINMS", 40, 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("Network Operations Center", 40, 48);

  doc.setFontSize(11);
  doc.setTextColor(34, 211, 238);
  doc.text(title, W - 40, 32, { align: "right" });

  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(`Period: ${period}`, W - 40, 48, { align: "right" });
  doc.text(`Generated: ${new Date().toLocaleString()}`, W - 40, 62, { align: "right" });
}

function drawDeviceMetaBlock(doc: jsPDF, device: DeviceMeta, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.text(device.display || device.hostname || `Device #${device.id}`, 40, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const meta = [
    device.ip       ? `IP: ${device.ip}` : null,
    device.type     ? `Type: ${device.type}` : null,
    device.location ? `Location: ${device.location}` : null,
    device.area     ? `Area: ${device.area}` : null,
  ].filter(Boolean).join("    ·    ");
  doc.text(meta, 40, y + 14);
}

function drawSummaryStrip(
  doc: jsPDF, y: number, W: number,
  items: { label: string; value: string }[],
) {
  const colW = (W - 80) / items.length;
  items.forEach((item, i) => {
    const x = 40 + i * colW;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, colW - 8, 50, 6, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label.toUpperCase(), x + 10, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(item.value, x + 10, y + 38);
  });
}

interface Kpi { label: string; value: string; tint?: [number, number, number] }
function kpiTilesForAggregate(a: Aggregate, compact = false): Kpi[] {
  const base: Kpi[] = [
    { label: "Uptime",          value: fmtPct(a.uptimePct),       tint: tintUptime(a.uptimePct) },
    { label: "Checks",          value: fmt(a.totalChecks) },
    { label: "Outage events",   value: String(a.incidentCount),   tint: a.incidentCount > 0 ? [239,68,68] : [16,185,129] },
    { label: "Longest downtime",value: formatDuration(a.longestDowntimeMs), tint: [239,68,68] },
    { label: "Avg Latency",     value: fmtMs(a.avgLatency) },
    { label: "Max Latency",     value: fmtMs(a.maxLatency) },
    { label: "Avg Jitter",      value: fmtMs(a.avgJitter) },
    { label: "Avg Packet Loss", value: fmtPct(a.avgPacketLoss, 2),tint: a.avgPacketLoss > 1 ? [239,68,68] : [16,185,129] },
  ];
  return compact ? base.slice(0, 4) : base;
}

function drawKpiGrid(doc: jsPDF, y: number, W: number, kpis: Kpi[]): number {
  const cols = 4;
  const rows = Math.ceil(kpis.length / cols);
  const cellW = (W - 80) / cols;
  const cellH = 52;

  for (let i = 0; i < kpis.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = 40 + c * cellW;
    const yi = y + r * (cellH + 6);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, yi, cellW - 6, cellH, 6, 6, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, yi, cellW - 6, cellH, 6, 6, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpis[i].label.toUpperCase(), x + 10, yi + 16);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    if (kpis[i].tint) {
      const [rr, gg, bb] = kpis[i].tint!;
      doc.setTextColor(rr, gg, bb);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(kpis[i].value, x + 10, yi + 38);
  }
  return y + rows * (cellH + 6) + 8;
}

function drawNarrative(doc: jsPDF, y: number, W: number, text: string): number {
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(40, y, W - 80, 36, 4, 4, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(12, 74, 110);
  const lines = doc.splitTextToSize(text, W - 100);
  doc.text(lines, 50, y + 16);
  return y + 36 + 12;
}

function drawSectionTitle(doc: jsPDF, y: number, text: string): number {
  y = ensureSpace(doc, y, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(text, 40, y);
  doc.setDrawColor(34, 211, 238);
  doc.setLineWidth(1);
  doc.line(40, y + 4, 80, y + 4);
  return y + 16;
}

function drawAvailabilityChart(doc: jsPDF, y: number, W: number, history: HistoryEntry[], range: RangeKey): number {
  const h = 100;
  y = ensureSpace(doc, y, h + 20);
  const chartW = W - 80;
  const x0 = 40;

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.rect(x0, y, chartW, h, "FD");

  if (history.length === 0) {
    doc.setFontSize(9); doc.setTextColor(148, 163, 184);
    doc.text("No history available", x0 + chartW / 2 - 40, y + h / 2);
    return y + h + 12;
  }

  // Bucket by time
  const { start, end, granularity } = rangeToWindow(range);
  const bucketMs =
    granularity === "daily"  ? 24 * 60 * 60 * 1000 :
    granularity === "hourly" ? 60 * 60 * 1000 :
    5 * 60 * 1000;

  // ── Group probes by device, then walk forward to count device states ────
  //   Y-axis is "devices online", not raw probe counts.
  const byDevice = new Map<number, HistoryEntry[]>();
  for (const e of history) {
    const arr = byDevice.get(e.device_id) ?? [];
    arr.push(e);
    byDevice.set(e.device_id, arr);
  }
  type Track = { sorted: HistoryEntry[]; pointer: number; state: boolean | null };
  const tracks: Track[] = [];
  byDevice.forEach((arr) => {
    tracks.push({
      sorted: arr.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      pointer: 0,
      state: null,
    });
  });
  const deviceCount = tracks.length;

  const bucketStartTimes: number[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += bucketMs) {
    bucketStartTimes.push(Math.floor(t / bucketMs) * bucketMs);
  }
  if (bucketStartTimes.length === 0) return y + h + 12;

  const series = bucketStartTimes.map((bs) => {
    const bucketEnd = bs + bucketMs;
    let online = 0, offline = 0, noData = 0;
    for (const t of tracks) {
      while (t.pointer < t.sorted.length && new Date(t.sorted[t.pointer].timestamp).getTime() <= bucketEnd) {
        t.state = !!t.sorted[t.pointer].is_reachable;
        t.pointer++;
      }
      if (t.state === null) noData++;
      else if (t.state) online++;
      else offline++;
    }
    return { bucketStart: bs, online, offline, noData };
  });

  const maxY = Math.max(1, deviceCount);
  const innerH = h - 16;
  const barW = Math.max(1, (chartW - 8) / series.length - 1);

  series.forEach((s, i) => {
    const x = x0 + 4 + i * (barW + 1);
    const onlineH  = (s.online  / maxY) * innerH;
    const offlineH = (s.offline / maxY) * innerH;
    const noDataH  = (s.noData  / maxY) * innerH;

    // Online (bottom — green)
    if (onlineH > 0) {
      doc.setFillColor(16, 185, 129);
      doc.rect(x, y + h - 8 - onlineH, barW, onlineH, "F");
    }
    // Offline (middle — red)
    if (offlineH > 0) {
      doc.setFillColor(239, 68, 68);
      doc.rect(x, y + h - 8 - onlineH - offlineH, barW, offlineH, "F");
    }
    // No data (top — slate)
    if (noDataH > 0) {
      doc.setFillColor(100, 116, 139);
      doc.rect(x, y + h - 8 - onlineH - offlineH - noDataH, barW, noDataH, "F");
    }
  });

  // Y-axis hint (device count)
  doc.setFontSize(7); doc.setTextColor(100, 116, 139);
  doc.text(`${deviceCount} dev`, x0 + 4, y + 10);
  doc.text("0",                  x0 + 4, y + h - 2);

  // X-axis labels
  doc.text(formatBucketLabel(series[0].bucketStart, granularity), x0 + 4, y + h + 10);
  doc.text(formatBucketLabel(series[series.length - 1].bucketStart, granularity), x0 + chartW - 60, y + h + 10);

  // Legend
  doc.setFontSize(8);
  doc.setFillColor(16, 185, 129);
  doc.rect(x0 + chartW - 160, y - 12, 8, 8, "F"); doc.text("Online",  x0 + chartW - 148, y - 5);
  doc.setFillColor(239, 68, 68);
  doc.rect(x0 + chartW - 110, y - 12, 8, 8, "F"); doc.text("Offline", x0 + chartW - 98,  y - 5);
  doc.setFillColor(100, 116, 139);
  doc.rect(x0 + chartW - 60,  y - 12, 8, 8, "F"); doc.text("No data", x0 + chartW - 48,  y - 5);

  return y + h + 18;
}

function drawLatencyHistogram(doc: jsPDF, y: number, W: number, history: HistoryEntry[], agg: Aggregate): number {
  const h = 100;
  y = ensureSpace(doc, y, h + 20);
  const chartW = W - 80;
  const x0 = 40;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.rect(x0, y, chartW, h, "FD");

  const values = history.map((e) => e.latency_ms).filter((v): v is number => typeof v === "number" && !isNaN(v));
  if (values.length === 0) {
    doc.setFontSize(9); doc.setTextColor(148, 163, 184);
    doc.text("No latency samples", x0 + chartW / 2 - 40, y + h / 2);
    return y + h + 12;
  }

  // Bin
  const min0 = Math.min(...values);
  const max0 = Math.max(...values, 1);
  const bins = 20;
  const range = Math.max(1, max0 - min0);
  const step = range / bins;
  const counts = new Array(bins).fill(0);
  for (const v of values) {
    const i = Math.min(bins - 1, Math.floor((v - min0) / step));
    counts[i] += 1;
  }
  const maxC = Math.max(...counts);
  const barW = (chartW - 8) / bins - 1;

  for (let i = 0; i < bins; i++) {
    const x = x0 + 4 + i * (barW + 1);
    const bh = (counts[i] / maxC) * (h - 16);
    const center = min0 + i * step + step / 2;
    const [r, g, b] =
      center <= 80  ? [16, 185, 129] :
      center <= 120 ? [245, 158, 11] :
                      [239, 68, 68];
    doc.setFillColor(r, g, b);
    doc.rect(x, y + h - 8 - bh, Math.max(1, barW), bh, "F");
  }

  // Axis labels
  doc.setFontSize(7); doc.setTextColor(100, 116, 139);
  doc.text(`${min0.toFixed(0)} ms`, x0 + 4, y + h + 10);
  doc.text(`${max0.toFixed(0)} ms`, x0 + chartW - 40, y + h + 10);

  // Stat callouts
  doc.setFontSize(8); doc.setTextColor(71, 85, 105);
  doc.text(`avg ${fmtMs(agg.avgLatency)}    max ${fmtMs(agg.maxLatency)}    `, x0 + 4, y - 6);

  return y + h + 18;
}

function drawFooter(doc: jsPDF) {
  const pages = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(40, H - 30, W - 40, H - 30);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("DWINMS Report · confidential", 40, H - 16);
    doc.text(`Page ${i} of ${pages}`, W - 40, H - 16, { align: "right" });
  }
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const H = doc.internal.pageSize.getHeight();
  if (y + needed > H - 50) {
    doc.addPage();
    return 50;
  }
  return y;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function rangeToWindow(range: RangeKey): { start: Date; end: Date; granularity: Granularity } {
  const end = new Date();
  let start: Date;
  let granularity: Granularity;

  switch (range) {
    case "1h":
      start = new Date(end.getTime() - 60 * 60 * 1000);
      granularity = "raw";
      break;
    case "24h":
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      granularity = "hourly";
      break;
    case "1w":
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      granularity = "hourly";
      break;
    case "1m":
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      granularity = "daily";
      break;
    case "3m":
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      granularity = "daily";
      break;
  }
  return { start, end, granularity };
}

function rangeLabel(range: RangeKey): string {
  return RANGE_OPTIONS.find((r) => r.key === range)?.label ?? range;
}

function tintUptime(pct: number): [number, number, number] {
  if (pct >= 95) return [16, 185, 129];
  if (pct >= 80) return [245, 158, 11];
  return [239, 68, 68];
}

function avg(a: number[]) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
function max(a: number[]) { return a.length ? Math.max(...a) : 0; }
function min(a: number[]) { return a.length ? Math.min(...a) : 0; }
function percentile(a: number[], p: number) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const idx = Math.floor((p / 100) * (s.length - 1));
  return s[idx];
}
function weightedAvg(vals: number[], weights: number[]) {
  const totalW = weights.reduce((s, w) => s + w, 0);
  if (!totalW) return 0;
  return vals.reduce((s, v, i) => s + v * weights[i], 0) / totalW;
}

function fmt(n: number) { return n.toLocaleString(); }
function fmtPct(n: number, dp = 1) { return `${n.toFixed(dp)}%`; }
function fmtMs(n: number) { return n > 0 ? `${n.toFixed(1)} ms` : "—"; }

function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return "—";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${totalSec}s`;
}

function formatBucketLabel(t: number, granularity: Granularity): string {
  const d = new Date(t);
  if (granularity === "daily")  return d.toLocaleDateString();
  if (granularity === "hourly") return `${d.toLocaleDateString()} ${String(d.getHours()).padStart(2, "0")}:00`;
  return d.toLocaleTimeString();
}

function deviceNarrative(device: DeviceMeta, agg: Aggregate, range: RangeKey): string {
  const period = rangeLabel(range).toLowerCase();
  const name = device.display || device.hostname || `Device ${device.id}`;
  if (agg.totalChecks === 0) {
    return `No telemetry was recorded for ${name} during the ${period} window.`;
  }
  const reliability =
    agg.uptimePct >= 99 ? "highly reliable" :
    agg.uptimePct >= 95 ? "reliable" :
    agg.uptimePct >= 80 ? "intermittent" :
    "degraded";
  const latencyWord =
    agg.avgLatency <= 80  ? "excellent" :
    agg.avgLatency <= 120 ? "elevated"  :
    "high";
  const lossNote = agg.avgPacketLoss > 1
    ? ` Packet loss averaged ${fmtPct(agg.avgPacketLoss, 2)}, which exceeds the 1% acceptable threshold.`
    : ``;
  return `Over the ${period}, ${name} was ${reliability} with ${fmtPct(agg.uptimePct)} uptime across ${agg.totalChecks} checks. Latency was ${latencyWord} at an average of ${fmtMs(agg.avgLatency)}.${lossNote}`;
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function uniqueCount<T>(arr: (T | undefined | null)[]) {
  return new Set(arr.filter(Boolean)).size;
}
