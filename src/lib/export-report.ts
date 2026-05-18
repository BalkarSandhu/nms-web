import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { CsvColumn } from "./utils";

/** Human-readable timestamp for the report footer. */
export function formatGeneratedAt(d: Date = new Date()): string {
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function cellValue<T>(col: CsvColumn<T>, row: T, index: number): string {
  const raw =
    typeof col.accessor === "function"
      ? col.accessor(row, index)
      : (row as Record<string, unknown>)[col.accessor as string];
  return raw === null || raw === undefined ? "" : String(raw);
}

/** One line of the hierarchical topology section (drawn before the table). */
export type TopoLine = { label: string; depth: number; status?: string };

function statusRgb(status?: string): [number, number, number] {
  if (status === "online") return [16, 185, 129];
  if (status === "offline") return [239, 68, 68];
  if (status === "partial") return [245, 158, 11];
  return [100, 116, 139];
}

/**
 * Export rows to a professionally laid-out PDF.
 * Mirrors the `exportToCsv` signature so callers can reuse the same columns.
 * `opts.topology` renders a hierarchy section ABOVE the table.
 */
export function exportToPdf<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
  opts: { title?: string; topology?: TopoLine[] } = {}
): void {
  if (typeof window === "undefined" || !rows.length || !columns.length) return;

  const title = opts.title ?? "Report";
  const generatedAt = formatGeneratedAt();

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const head = [columns.map((c) => c.header)];
  const body = rows.map((row, index) => columns.map((col) => cellValue(col, row, index)));

  // ── Topology section (first), then the table below it ──
  let tableStartY = 84;
  const topo = opts.topology ?? [];
  if (topo.length) {
    let y = 80;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("NETWORK TOPOLOGY", 36, y);
    y += 6;
    doc.setDrawColor(34, 211, 238);
    doc.setLineWidth(1.5);
    doc.line(36, y, 170, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const line of topo) {
      if (y > H - 60) {
        doc.addPage();
        y = 84;
      }
      const x = 40 + line.depth * 16;
      const [r, g, b] = statusRgb(line.status);
      doc.setFillColor(r, g, b);
      doc.circle(x, y - 3, 2.2, "F");
      doc.setTextColor(line.depth === 0 ? 15 : 71, line.depth === 0 ? 23 : 85, line.depth === 0 ? 42 : 105);
      doc.setFont("helvetica", line.depth === 0 ? "bold" : "normal");
      doc.text(line.label, x + 8, y);
      if (line.status) {
        doc.setTextColor(r, g, b);
        doc.setFont("helvetica", "bold");
        doc.text(line.status.toUpperCase(), W - 36, y, { align: "right" });
      }
      y += 15;
    }
    tableStartY = y + 14;
  }

  autoTable(doc, {
    head,
    body,
    startY: tableStartY,
    margin: { top: 84, left: 36, right: 36, bottom: 52 },
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 6,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "left",
    },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    // Branded header on every page.
    didDrawPage: () => {
      doc.setFillColor(11, 18, 32);
      doc.rect(0, 0, W, 62, "F");
      doc.setFillColor(34, 211, 238);
      doc.rect(0, 0, 4, 62, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("DWINMS", 36, 27);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Network Operations Center", 36, 43);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(34, 211, 238);
      doc.text(title, W - 36, 28, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(226, 232, 240);
      doc.text(
        `${rows.length} record${rows.length !== 1 ? "s" : ""}`,
        W - 36,
        44,
        { align: "right" }
      );
    },
  });

  // Footer with the generation timestamp + page numbers (totals now known).
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(36, H - 34, W - 36, H - 34);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${generatedAt}`, 36, H - 20);
    doc.text(`Page ${p} of ${totalPages}`, W - 36, H - 20, { align: "right" });
  }

  doc.save(filename);
}
