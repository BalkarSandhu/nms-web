/**
 * ─────────────────────────────────────────────────────────────────────────────
 * NMS DOWNTIME REPORT GENERATOR
 * Generates professional PDF and Excel reports from live telemetry data.
 *
 * KEY FIX: jsPDF initialization with proper module handling
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type RangeKey = "1h" | "24h" | "1w" | "1m" | "3m";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "1h",  label: "Last 1 Hour"   },
  { key: "24h", label: "Last 24 Hours" },
  { key: "1w",  label: "Last 1 Week"   },
  { key: "1m",  label: "Last 1 Month"  },
  { key: "3m",  label: "Last 3 Months" },
];

export interface DeviceMeta {
  id: number | string;
  display?: string;
  hostname?: string;
  ip?: string;
  type?: string;
  location?: string;
  area?: string;
  is_reachable?: boolean;
}

export interface LocationMeta {
  id: number | string;
  name: string;
}

export interface AreaMeta {
  id: string;
  name: string;
}

export interface DowntimeReportPayload {
  title: string;
  subtitle?: string;
  range: RangeKey;
  generatedAt: Date;
  totalDevices: number;
  totalLocations: number;
  onlineNow: number;
  offlineNow: number;
  avgUptimePct: number;
  avgLatencyMs: number;
  totalOutageEvents: number;
  deviceRows: DeviceReportRow[];
  locationRows: LocationReportRow[];
}

export interface DeviceReportRow {
  rank: number;
  deviceName: string;
  ip: string;
  area: string;
  location: string;
  type: string;
  status: "Online" | "Offline" | "Unknown";
  uptimePct: number;
  downtimePct: number;
  outageEvents: number;
  avgLatencyMs: number;
  remarks?: string;
}

export interface LocationReportRow {
  rank: number;
  locationName: string;
  area: string;
  deviceCount: number;
  onlineCount: number;
  offlineCount: number;
  avgUptimePct: number;
  avgDowntimePct: number;
  totalOutageEvents: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RANGE_LABEL: Record<RangeKey, string> = {
  "1h": "Last 1 Hour", "24h": "Last 24 Hours",
  "1w": "Last 1 Week", "1m": "Last 1 Month", "3m": "Last 3 Months",
};

const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const fmtMs  = (n: number) => n > 0 ? `${n.toFixed(0)} ms` : "—";

function fmtDate(d: Date) {
  return d.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

type RGB = [number, number, number];

function uptimeColor(pct: number): RGB {
  if (pct >= 95) return [16, 185, 129];
  if (pct >= 80) return [245, 158, 11];
  return [239, 68, 68];
}

function downtimeColor(pct: number): RGB {
  if (pct <= 5)  return [16, 185, 129];
  if (pct <= 15) return [245, 158, 11];
  return [239, 68, 68];
}

// ════════════════════════════════════════════════════════════════════════════
// PDF REPORT
// ════════════════════════════════════════════════════════════════════════════

export async function generateDowntimePDF(payload: DowntimeReportPayload): Promise<void> {
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
  await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const PW      = doc.internal.pageSize.getWidth();   // 297
  const PH      = doc.internal.pageSize.getHeight();  // 210
  const MARGIN  = 12;
  const CW      = PW - MARGIN * 2;                    // 273

  // ─── Palette ──────────────────────────────────────────────────────────────
  const DARK_BG:  RGB = [13,  18,  30 ];
  const CARD_BG:  RGB = [20,  29,  47 ];
  const ACCENT:   RGB = [34,  211, 238];
  const TEXT_HI:  RGB = [241, 245, 249];
  const TEXT_LO:  RGB = [100, 116, 139];
  const BORDER:   RGB = [51,  65,  85 ];
  const RED:      RGB = [239, 68,  68 ];
  const EMERALD:  RGB = [16,  185, 129];

  // ─── Shared page decorator (call at start of each new page) ───────────────
  const decoratePage = (title: string, sub: string, pageNum: number) => {
    // Background
    doc.setFillColor(...DARK_BG);
    doc.rect(0, 0, PW, PH, "F");
    // Top accent bar
    doc.setFillColor(...ACCENT);
    doc.rect(0, 0, PW, 2, "F");
    // Header band
    doc.setFillColor(...CARD_BG);
    doc.rect(0, 2, PW, 18, "F");
    doc.setTextColor(...ACCENT);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(title, MARGIN, 14);
    doc.setTextColor(...TEXT_LO);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(sub, PW - MARGIN, 14, { align: "right" });
    // Footer band
    doc.setFillColor(...CARD_BG);
    doc.rect(0, PH - 10, PW, 10, "F");
    doc.setTextColor(...TEXT_LO);
    doc.setFontSize(6.5);
    doc.text(
      `CONFIDENTIAL — ${payload.title}  |  ${RANGE_LABEL[payload.range]}`,
      MARGIN, PH - 3.5,
    );
    doc.text(`Page ${pageNum}`, PW - MARGIN, PH - 3.5, { align: "right" });
  };

  // ═══════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════════════
  doc.setFillColor(...DARK_BG);
  doc.rect(0, 0, PW, PH, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, PW, 2, "F");

  // Left dark panel
  doc.setFillColor(...CARD_BG);
  doc.rect(0, 0, 96, PH, "F");

  // Left panel content
  doc.setTextColor(...ACCENT);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("DADHWAL NMS", MARGIN, 28);

  doc.setTextColor(...TEXT_HI);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("DOWNTIME", MARGIN, 46);
  doc.text("REPORT", MARGIN, 60);

  doc.setFillColor(...ACCENT);
  doc.rect(MARGIN, 66, 38, 1.5, "F");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_LO);
  doc.text("Scope", MARGIN, 78);
  doc.setTextColor(...TEXT_HI);
  doc.text(payload.title, MARGIN, 84, { maxWidth: 70 });

  if (payload.subtitle) {
    doc.setTextColor(...TEXT_LO);
    doc.text(payload.subtitle, MARGIN, 92, { maxWidth: 70 });
  }

  doc.setTextColor(...TEXT_LO);
  doc.text("Timeline", MARGIN, 106);
  doc.setTextColor(...ACCENT);
  doc.setFont("helvetica", "bold");
  doc.text(RANGE_LABEL[payload.range], MARGIN, 112);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_LO);
  doc.text("Generated", MARGIN, 124);
  doc.setTextColor(...TEXT_HI);
  doc.text(fmtDate(payload.generatedAt), MARGIN, 130, { maxWidth: 70 });

  // Right panel — KPI grid
  const RPX = 104;
  const RPW = PW - RPX - MARGIN;

  doc.setTextColor(...TEXT_HI);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", RPX, 22);
  doc.setFillColor(...ACCENT);
  doc.rect(RPX, 25, 28, 0.8, "F");

  interface KpiTile { label: string; value: string; sub?: string; color: RGB; }
  const kpis: KpiTile[] = [
    { label: "Total Devices",      value: String(payload.totalDevices),       sub: `${payload.onlineNow} online / ${payload.offlineNow} offline`, color: TEXT_HI },
    { label: "Total Locations",    value: String(payload.totalLocations),      sub: "in scope",              color: TEXT_HI },
    { label: "Avg Device Uptime",  value: fmtPct(payload.avgUptimePct),       sub: "across all devices",    color: uptimeColor(payload.avgUptimePct) },
    { label: "Total Outage Events",value: String(payload.totalOutageEvents),   sub: "offline probe count",   color: RED },
    { label: "Avg Latency",        value: fmtMs(payload.avgLatencyMs),         sub: "across all checks",     color: ACCENT },
    { label: "Devices Online",     value: String(payload.onlineNow),           sub: "as of report time",     color: EMERALD },
    { label: "Devices Offline",    value: String(payload.offlineNow),          sub: "as of report time",     color: RED },
    { label: "Report Period",      value: RANGE_LABEL[payload.range],          sub: fmtDate(payload.generatedAt), color: ACCENT },
  ];

  const COLS   = 4;
  const GAP    = 3;
  const tileW  = (RPW - GAP * (COLS - 1)) / COLS;
  const tileH  = 36;

  kpis.forEach((k, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const tx  = RPX + col * (tileW + GAP);
    const ty  = 30 + row * (tileH + GAP);

    doc.setFillColor(...CARD_BG);
    doc.roundedRect(tx, ty, tileW, tileH, 2, 2, "F");
    doc.setFillColor(...k.color);
    doc.roundedRect(tx, ty, 2.5, tileH, 1, 1, "F");

    doc.setTextColor(...TEXT_LO);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text(k.label.toUpperCase(), tx + 5, ty + 8);

    doc.setTextColor(...k.color);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(k.value, tx + 5, ty + 21);

    if (k.sub) {
      doc.setTextColor(...TEXT_LO);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.text(k.sub, tx + 5, ty + 30, { maxWidth: tileW - 7 });
    }
  });

  // Cover footer
  doc.setFillColor(...CARD_BG);
  doc.rect(0, PH - 10, PW, 10, "F");
  doc.setTextColor(...TEXT_LO);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(`CONFIDENTIAL — ${payload.title}  |  ${RANGE_LABEL[payload.range]}`, MARGIN, PH - 3.5);
  doc.text("Page 1", PW - MARGIN, PH - 3.5, { align: "right" });

  // ═══════════════════════════════════════════════════
  // PAGE 2 — VISUAL METRICS (4 bar charts)
  // ═══════════════════════════════════════════════════
  doc.addPage();
  decoratePage("DOWNTIME ANALYTICS", `${RANGE_LABEL[payload.range]}  ·  Top offenders at a glance`, 2);

  // ── Chart drawing primitives ─────────────────────────────────────────────

  /** Draw a horizontal bar chart card */
  const drawBarChart = (opts: {
    x: number; y: number; w: number; h: number;
    title: string; subtitle: string;
    items: { label: string; value: number; displayValue: string }[];
    barColor: (v: number, max: number) => RGB;
    unit: string;
    maxOverride?: number;
  }) => {
    const { x, y, w, h, title, subtitle, items, barColor, maxOverride } = opts;

    // Card background
    doc.setFillColor(...CARD_BG);
    doc.roundedRect(x, y, w, h, 3, 3, "F");

    // Card left accent strip
    doc.setFillColor(...ACCENT);
    doc.roundedRect(x, y, 2.5, h, 1.5, 1.5, "F");

    // Title
    doc.setTextColor(...ACCENT);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), x + 6, y + 7);

    // Subtitle
    doc.setTextColor(...TEXT_LO);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, x + 6, y + 12);

    if (items.length === 0) {
      doc.setTextColor(...TEXT_LO);
      doc.setFontSize(7);
      doc.text("No data", x + w / 2, y + h / 2, { align: "center" });
      return;
    }

    const maxVal  = maxOverride ?? Math.max(...items.map((i) => i.value), 1);
    const barAreaX = x + 6;
    const barAreaW = w - 12;
    const labelW   = 52; // px for name label on left
    const valueW   = 18; // px for value label on right
    const barW     = barAreaW - labelW - valueW - 4;

    const rowH    = (h - 20) / items.length;
    const barH    = Math.min(rowH * 0.52, 6);

    items.forEach((item, idx) => {
      const ry      = y + 18 + idx * rowH;
      const midY    = ry + rowH / 2;
      const fillPct = Math.max(0, Math.min(1, item.value / maxVal));
      const bx      = barAreaX + labelW + 2;
      const filledW = Math.max(1, fillPct * barW);
      const color   = barColor(item.value, maxVal);

      // Label (truncated)
      doc.setTextColor(...TEXT_HI);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      const label = item.label.length > 22 ? item.label.slice(0, 21) + "…" : item.label;
      doc.text(label, barAreaX, midY + 1.5);

      // Bar track
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(bx, midY - barH / 2, barW, barH, 1, 1, "F");

      // Bar fill
      doc.setFillColor(...color);
      doc.roundedRect(bx, midY - barH / 2, filledW, barH, 1, 1, "F");

      // Value label
      doc.setTextColor(...color);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.text(item.displayValue, bx + barW + 2, midY + 1.5);
    });
  };

  // ── Top 8 data slices ────────────────────────────────────────────────────

  const TOP_N = 8;

  const devByDowntime = [...payload.deviceRows]
    .sort((a, b) => b.downtimePct - a.downtimePct)
    .slice(0, TOP_N)
    .map((r) => ({ label: r.deviceName, value: r.downtimePct,   displayValue: `${r.downtimePct}%` }));

  const devByOutages = [...payload.deviceRows]
    .sort((a, b) => b.outageEvents - a.outageEvents)
    .slice(0, TOP_N)
    .map((r) => ({ label: r.deviceName, value: r.outageEvents,  displayValue: String(r.outageEvents) }));

  const locByDowntime = [...payload.locationRows]
    .sort((a, b) => b.avgDowntimePct - a.avgDowntimePct)
    .slice(0, TOP_N)
    .map((r) => ({ label: r.locationName, value: r.avgDowntimePct,    displayValue: `${r.avgDowntimePct}%` }));

  const locByOutages = [...payload.locationRows]
    .sort((a, b) => b.totalOutageEvents - a.totalOutageEvents)
    .slice(0, TOP_N)
    .map((r) => ({ label: r.locationName, value: r.totalOutageEvents, displayValue: String(r.totalOutageEvents) }));

  // ── Layout: 2 columns × 2 rows ───────────────────────────────────────────
  const chartY1   = 24;
  const chartY2   = 24 + (PH - 24 - 14) / 2 + 2;
  const chartH    = (PH - 24 - 14) / 2 - 4;
  const chartW    = (CW - 4) / 2;
  const chartX1   = MARGIN;
  const chartX2   = MARGIN + chartW + 4;

  const dtColor = (v: number, max: number): RGB => {
    const pct = max > 0 ? (v / max) * 100 : 0;
    if (pct <= 33) return EMERALD;
    if (pct <= 66) return [245, 158, 11];
    return RED;
  };
  const outageColor = (): RGB => [245, 158, 11];

  drawBarChart({
    x: chartX1, y: chartY1, w: chartW, h: chartH,
    title: "Devices — Longest Downtime",
    subtitle: `Top ${devByDowntime.length} devices by downtime percentage`,
    items: devByDowntime,
    barColor: dtColor,
    unit: "%",
    maxOverride: 100,
  });

  drawBarChart({
    x: chartX2, y: chartY1, w: chartW, h: chartH,
    title: "Devices — Most Outage Events",
    subtitle: `Top ${devByOutages.length} devices by number of offline probes`,
    items: devByOutages,
    barColor: outageColor,
    unit: "events",
  });

  drawBarChart({
    x: chartX1, y: chartY2, w: chartW, h: chartH,
    title: "Locations — Longest Downtime",
    subtitle: `Top ${locByDowntime.length} locations by avg downtime percentage`,
    items: locByDowntime,
    barColor: dtColor,
    unit: "%",
    maxOverride: 100,
  });

  drawBarChart({
    x: chartX2, y: chartY2, w: chartW, h: chartH,
    title: "Locations — Most Outage Events",
    subtitle: `Top ${locByOutages.length} locations by total outage events`,
    items: locByOutages,
    barColor: outageColor,
    unit: "events",
  });

  // ── Legend strip at bottom of chart page ─────────────────────────────────
  const legY = PH - 13;
  doc.setFillColor(20, 29, 47);
  doc.rect(MARGIN, legY - 2, CW, 5, "F");
  const legends: [RGB, string][] = [
    [EMERALD,        "Low downtime (≤ 33% of max)"],
    [[245, 158, 11], "Medium downtime"],
    [RED,            "High downtime (> 66% of max)"],
    [[245, 158, 11], "Outage event count"],
  ];
  const legXStep = CW / legends.length;
  legends.forEach(([color, label], i) => {
    const lx = MARGIN + i * legXStep;
    doc.setFillColor(...color);
    doc.roundedRect(lx, legY - 0.5, 3, 3, 0.5, 0.5, "F");
    doc.setTextColor(...TEXT_LO);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text(label, lx + 4.5, legY + 2);
  });

  // ═══════════════════════════════════════════════════
  // PAGE 3+ — DEVICE DOWNTIME TABLE
  // ═══════════════════════════════════════════════════
  doc.addPage();

  // Track page counter across autoTable continuation pages
  let devPageNum = 3;

  // Draw first table-page header immediately (before autoTable)
  decoratePage(
    "DEVICE DOWNTIME ANALYSIS",
    `${RANGE_LABEL[payload.range]}  ·  ${payload.deviceRows.length} devices`,
    devPageNum,
  );

  // Column widths must sum ≤ CW (273 mm). Sum below = 8+38+26+24+30+16+16+16+16+12+18 = 220 → safe
  const devColWidths = [8, 38, 26, 24, 30, 16, 16, 16, 16, 12, 18];

  const devHeaders = ["#", "Device Name", "IP Address", "Area", "Location", "Type", "Status", "Uptime %", "Downtime %", "Events", "Latency"];
  const devBody    = payload.deviceRows.map((r) => [
    r.rank, r.deviceName, r.ip || "—", r.area || "N/A",
    r.location || "—", r.type || "—", r.status,
    fmtPct(r.uptimePct), fmtPct(r.downtimePct), r.outageEvents, fmtMs(r.avgLatencyMs),
  ]);

  (doc as any).autoTable({
    startY: 24,
    head: [devHeaders],
    body: devBody,
    margin: { left: MARGIN, right: MARGIN, top: 24, bottom: 14 },
    tableWidth: "wrap",
    styles: {
      font: "helvetica",
      fontSize: 6.5,
      cellPadding: 2,
      textColor: [...TEXT_HI],
      fillColor: [...DARK_BG],
      lineColor: [...BORDER],
      lineWidth: 0.15,
      overflow: "ellipsize",
      cellWidth: "wrap",
    },
    headStyles: {
      fillColor: [...CARD_BG],
      textColor: [...ACCENT],
      fontStyle: "bold",
      fontSize: 6.5,
      cellPadding: 2.5,
    },
    alternateRowStyles: { fillColor: [17, 24, 39] },
    columnStyles: {
      0:  { halign: "center", cellWidth: devColWidths[0]  },
      1:  { cellWidth: devColWidths[1]  },
      2:  { cellWidth: devColWidths[2]  },
      3:  { cellWidth: devColWidths[3]  },
      4:  { cellWidth: devColWidths[4]  },
      5:  { halign: "center", cellWidth: devColWidths[5]  },
      6:  { halign: "center", cellWidth: devColWidths[6]  },
      7:  { halign: "right",  cellWidth: devColWidths[7]  },
      8:  { halign: "right",  cellWidth: devColWidths[8]  },
      9:  { halign: "right",  cellWidth: devColWidths[9]  },
      10: { halign: "right",  cellWidth: devColWidths[10] },
    },
    didParseCell: (data: any) => {
      if (data.section !== "body") return;
      const row = payload.deviceRows[data.row.index];
      if (!row) return;
      if (data.column.index === 6) {
        data.cell.styles.textColor = row.status === "Online" ? [...EMERALD] : row.status === "Offline" ? [...RED] : [...TEXT_LO];
        data.cell.styles.fontStyle = "bold";
      }
      if (data.column.index === 7) { data.cell.styles.textColor = [...uptimeColor(row.uptimePct)];   data.cell.styles.fontStyle = "bold"; }
      if (data.column.index === 8) { data.cell.styles.textColor = [...downtimeColor(row.downtimePct)]; data.cell.styles.fontStyle = "bold"; }
    },
    // willDrawPage fires BEFORE autoTable draws content — safe for backgrounds
    willDrawPage: (data: any) => {
      if (data.pageNumber === 1) return; // first table page already decorated above
      devPageNum++;
      decoratePage(
        "DEVICE DOWNTIME ANALYSIS (cont.)",
        `${RANGE_LABEL[payload.range]}  ·  ${payload.deviceRows.length} devices`,
        devPageNum,
      );
    },
  });

  // ═══════════════════════════════════════════════════
  // LOCATION SUMMARY TABLE
  // ═══════════════════════════════════════════════════
  doc.addPage();

  let locPageNum = devPageNum + 1;

  decoratePage(
    "LOCATION DOWNTIME SUMMARY",
    `${RANGE_LABEL[payload.range]}  ·  ${payload.locationRows.length} locations`,
    locPageNum,
  );

  // Column widths: 8+52+36+16+14+14+20+20+20 = 200 → safe
  const locHeaders = ["#", "Location Name", "Area", "Devices", "Online", "Offline", "Avg Uptime", "Avg Downtime", "Outages"];
  const locBody    = payload.locationRows.map((r) => [
    r.rank, r.locationName, r.area || "N/A",
    r.deviceCount, r.onlineCount, r.offlineCount,
    fmtPct(r.avgUptimePct), fmtPct(r.avgDowntimePct), r.totalOutageEvents,
  ]);

  (doc as any).autoTable({
    startY: 24,
    head: [locHeaders],
    body: locBody,
    margin: { left: MARGIN, right: MARGIN, top: 24, bottom: 14 },
    tableWidth: "wrap",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 2.2,
      textColor: [...TEXT_HI],
      fillColor: [...DARK_BG],
      lineColor: [...BORDER],
      lineWidth: 0.15,
      overflow: "ellipsize",
    },
    headStyles: {
      fillColor: [...CARD_BG],
      textColor: [...ACCENT],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2.5,
    },
    alternateRowStyles: { fillColor: [17, 24, 39] },
    columnStyles: {
      0: { halign: "center", cellWidth: 8  },
      1: { cellWidth: 56 },
      2: { cellWidth: 38 },
      3: { halign: "center", cellWidth: 16 },
      4: { halign: "center", cellWidth: 15 },
      5: { halign: "center", cellWidth: 15 },
      6: { halign: "right",  cellWidth: 22 },
      7: { halign: "right",  cellWidth: 22 },
      8: { halign: "right",  cellWidth: 18 },
    },
    didParseCell: (data: any) => {
      if (data.section !== "body") return;
      const row = payload.locationRows[data.row.index];
      if (!row) return;
      if (data.column.index === 4) data.cell.styles.textColor = [...EMERALD];
      if (data.column.index === 5) data.cell.styles.textColor = [...RED];
      if (data.column.index === 6) { data.cell.styles.textColor = [...uptimeColor(row.avgUptimePct)];   data.cell.styles.fontStyle = "bold"; }
      if (data.column.index === 7) { data.cell.styles.textColor = [...downtimeColor(row.avgDowntimePct)]; data.cell.styles.fontStyle = "bold"; }
    },
    willDrawPage: (data: any) => {
      if (data.pageNumber === 1) return;
      locPageNum++;
      decoratePage(
        "LOCATION DOWNTIME SUMMARY (cont.)",
        `${RANGE_LABEL[payload.range]}  ·  ${payload.locationRows.length} locations`,
        locPageNum,
      );
    },
  });

  const safeName = payload.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`NMS_Downtime_${safeName}_${payload.range}.pdf`);
}

