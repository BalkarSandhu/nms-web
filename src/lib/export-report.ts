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

  // ── Topology — top-down tree (parent on top, children branching below) ──
  let tableStartY = 84;
  const topo = opts.topology ?? [];
  if (topo.length) {
    type Grp = { root: TopoLine; children: TopoLine[] };
    const groups: Grp[] = [];
    for (const ln of topo) {
      if (ln.depth === 0) {
        groups.push({ root: ln, children: [] });
      } else {
        if (groups.length === 0) {
          groups.push({ root: { label: "Topology", depth: 0 }, children: [] });
        }
        groups[groups.length - 1].children.push(ln);
      }
    }

    const LEFT = 36;
    const RIGHT = W - 36;
    const CX = (LEFT + RIGHT) / 2;        // page horizontal centre
    const NODE_W = 132;
    const NODE_H = 26;
    const COL_GAP = 16;
    const ROW_GAP = 30;
    const STUB = 16;                      // parent → bus vertical
    const BOTTOM = H - 46;
    const perRow = Math.max(
      1,
      Math.floor((RIGHT - LEFT + COL_GAP) / (NODE_W + COL_GAP)),
    );

    const drawTopoHeader = () => {
      doc.setFillColor(11, 18, 32);
      doc.rect(0, 0, W, 50, "F");
      doc.setFillColor(34, 211, 238);
      doc.rect(0, 0, 4, 50, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("DWINMS", LEFT, 22);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Network Operations Center", LEFT, 37);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(34, 211, 238);
      doc.text(`${title} — Network Topology`, RIGHT, 30, { align: "right" });
    };

    const truncate = (text: string, maxW: number) => {
      if (doc.getTextWidth(text) <= maxW) return text;
      let t = text;
      while (t.length > 1 && doc.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
      return t + "…";
    };

    const node = (
      x: number, y: number, w: number,
      label: string, status: string | undefined, root: boolean,
    ) => {
      const [r, g, b] = statusRgb(status);
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(root ? 1.2 : 0.8);
      // opaque fill so connector lines passing behind are hidden
      doc.setFillColor(root ? 226 : 244, root ? 240 : 248, root ? 247 : 251);
      doc.roundedRect(x, y, w, NODE_H, 3, 3, "FD");
      doc.setFillColor(r, g, b);
      doc.circle(x + 9, y + NODE_H / 2, 3, "F");
      doc.setFont("helvetica", root ? "bold" : "normal");
      doc.setFontSize(root ? 9 : 8);
      doc.setTextColor(15, 23, 42);
      doc.text(truncate(label, w - 24), x + 16, y + NODE_H / 2 + 3.2);
    };

    drawTopoHeader();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    let y = 66;
    doc.text("NETWORK TOPOLOGY", LEFT, y);
    y += 16;

    type Pos = { x: number; y: number; c: TopoLine };

    for (const grp of groups) {
      const n = grp.children.length;
      const rows = Math.max(1, Math.ceil(n / perRow));
      const blockH =
        NODE_H + STUB + 12 + rows * NODE_H + (rows - 1) * ROW_GAP + 22;

      // Page-break at the group boundary (keep each tree intact).
      if (y > 90 && y + Math.min(blockH, BOTTOM - 60) > BOTTOM) {
        doc.addPage();
        drawTopoHeader();
        y = 60;
      }

      const rootX = CX - NODE_W / 2;
      const rootY = y;
      const rootBottom = rootY + NODE_H;
      const busY = rootBottom + STUB;
      const firstRowY = busY + 12;

      // Child positions — each row centred under the parent.
      const positions: Pos[] = [];
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / perRow);
        const idxInRow = i % perRow;
        const rowCount = Math.min(perRow, n - r * perRow);
        const rowW = rowCount * NODE_W + (rowCount - 1) * COL_GAP;
        const startX = CX - rowW / 2;
        positions.push({
          x: startX + idxInRow * (NODE_W + COL_GAP),
          y: firstRowY + r * (NODE_H + ROW_GAP),
          c: grp.children[i],
        });
      }

      // Phase 1 — connectors (boxes drawn afterwards occlude crossings).
      if (n > 0) {
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.7);
        doc.line(CX, rootBottom, CX, busY);                 // trunk
        const firstRow = positions.slice(0, Math.min(perRow, n));
        const centres = firstRow.map((p) => p.x + NODE_W / 2);
        doc.line(Math.min(CX, ...centres), busY, Math.max(CX, ...centres), busY); // bus
        for (const p of positions) {
          const ccx = p.x + NODE_W / 2;
          doc.line(ccx, busY, ccx, p.y);                    // drop to child
        }
      }

      // Phase 2 — opaque boxes on top.
      node(rootX, rootY, NODE_W, grp.root.label, grp.root.status, true);
      for (const p of positions) {
        node(p.x, p.y, NODE_W, p.c.label, p.c.status, false);
      }

      const lastY = positions.length
        ? positions[positions.length - 1].y + NODE_H
        : rootBottom;
      y = lastY + 24;
    }

    tableStartY = y + 12;
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