// ════════════════════════════════════════════════════════════════════════════
// EXCEL REPORT
// ════════════════════════════════════════════════════════════════════════════

export async function generateDowntimeExcel(payload: DowntimeReportPayload): Promise<void> {
  const XLSX = await import("xlsx");
  const wb   = XLSX.utils.book_new();

  const summaryData: (string | number)[][] = [
    ["NMS DOWNTIME REPORT"],
    [""],
    ["Report Title",        payload.title],
    ["Timeline",            RANGE_LABEL[payload.range]],
    ["Generated At",        fmtDate(payload.generatedAt)],
    [""],
    ["── KPI SUMMARY ──"],
    ["Metric", "Value"],
    ["Total Devices",       payload.totalDevices],
    ["Total Locations",     payload.totalLocations],
    ["Devices Online Now",  payload.onlineNow],
    ["Devices Offline Now", payload.offlineNow],
    ["Avg Device Uptime %", Number(payload.avgUptimePct.toFixed(2))],
    ["Avg Latency (ms)",    Number(payload.avgLatencyMs.toFixed(1))],
    ["Total Outage Events", payload.totalOutageEvents],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 28 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  const devHeader = ["#", "Device Name", "IP Address", "Area", "Location", "Device Type", "Status", "Uptime %", "Downtime %", "Outage Events", "Avg Latency (ms)"];
  const devRows   = payload.deviceRows.map((r) => [
    r.rank, r.deviceName, r.ip || "", r.area || "", r.location || "", r.type || "",
    r.status, Number(r.uptimePct.toFixed(2)), Number(r.downtimePct.toFixed(2)),
    r.outageEvents, Number(r.avgLatencyMs.toFixed(1)),
  ]);
  const wsDevices = XLSX.utils.aoa_to_sheet([devHeader, ...devRows]);
  wsDevices["!cols"] = [
    { wch: 5 }, { wch: 30 }, { wch: 16 }, { wch: 20 }, { wch: 26 },
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDevices, "Device Downtime");

  const locHeader = ["#", "Location Name", "Area", "Total Devices", "Online", "Offline", "Avg Uptime %", "Avg Downtime %", "Total Outage Events"];
  const locRows   = payload.locationRows.map((r) => [
    r.rank, r.locationName, r.area || "", r.deviceCount,
    r.onlineCount, r.offlineCount,
    Number(r.avgUptimePct.toFixed(2)), Number(r.avgDowntimePct.toFixed(2)),
    r.totalOutageEvents,
  ]);
  const wsLocations = XLSX.utils.aoa_to_sheet([locHeader, ...locRows]);
  wsLocations["!cols"] = [
    { wch: 5 }, { wch: 36 }, { wch: 24 }, { wch: 14 },
    { wch: 10 }, { wch: 10 }, { wch: 13 }, { wch: 15 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsLocations, "Location Summary");

  const safeName = payload.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  XLSX.writeFile(wb, `NMS_Downtime_${safeName}_${payload.range}.xlsx`);
}

// ════════════════════════════════════════════════════════════════════════════
// CONVENIENCE BUILDER
// ════════════════════════════════════════════════════════════════════════════

export interface RawReportInput {
  title: string;
  subtitle?: string;
  range: RangeKey;
  devices: any[];
  locations: any[];
  perDevice: Array<{
    device: any;
    agg: { uptimePct: number; avgLatency: number; totalChecks: number; onlineChecks: number; incidentCount: number };
    history: Array<{ is_reachable: boolean; timestamp: string; latency_ms?: number }>;
    lastState: boolean | null;
  }>;
  format: "pdf" | "excel";
}

export async function buildAndExportReport(
  input: RawReportInput,
  onProgress?: (msg: string) => void,
): Promise<void> {
  onProgress?.("Building report data…");

  const deviceRows: DeviceReportRow[] = input.perDevice
    .filter((p) => p.agg.totalChecks > 0 || p.lastState !== null)
    .map((p) => {
      const d           = p.device;
      const offlineCount = p.history.filter((h) => !h.is_reachable).length;
      const totalProbes  = p.history.length || 1;
      return {
        rank: 0,
        deviceName:   d.display || d.hostname || `Device ${d.id}`,
        ip:           d.ip_address || d.ip || "",
        area:         d.worker?.name || d.location?.area || "",
        location:     d.location?.name || "",
        type:         d.device_type?.name || d.type || "",
        status:       (p.lastState === true ? "Online" : p.lastState === false ? "Offline" : "Unknown") as DeviceReportRow["status"],
        uptimePct:    parseFloat(p.agg.uptimePct.toFixed(1)),
        downtimePct:  parseFloat(((offlineCount / totalProbes) * 100).toFixed(1)),
        outageEvents: offlineCount,
        avgLatencyMs: parseFloat((p.agg.avgLatency || 0).toFixed(1)),
        remarks: "",
      };
    })
    .sort((a, b) => b.downtimePct - a.downtimePct)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const locMap = new Map<string, {
    name: string; area: string;
    deviceCount: number; onlineCount: number; offlineCount: number;
    uptimeSum: number; uptimeCount: number; downtimeSum: number; totalOutages: number;
  }>();

  for (const p of input.perDevice) {
    const d      = p.device;
    const locObj = input.locations.find((l: any) => String(l.id) === String(d.location_id));
    const name   = d.location?.name || locObj?.name || "Unknown";
    let m        = locMap.get(name);
    if (!m) {
      m = { name, area: locObj?.area || d.location?.area || d.worker?.name || "",
            deviceCount: 0, onlineCount: 0, offlineCount: 0,
            uptimeSum: 0, uptimeCount: 0, downtimeSum: 0, totalOutages: 0 };
      locMap.set(name, m);
    }
    m.deviceCount++;
    if (p.lastState === true)  m.onlineCount++;
    if (p.lastState === false) m.offlineCount++;
    if (p.agg.totalChecks > 0) {
      m.uptimeSum   += p.agg.uptimePct;
      m.downtimeSum += (100 - p.agg.uptimePct);
      m.uptimeCount++;
    }
    m.totalOutages += p.history.filter((h) => !h.is_reachable).length;
  }

  const locationRows: LocationReportRow[] = [...locMap.values()]
    .map((m) => ({
      rank: 0,
      locationName:      m.name,
      area:              m.area,
      deviceCount:       m.deviceCount,
      onlineCount:       m.onlineCount,
      offlineCount:      m.offlineCount,
      avgUptimePct:      m.uptimeCount ? parseFloat((m.uptimeSum / m.uptimeCount).toFixed(1)) : 0,
      avgDowntimePct:    m.uptimeCount ? parseFloat((m.downtimeSum / m.uptimeCount).toFixed(1)) : 0,
      totalOutageEvents: m.totalOutages,
    }))
    .sort((a, b) => b.avgDowntimePct - a.avgDowntimePct)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // Calculate totals from SCOPED data only
  const withData    = input.perDevice.filter((p) => p.agg.totalChecks > 0);
  const withLatency = input.perDevice.filter((p) => p.agg.avgLatency > 0);
  const onlineNow   = input.devices.filter((d: any) => d.is_reachable).length;
  const offlineNow  = input.devices.filter((d: any) => !d.is_reachable).length;

  const payload: DowntimeReportPayload = {
    title:             input.title,
    subtitle:          input.subtitle,
    range:             input.range,
    generatedAt:       new Date(),
    totalDevices:      input.devices.length,
    totalLocations:    input.locations.length,
    onlineNow,
    offlineNow,
    avgUptimePct:      withData.length   ? parseFloat((withData.reduce((s, p) => s + p.agg.uptimePct, 0) / withData.length).toFixed(1))     : 0,
    avgLatencyMs:      withLatency.length ? parseFloat((withLatency.reduce((s, p) => s + p.agg.avgLatency, 0) / withLatency.length).toFixed(1)) : 0,
    totalOutageEvents: deviceRows.reduce((s, r) => s + r.outageEvents, 0),
    deviceRows,
    locationRows,
  };

  if (input.format === "pdf") {
    onProgress?.("Generating PDF…");
    await generateDowntimePDF(payload);
  } else {
    onProgress?.("Generating Excel…");
    await generateDowntimeExcel(payload);
  }
  onProgress?.("Report downloaded.");
}