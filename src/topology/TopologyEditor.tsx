'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
  AlertCircle, RefreshCw, Network, Search,
  Signal, X, Info, Cpu, Clock, Hash, MapPin, Layers,
  Grid3x3, ArrowLeft, LayoutGrid,
} from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import AreaSummary from './AreaSummary';
import ClusterView from './ClusterView';

/* ─── Types ──────────────────────────────────────────────── */
interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  status: 'online' | 'offline' | 'unknown' | 'partial';
  project: string;
  area: string;
  description?: string;
  device_count?: number;
  online_device_count?: number;
  offline_device_count?: number;
  health_percentage?: number;
  children?: Location[];
  worker_id?: string;
  created_at?: string;
  updated_at?: string;
  status_reason?: string;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  data: Location & { level: number };
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
}

/* ─── Status config (aligned to dashboard tokens) ───────── */
const STATUS = {
  online:  { hex: '#10B981', glow: 'rgba(16,185,129,0.55)',  border: 'rgba(16,185,129,0.4)',  bg: 'rgba(16,185,129,0.08)',  text: '#34D399', label: 'ONLINE'  },
  offline: { hex: '#EF4444', glow: 'rgba(239,68,68,0.65)',   border: 'rgba(239,68,68,0.45)',  bg: 'rgba(239,68,68,0.08)',   text: '#F87171', label: 'OFFLINE' },
  partial: { hex: '#F59E0B', glow: 'rgba(245,158,11,0.55)',  border: 'rgba(245,158,11,0.42)', bg: 'rgba(245,158,11,0.08)',  text: '#FBBF24', label: 'PARTIAL' },
  unknown: { hex: '#64748B', glow: 'rgba(100,116,139,0.35)', border: 'rgba(100,116,139,0.3)', bg: 'rgba(100,116,139,0.08)', text: '#94A3B8', label: 'UNKNOWN' },
};
const BRAND = '#22D3EE';
const BRAND_STRONG = '#06B6D4';
const getS = (s: string) => STATUS[s as keyof typeof STATUS] ?? STATUS.unknown;

/* ─── Node card dimensions ───────────────────────────────── */
const NODE_W  = 230;
const getNodeH = (d: GraphNode) => {
  let h = 98;
  if (d.data.device_count      !== undefined) h += 52;
  if (d.data.health_percentage !== undefined) h += 34;
  return h;
};

/* ─── Flatten nested tree → flat arrays ─────────────────── */
function flattenTree(
  locs: Location[],
  level = 0,
  parentId?: string,
): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  for (const loc of locs) {
    const nid = `n-${loc.id}`;
    nodes.push({ id: nid, data: { ...loc, level } });
    if (parentId) links.push({ id: `l-${parentId}-${nid}`, source: parentId, target: nid });
    if (loc.children?.length) {
      const sub = flattenTree(loc.children, level + 1, nid);
      nodes.push(...sub.nodes);
      links.push(...sub.links);
    }
  }
  return { nodes, links };
}

/* ─── Hierarchical pre-layout ────────────────────────────── */
function applyHierarchicalLayout(nodes: GraphNode[], links: GraphLink[]) {
  const LEVEL_GAP   = 270;
  const SIBLING_GAP = 290;

  const childrenMap = new Map<string, string[]>();
  const parentMap   = new Map<string, string>();
  nodes.forEach(n => childrenMap.set(n.id, []));
  links.forEach(l => {
    const s = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
    const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
    childrenMap.get(s)?.push(t);
    parentMap.set(t, s);
  });

  const roots = nodes.filter(n => !parentMap.has(n.id));
  let xCursor = 0;

  function place(id: string, depth: number): number {
    const kids = childrenMap.get(id) ?? [];
    if (!kids.length) {
      const n = nodes.find(n => n.id === id)!;
      n.fx = xCursor; n.fy = depth * LEVEL_GAP; n.x = n.fx; n.y = n.fy;
      const x = xCursor; xCursor += SIBLING_GAP; return x;
    }
    const xs = kids.map(k => place(k, depth + 1));
    const cx = (xs[0] + xs[xs.length - 1]) / 2;
    const n = nodes.find(n => n.id === id)!;
    n.fx = cx; n.fy = depth * LEVEL_GAP; n.x = cx; n.y = n.fy;
    return cx;
  }
  roots.forEach(r => place(r.id, 0));
}

/* ─── Cubic Bézier path ──────────────────────────────────── */
function cubicBezier(
  x1: number, y1: number,
  cx1: number, cy1: number,
  cx2: number, cy2: number,
  x2: number, y2: number,
  t: number,
) {
  const mt = 1 - t;
  return {
    x: mt*mt*mt*x1 + 3*mt*mt*t*cx1 + 3*mt*t*t*cx2 + t*t*t*x2,
    y: mt*mt*mt*y1 + 3*mt*mt*t*cy1 + 3*mt*t*t*cy2 + t*t*t*y2,
  };
}

/* ═══════════════════════════════════════════════════════════
   TopoCanvas
   ═══════════════════════════════════════════════════════════ */
interface CanvasProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedId: string | null;
  onSelect: (id: string | null, data?: Location) => void;
}

const TopoCanvas: React.FC<CanvasProps> = ({ nodes, links, selectedId, onSelect }) => {
  const svgRef  = useRef<SVGSVGElement>(null);
  const rootRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simRef  = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const rafRef  = useRef<number>(0);
  const readyRef = useRef(false);
  const userHasZoomedRef = useRef(false);
  const initialFitDoneRef = useRef(false);
  // Reset auto-fit on dataset identity change
  const lastDataKeyRef = useRef<string>('');

  useEffect(() => {
    if (!svgRef.current || readyRef.current) return;
    const svg = d3.select(svgRef.current);
    const W = svgRef.current.clientWidth  || 1200;
    const H = svgRef.current.clientHeight || 700;

    const defs = svg.append('defs');

    const pat = defs.append('pattern').attr('id', 'topo-grid')
      .attr('width', 40).attr('height', 40).attr('patternUnits', 'userSpaceOnUse');
    [[0,0],[40,0],[0,40],[40,40]].forEach(([cx,cy]) => {
      pat.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 0.8).attr('fill', 'rgba(148,163,184,0.08)');
    });

    Object.entries(STATUS).forEach(([key, s]) => {
      defs.append('marker')
        .attr('id', `arr-${key}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8).attr('refY', 0)
        .attr('markerWidth', 8).attr('markerHeight', 8)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', s.hex).attr('opacity', 0.9);
    });

    Object.entries(STATUS).forEach(([key]) => {
      const f = defs.append('filter').attr('id', `gf-${key}`)
        .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
      f.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'b');
      const m = f.append('feMerge');
      m.append('feMergeNode').attr('in', 'b');
      m.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    const ds = defs.append('filter').attr('id', 'card-shadow')
      .attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    ds.append('feDropShadow').attr('dx', 0).attr('dy', 5)
      .attr('stdDeviation', 9).attr('flood-color', 'rgba(0,0,0,0.5)');

    svg.append('rect').attr('width', '100%').attr('height', '100%').attr('fill', 'url(#topo-grid)');

    const g = svg.append('g').attr('class', 'topo-root');
    rootRef.current = g.node();
    g.append('g').attr('class', 'link-layer');
    g.append('g').attr('class', 'node-layer');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.04, 4])
      .on('zoom', e => {
        g.attr('transform', e.transform);
        if (e.sourceEvent) userHasZoomedRef.current = true;
      });
    svg.call(zoom);
    svg.on('dblclick.zoom', null);
    svg.on('dblclick', () => {
      userHasZoomedRef.current = false;
      svg.transition().duration(650)
        .call(zoom.transform, d3.zoomIdentity.translate(W / 2, 80).scale(0.65));
    });
    zoomRef.current = zoom;

    svg.on('click', () => onSelect(null));
    readyRef.current = true;
  }, []);

  useEffect(() => {
    if (!readyRef.current || !rootRef.current || !nodes.length) return;

    const root = d3.select(rootRef.current);
    const svg  = d3.select(svgRef.current!);
    const W    = svgRef.current!.clientWidth  || 1200;
    const H    = svgRef.current!.clientHeight || 700;

    // If dataset changed substantially (different nodes), re-allow auto-fit once
    const dataKey = nodes.map(n => n.id).sort().join('|');
    if (dataKey !== lastDataKeyRef.current) {
      initialFitDoneRef.current = false;
      userHasZoomedRef.current = false;
      lastDataKeyRef.current = dataKey;
    }

    simRef.current?.stop();
    cancelAnimationFrame(rafRef.current);

    const linkSel = root.select<SVGGElement>('.link-layer')
      .selectAll<SVGGElement, GraphLink>('g.edge')
      .data(links, d => d.id);

    linkSel.exit().remove();

    const linkEnter = linkSel.enter().append('g').attr('class', 'edge');
    linkEnter.append('path').attr('class', 'e-halo');
    linkEnter.append('path').attr('class', 'e-core');
    linkEnter.append('path').attr('class', 'e-shine');
    linkEnter.append('circle').attr('class', 'e-photon').attr('r', 4);
    linkEnter.append('circle').attr('class', 'e-photon2').attr('r', 2.5);

    const linkAll = root.select('.link-layer').selectAll<SVGGElement, GraphLink>('g.edge');

    const nodeSel = root.select<SVGGElement>('.node-layer')
      .selectAll<SVGGElement, GraphNode>('g.node-card')
      .data(nodes, d => d.id);

    nodeSel.exit().remove();

    const nodeEnter = nodeSel.enter().append('g').attr('class', 'node-card')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (ev, d) => { if (!ev.active) simRef.current?.alphaTarget(0.15).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag',  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
          .on('end',   (ev)    => { if (!ev.active) simRef.current?.alphaTarget(0); })
      )
      .on('click', (ev, d) => { ev.stopPropagation(); onSelect(d.id, d.data); });

    nodeEnter.each(function(d) { buildCard(d3.select(this), d); });

    const nodeAll = root.select('.node-layer').selectAll<SVGGElement, GraphNode>('g.node-card');

    const sim = d3.forceSimulation<GraphNode, GraphLink>(nodes)
      .force('link',    d3.forceLink<GraphNode, GraphLink>(links).id(n => n.id).distance(230).strength(0.85))
      .force('charge',  d3.forceManyBody().strength(-700))
      .force('collide', d3.forceCollide(170))
      .alphaDecay(0.045)
      .velocityDecay(0.4);
    simRef.current = sim;

    const getLinkGeom = (d: GraphLink) => {
      const s = d.source as GraphNode;
      const t = d.target as GraphNode;
      if (!s.x || !t.x) return null;
      const sh = getNodeH(s), th = getNodeH(t);
      const x1 = s.x, y1 = s.y! + sh / 2;
      const x2 = t.x, y2 = t.y! - th / 2;
      const dy = Math.abs(y2 - y1) * 0.55;
      return { x1, y1, x2, y2, dy, cx1: x1, cy1: y1 + dy, cx2: x2, cy2: y2 - dy };
    };

    sim.on('tick', () => {
      linkAll.each(function(d) {
        const g = getLinkGeom(d);
        if (!g) return;
        const p   = `M${g.x1},${g.y1} C${g.cx1},${g.cy1} ${g.cx2},${g.cy2} ${g.x2},${g.y2}`;
        const st  = getS((d.target as GraphNode).data.status);
        const sel = d3.select(this);
        const isDead = (d.target as GraphNode).data.status === 'offline';

        sel.select('.e-halo').attr('d', p).attr('fill', 'none')
          .attr('stroke', st.hex).attr('stroke-width', 10).attr('opacity', 0.12)
          .attr('filter', `url(#gf-${(d.target as GraphNode).data.status})`);

        sel.select('.e-core').attr('d', p).attr('fill', 'none')
          .attr('stroke', st.hex).attr('stroke-width', isDead ? 2 : 2.5)
          .attr('stroke-dasharray', isDead ? '8 6' : null)
          .attr('opacity', isDead ? 0.55 : 0.85)
          .attr('marker-end', `url(#arr-${(d.target as GraphNode).data.status})`);

        sel.select('.e-shine').attr('d', p).attr('fill', 'none')
          .attr('stroke', 'rgba(255,255,255,0.2)').attr('stroke-width', 0.7)
          .attr('opacity', isDead ? 0 : 0.55);
      });

      nodeAll.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    const LINK_OFFSETS: Map<string, number> = new Map();
    links.forEach((l, i) => LINK_OFFSETS.set(l.id, (i * 0.37) % 1));

    let t0 = performance.now();
    const SPEED = 0.28;

    function animatePhotons(now: number) {
      const elapsed = (now - t0) / 1000;

      linkAll.each(function(d) {
        const g2 = getLinkGeom(d);
        if (!g2) return;
        const st   = getS((d.target as GraphNode).data.status);
        const dead = (d.target as GraphNode).data.status === 'offline';
        const offset = LINK_OFFSETS.get(d.id) ?? 0;
        const sel = d3.select(this);

        if (dead) {
          sel.select('.e-photon').attr('opacity', 0);
          sel.select('.e-photon2').attr('opacity', 0);
          return;
        }

        const t1 = (elapsed * SPEED + offset) % 1;
        const p1 = cubicBezier(g2.x1, g2.y1, g2.cx1, g2.cy1, g2.cx2, g2.cy2, g2.x2, g2.y2, t1);
        sel.select('.e-photon')
          .attr('cx', p1.x).attr('cy', p1.y)
          .attr('fill', st.hex).attr('opacity', 0.95)
          .attr('filter', `url(#gf-${(d.target as GraphNode).data.status})`);

        const t2 = (t1 + 0.5) % 1;
        const p2 = cubicBezier(g2.x1, g2.y1, g2.cx1, g2.cy1, g2.cx2, g2.cy2, g2.x2, g2.y2, t2);
        sel.select('.e-photon2')
          .attr('cx', p2.x).attr('cy', p2.y)
          .attr('fill', st.hex).attr('opacity', 0.5)
          .attr('filter', `url(#gf-${(d.target as GraphNode).data.status})`);
      });

      rafRef.current = requestAnimationFrame(animatePhotons);
    }
    rafRef.current = requestAnimationFrame(animatePhotons);

    sim.on('end', () => {
      if (userHasZoomedRef.current) return;
      if (initialFitDoneRef.current) return;

      const xs = nodes.map(n => n.x ?? 0);
      const ys = nodes.map(n => n.y ?? 0);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const pad = 200;
      const scale = Math.min(
        (W - pad) / (maxX - minX + 1),
        (H - pad) / (maxY - minY + 1),
        0.95,
      );
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      svg.transition().duration(750)
        .call(zoomRef.current!.transform,
          d3.zoomIdentity.translate(W / 2 - cx * scale, H / 2 - cy * scale).scale(scale));

      initialFitDoneRef.current = true;
    });

    return () => {
      sim.stop();
      cancelAnimationFrame(rafRef.current);
    };
  }, [nodes, links]);

  useEffect(() => {
    if (!rootRef.current) return;
    d3.select(rootRef.current)
      .selectAll<SVGGElement, GraphNode>('g.node-card')
      .each(function(d) {
        const s = getS(d.data.status);
        const sel = d.id === selectedId;
        d3.select(this).select<HTMLDivElement>('foreignObject .card-root')
          .style('border-color', sel ? s.hex : s.border)
          .style('box-shadow', sel ? `0 0 0 2px ${s.hex}55, 0 0 28px ${s.glow}` : 'none');
      });
  }, [selectedId]);

  return (
    <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }}>
      <style>{`
        @keyframes breathe { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.7)} }
        @keyframes dashflow { to { stroke-dashoffset: -24; } }
        .e-core[stroke-dasharray] { animation: dashflow .75s linear infinite; }
      `}</style>
    </svg>
  );
};

/* ─── Build HTML card ────────────────────────────────────── */
function buildCard(g: d3.Selection<SVGGElement, GraphNode, null, undefined>, d: GraphNode) {
  const s  = getS(d.data.status);
  const nh = getNodeH(d);
  const hp = d.data.health_percentage ?? 0;
  const hc = hp >= 80 ? '#10B981' : hp >= 50 ? '#F59E0B' : '#EF4444';
  const lv = d.data.level;

  const fo = g.append('foreignObject')
    .attr('x', -NODE_W / 2).attr('y', -nh / 2)
    .attr('width', NODE_W).attr('height', nh);

  const outer = fo.append('xhtml:div')
    .attr('xmlns', 'http://www.w3.org/1999/xhtml')
    .attr('class', 'card-root')
    .style('width', `${NODE_W}px`).style('height', `${nh}px`)
    .style('box-sizing', 'border-box')
    .style('font-family', "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif")
    .style('background', lv === 0
      ? 'linear-gradient(180deg, rgba(30,41,59,0.92) 0%, rgba(15,23,42,0.96) 100%)'
      : lv === 1
      ? 'linear-gradient(180deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.92) 100%)'
      : 'linear-gradient(180deg, rgba(30,41,59,0.55) 0%, rgba(15,23,42,0.9) 100%)')
    .style('border', `1.5px solid ${s.border}`)
    .style('border-radius', '12px').style('overflow', 'hidden')
    .style('transition', 'border-color .15s, box-shadow .15s')
    .style('filter', 'url(#card-shadow)');

  outer.append('xhtml:div').style('height', '3px')
    .style('background', `linear-gradient(90deg, ${s.hex} 0%, transparent 100%)`);

  const body = outer.append('xhtml:div').style('padding', '10px 13px 12px');

  const hdr = body.append('xhtml:div')
    .style('display', 'flex').style('align-items', 'center')
    .style('gap', '8px').style('margin-bottom', '8px');

  hdr.append('xhtml:div')
    .style('background', s.bg).style('border', `1px solid ${s.border}`)
    .style('border-radius', '5px').style('padding', '2px 6px')
    .style('font-size', '10px').style('color', s.text).style('flex-shrink', '0')
    .style('font-weight', '700').style('letter-spacing', '0.05em')
    .text(lv === 0 ? 'L0' : lv === 1 ? 'L1' : `L${lv}`);

  hdr.append('xhtml:span')
    .style('color', '#F8FAFC').style('font-weight', '600').style('font-size', '12px')
    .style('flex', '1').style('overflow', 'hidden')
    .style('text-overflow', 'ellipsis').style('white-space', 'nowrap')
    .text(d.data.name);

  hdr.append('xhtml:div')
    .style('width', '7px').style('height', '7px').style('border-radius', '50%')
    .style('background', s.hex).style('box-shadow', `0 0 8px ${s.hex}`).style('flex-shrink', '0')
    .style('animation', d.data.status === 'online' ? 'breathe 2s ease-in-out infinite' : 'none');

  const badge = body.append('xhtml:div')
    .style('display', 'inline-flex').style('align-items', 'center').style('gap', '5px')
    .style('background', s.bg).style('border', `1px solid ${s.border}`)
    .style('border-radius', '20px').style('padding', '2px 9px').style('margin-bottom', '9px');
  badge.append('xhtml:span').style('font-size', '9.5px').style('font-weight', '700')
    .style('color', s.text).style('letter-spacing', '0.08em').text(s.label);

  if (d.data.device_count !== undefined) {
    const row = body.append('xhtml:div').style('display', 'flex').style('gap', '5px').style('margin-bottom', '9px');
    [
      { l: 'TOTAL', v: d.data.device_count,           c: '#CBD5E1' },
      { l: 'UP',    v: d.data.online_device_count  ?? 0, c: '#10B981' },
      { l: 'DOWN',  v: d.data.offline_device_count ?? 0, c: '#EF4444' },
    ].forEach(({ l, v, c }) => {
      const cell = row.append('xhtml:div')
        .style('flex', '1').style('background', 'rgba(148,163,184,0.05)')
        .style('border', '1px solid rgba(148,163,184,0.12)')
        .style('border-radius', '6px').style('padding', '5px 3px').style('text-align', 'center');
      cell.append('xhtml:div').style('font-size', '14px').style('font-weight', '700').style('color', c).text(String(v));
      cell.append('xhtml:div').style('font-size', '8.5px').style('color', '#64748B').style('letter-spacing', '0.06em').style('font-weight', '600').text(l);
    });
  }

  if (d.data.health_percentage !== undefined) {
    const hpw = body.append('xhtml:div');
    const hr = hpw.append('xhtml:div').style('display', 'flex').style('justify-content', 'space-between').style('margin-bottom', '4px');
    hr.append('xhtml:span').style('font-size', '9px').style('color', '#94A3B8').style('letter-spacing', '0.08em').style('font-weight', '600').text('HEALTH');
    hr.append('xhtml:span').style('font-size', '10px').style('font-weight', '700').style('color', hc).text(`${hp}%`);
    const track = hpw.append('xhtml:div').style('height', '4px').style('background', 'rgba(148,163,184,0.1)').style('border-radius', '99px').style('overflow', 'hidden');
    track.append('xhtml:div').style('height', '100%').style('width', `${hp}%`)
      .style('background', hc).style('border-radius', '99px').style('box-shadow', `0 0 8px ${hc}66`);
  }
}

/* ─── Detail Panel ──────────────────────────────────────── */
const DetailPanel: React.FC<{ data: Location; onClose: () => void }> = ({ data, onClose }) => {
  const s  = getS(data.status);
  const hp = data.health_percentage ?? 0;
  const hc = hp >= 80 ? '#10B981' : hp >= 50 ? '#F59E0B' : '#EF4444';

  const F = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
      <div style={{ color: '#64748B', paddingTop: 2, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 700, letterSpacing: '0.12em', marginBottom: 3, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 12.5, color: '#CBD5E1', wordBreak: 'break-word' }}>{value}</div>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'absolute', top: 16, right: 16, bottom: 16, width: 290,
      background: 'linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.97) 100%)',
      border: `1px solid ${s.border}`,
      borderRadius: 12, backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', boxShadow: `0 0 28px ${s.glow}, 0 32px 64px rgba(0,0,0,0.55)`,
      zIndex: 30, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${s.hex}, transparent)` }} />
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(148,163,184,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 9, color: '#94A3B8', letterSpacing: '0.12em', marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Node Details</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.name}</div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 6, color: '#94A3B8', cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, marginLeft: 8 }}>
          <X size={13} />
        </button>
      </div>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(148,163,184,0.1)', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.hex, boxShadow: `0 0 8px ${s.hex}`, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: s.text, letterSpacing: '0.1em' }}>{s.label}</span>
        {data.status_reason && <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 'auto' }}>{data.status_reason}</span>}
      </div>
      {data.device_count !== undefined && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(148,163,184,0.1)', display: 'flex', gap: 6 }}>
          {[
            { l: 'TOTAL',   v: data.device_count,           c: '#CBD5E1' },
            { l: 'ONLINE',  v: data.online_device_count  ?? 0, c: '#10B981' },
            { l: 'OFFLINE', v: data.offline_device_count ?? 0, c: '#EF4444' },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ flex: 1, background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 7, padding: '7px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 8.5, color: '#94A3B8', letterSpacing: '0.08em', marginTop: 3, fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
      )}
      {data.health_percentage !== undefined && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 9, color: '#94A3B8', letterSpacing: '0.12em', fontWeight: 700 }}>HEALTH SCORE</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: hc }}>{hp}%</span>
          </div>
          <div style={{ height: 5, background: 'rgba(148,163,184,0.1)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${hp}%`, background: hc, borderRadius: 99, boxShadow: `0 0 10px ${hc}55` }} />
          </div>
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>
        {data.project    && <F icon={<Layers size={13}/>} label="Project"     value={data.project} />}
        {data.area       && <F icon={<MapPin  size={13}/>} label="Area"        value={data.area} />}
        {data.description && <F icon={<Info   size={13}/>} label="Description" value={data.description} />}
        {data.worker_id  && <F icon={<Cpu     size={13}/>} label="Worker ID"   value={data.worker_id} />}
        <F icon={<Hash size={13}/>} label="Node ID" value={data.id} />
        {data.created_at && <F icon={<Clock size={13}/>} label="Created"  value={new Date(data.created_at).toLocaleString()} />}
        {data.updated_at && <F icon={<Clock size={13}/>} label="Updated"  value={new Date(data.updated_at).toLocaleString()} />}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Main TopologyGraph Component
   ═══════════════════════════════════════════════════════════ */
const TopologyGraph: React.FC = () => {
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all'|'online'|'offline'|'partial'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<Location | null>(null);
  const [selectedArea, setSelectedArea] = useState('all');
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentView, setCurrentView] = useState<'area-summary' | 'topology' | 'cluster'>('area-summary');
  const [clusterArea, setClusterArea] = useState<string>('');
  const [allLocations, setAllLocations] = useState<Location[]>([]);

  const selectedAreaRef = useRef(selectedArea);
  useEffect(() => { selectedAreaRef.current = selectedArea; }, [selectedArea]);

  const filterByArea = (locs: Location[], area: string): Location[] => {
    if (area === 'all') return locs;
    const f = (n: Location): Location | null => {
      const kids = (n.children ?? []).map(f).filter(Boolean) as Location[];
      if (n.area === area || kids.length) return { ...n, children: kids };
      return null;
    };
    return locs.map(f).filter(Boolean) as Location[];
  };

  const flattenAll = (locs: Location[]): Location[] => {
    const out: Location[] = [];
    const walk = (arr: Location[]) => arr.forEach(l => { out.push(l); if (l.children?.length) walk(l.children); });
    walk(locs);
    return out;
  };

  const buildUrl = useCallback(
    () => `${import.meta.env.VITE_NMS_HOST}/locations/tree`,
    []
  );

  const fetchTopology = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(buildUrl(), { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const raw: Location[] = Array.isArray(data.tree ?? data) ? (data.tree ?? data) : [data.tree ?? data];

      setAllLocations(flattenAll(raw));

      const areaSet = new Set<string>();
      const walkArea = (n: Location) => { if (n.area) areaSet.add(n.area); (n.children ?? []).forEach(walkArea); };
      raw.forEach(walkArea);
      setAvailableAreas(Array.from(areaSet).sort());

      const filtered = filterByArea(raw, selectedAreaRef.current);
      const { nodes: gn, links: gl } = flattenTree(filtered);
      applyHierarchicalLayout(gn, gl);
      setGraphNodes(gn);
      setGraphLinks(gl);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load topology');
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  const [fetchTrigger, setFetchTrigger] = useState(0);
  const triggerFetch = useCallback(() => setFetchTrigger(c => c + 1), []);

  useEffect(() => { fetchTopology(); }, [fetchTrigger, fetchTopology]);
  useEffect(() => { triggerFetch(); }, [selectedArea]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(buildUrl(), { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const raw: Location[] = Array.isArray(data.tree ?? data) ? (data.tree ?? data) : [data.tree ?? data];

        setAllLocations(flattenAll(raw));

        const byId = new Map<number, Location>();
        const idx = (locs: Location[]) => locs.forEach(l => { byId.set(l.id, l); idx(l.children ?? []); });
        idx(raw);

        setGraphNodes(prev => prev.map(n => {
          const fresh = byId.get(n.data.id);
          if (!fresh) return n;
          return {
            ...n,
            data: {
              ...n.data,
              status: fresh.status,
              device_count: fresh.device_count,
              online_device_count: fresh.online_device_count,
              offline_device_count: fresh.offline_device_count,
              health_percentage: fresh.health_percentage,
            },
          };
        }));
        setLastUpdated(new Date());
      } catch { /* silent */ }
    }, 10_000);
    return () => clearInterval(id);
  }, [autoRefresh, buildUrl]);

  const { filteredNodes, filteredLinks } = useMemo(() => {
    const fn = graphNodes.filter(n =>
      (filterStatus === 'all' || n.data.status === filterStatus) &&
      (searchTerm === '' || n.data.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const ids = new Set(fn.map(n => n.id));
    const fl = graphLinks.filter(l => {
      const s = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
      const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
      return ids.has(s) && ids.has(t);
    });
    return { filteredNodes: fn, filteredLinks: fl };
  }, [graphNodes, graphLinks, filterStatus, searchTerm]);

  const stats = useMemo(() => ({
    total: graphNodes.length,
    online: graphNodes.filter(n => n.data.status === 'online').length,
    offline: graphNodes.filter(n => n.data.status === 'offline').length,
    partial: graphNodes.filter(n => n.data.status === 'partial').length,
  }), [graphNodes]);

  const handleSelect = (id: string | null, data?: Location) => {
    setSelectedId(id ?? null);
    setSelectedData(data ?? null);
  };

  const openAreaTopology = (area: string) => {
    setSelectedArea(area);
    setSelectedId(null);
    setSelectedData(null);
    setCurrentView('topology');
  };

  const openAreaCluster = (area: string) => {
    setClusterArea(area);
    setCurrentView('cluster');
  };

  const backToAreas = () => {
    setSelectedArea('all');
    setCurrentView('area-summary');
  };

  const handleClusterNodeSelect = (location: Location) => {
    setSelectedArea(location.area);
    setSelectedId(`n-${location.id}`);
    setSelectedData(location);
    setCurrentView('topology');
  };

  /* ────────────── Area Summary View ───────────────── */
  if (currentView === 'area-summary') {
    return (
      <AreaSummary
        allLocations={allLocations.length ? allLocations : graphNodes.map(n => n.data)}
        onAreaSelect={openAreaTopology}
        onOpenCluster={openAreaCluster}
        onRefresh={fetchTopology}
        loading={loading}
        lastUpdated={lastUpdated}
      />
    );
  }

  /* ────────────── Cluster View ───────────────── */
  if (currentView === 'cluster') {
    return (
      <ClusterView
        allLocations={allLocations.length ? allLocations : graphNodes.map(n => n.data)}
        selectedArea={clusterArea}
        onBack={() => setCurrentView('area-summary')}
        onNodeSelect={handleClusterNodeSelect}
      />
    );
  }

  /* ────────────── Topology View ───────────────── */
  const isAreaScoped = selectedArea !== 'all';

  return (
    <div
      style={{
        height: '100vh',
        background: 'var(--bg-app)',
        color: 'var(--text-hi)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: '1px solid var(--border-soft)',
          background: 'rgba(11,18,32,0.85)',
          backdropFilter: 'blur(12px)',
          padding: '12px 22px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button
              onClick={backToAreas}
              title="Back to Areas"
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-soft)',
                color: 'var(--text-mid)', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              <ArrowLeft size={14} />
              Areas
            </button>
            <div
              style={{
                width: 38, height: 38,
                background: 'var(--brand-soft)',
                border: '1px solid var(--border-brand)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: BRAND,
                flexShrink: 0,
              }}
            >
              <Network size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <h1 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-hi)' }}>
                  {isAreaScoped ? selectedArea : 'Network Topology'}
                </h1>
                <span style={{ fontSize: 10, color: BRAND, letterSpacing: '0.2em', fontWeight: 700, textTransform: 'uppercase' }}>
                  {isAreaScoped ? 'Area Topology' : 'All Areas'}
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-lo)', margin: 0, marginTop: 2 }}>
                Hierarchical infrastructure graph · Click any node for details
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {[
              { l:'NODES',   v:stats.total,   c:'var(--text-hi)' },
              { l:'ONLINE',  v:stats.online,  c:'var(--status-online)' },
              { l:'PARTIAL', v:stats.partial, c:'var(--status-warning)' },
              { l:'OFFLINE', v:stats.offline, c:'var(--status-offline)' },
            ].map(({ l, v, c }) => (
              <div
                key={l}
                style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 8, padding: '6px 12px',
                  textAlign: 'center', minWidth: 56,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 9, color: 'var(--text-lo)', letterSpacing: '0.12em', marginTop: 3, fontWeight: 600 }}>{l}</div>
              </div>
            ))}

            <div style={{ width: 1, height: 28, background: 'var(--border-soft)', margin: '0 2px' }} />

            <button
              onClick={fetchTopology}
              disabled={loading}
              title="Refresh"
              style={{
                padding: 8,
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-soft)',
                borderRadius: 8,
                cursor: loading ? 'wait' : 'pointer',
                color: 'var(--text-mid)',
                display: 'flex',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin .8s linear infinite' : 'none' }} />
            </button>

            <button
              onClick={() => setAutoRefresh(v => !v)}
              style={{
                padding: '6px 12px',
                background: autoRefresh ? 'rgba(16,185,129,0.1)' : 'var(--bg-panel)',
                border: `1px solid ${autoRefresh ? 'rgba(16,185,129,0.35)' : 'var(--border-soft)'}`,
                borderRadius: 8,
                cursor: 'pointer',
                color: autoRefresh ? 'var(--status-online)' : 'var(--text-mid)',
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 5,
                letterSpacing: '0.08em',
              }}
            >
              <Signal size={12} />{autoRefresh ? 'LIVE' : 'PAUSED'}
            </button>

            {isAreaScoped && (
              <button
                onClick={() => openAreaCluster(selectedArea)}
                title="Cluster View"
                style={{
                  padding: '6px 12px',
                  background: 'var(--brand-soft)',
                  border: '1px solid var(--border-brand)',
                  borderRadius: 8, cursor: 'pointer',
                  color: BRAND,
                  fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 5,
                  letterSpacing: '0.08em',
                }}
              >
                <Grid3x3 size={12} />CLUSTER
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search nodes…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-soft)',
                borderRadius: 8,
                padding: '7px 12px 7px 32px',
                fontSize: 12.5,
                color: 'var(--text-hi)',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <select
            value={selectedArea}
            onChange={e => setSelectedArea(e.target.value)}
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-soft)',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 12.5,
              color: 'var(--text-hi)',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: 'inherit',
              minWidth: 140,
            }}
          >
            <option value="all">All Areas</option>
            {availableAreas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {(['all','online','partial','offline'] as const).map(st => {
            const active = filterStatus === st;
            const c =
              st === 'online' ? 'var(--status-online)' :
              st === 'offline' ? 'var(--status-offline)' :
              st === 'partial' ? 'var(--status-warning)' :
              BRAND;
            const rgb =
              st === 'online' ? '16,185,129' :
              st === 'offline' ? '239,68,68' :
              st === 'partial' ? '245,158,11' :
              '34,211,238';
            return (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                style={{
                  padding: '6px 12px',
                  background: active ? `rgba(${rgb},0.1)` : 'var(--bg-panel)',
                  border: `1px solid ${active ? `rgba(${rgb},0.4)` : 'var(--border-soft)'}`,
                  borderRadius: 8, cursor: 'pointer',
                  color: active ? c : 'var(--text-lo)',
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.08em',
                  transition: 'all .15s',
                  fontFamily: 'inherit',
                }}
              >
                {st.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {error && (
          <div
            style={{
              position: 'absolute', top: 16, left: '50%',
              transform: 'translateX(-50%)', zIndex: 10,
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 9, padding: '9px 16px', whiteSpace: 'nowrap',
            }}
          >
            <AlertCircle size={14} style={{ color: 'var(--status-offline)', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--status-offline)', margin: 0 }}>API ERROR</p>
              <p style={{ fontSize: 10, color: '#FCA5A5', margin: 0, marginTop: 1 }}>{error}</p>
            </div>
          </div>
        )}
        {loading && (
          <div
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(11,18,32,0.8)', zIndex: 20, gap: 14,
            }}
          >
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: 42, height: 42,
                  border: '2px solid rgba(34,211,238,0.15)',
                  borderTop: `2px solid ${BRAND}`,
                  borderRadius: '50%',
                  animation: 'spin .8s linear infinite',
                }}
              />
              <Network size={16} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: BRAND }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-lo)', margin: 0, letterSpacing: '0.12em', fontWeight: 600 }}>LOADING TOPOLOGY…</p>
          </div>
        )}
        {!loading && !error && graphNodes.length === 0 && (
          <div
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              height: '100%', gap: 12,
            }}
          >
            <Network size={42} style={{ color: 'var(--text-dim)', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-lo)', fontSize: 12, margin: 0, letterSpacing: '0.12em', fontWeight: 600 }}>NO NODES RETURNED</p>
            <button
              onClick={backToAreas}
              style={{
                marginTop: 8, padding: '7px 14px',
                background: 'var(--brand-soft)', border: '1px solid var(--border-brand)',
                color: BRAND, borderRadius: 8, cursor: 'pointer',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <LayoutGrid size={12} /> BACK TO AREAS
            </button>
          </div>
        )}

        <TopoCanvas nodes={filteredNodes} links={filteredLinks} selectedId={selectedId} onSelect={handleSelect} />

        <div
          style={{
            position: 'absolute', bottom: 36, left: 16,
            display: 'flex', gap: 6, pointerEvents: 'none', flexWrap: 'wrap',
          }}
        >
          {[['SCROLL','Zoom'],['DRAG','Pan'],['NODE DRAG','Reposition'],['DBL CLICK','Reset']].map(([k,d]) => (
            <div
              key={k}
              style={{
                display: 'flex', gap: 5, alignItems: 'center',
                background: 'rgba(15,23,42,0.85)',
                border: '1px solid var(--border-soft)',
                borderRadius: 6, padding: '4px 8px',
              }}
            >
              <span
                style={{
                  fontSize: 8.5, fontWeight: 700, color: BRAND,
                  letterSpacing: '0.08em',
                  background: 'var(--brand-soft)',
                  padding: '1px 5px', borderRadius: 3,
                  border: '1px solid var(--border-brand)',
                }}
              >
                {k}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-lo)' }}>{d}</span>
            </div>
          ))}
        </div>

        {selectedData && (
          <DetailPanel data={selectedData} onClose={() => { setSelectedId(null); setSelectedData(null); }} />
        )}
      </div>

      {/* Status bar */}
      <div
        style={{
          borderTop: '1px solid var(--border-soft)',
          background: 'rgba(11,18,32,0.85)',
          padding: '6px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 10.5,
          color: 'var(--text-lo)',
          flexShrink: 0,
          letterSpacing: '0.06em',
          fontWeight: 500,
        }}
      >
        <span>SHOWING {filteredNodes.length} / {graphNodes.length} NODES · {filteredLinks.length} LINKS</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {autoRefresh && (
            <div
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--status-online)',
                boxShadow: '0 0 5px var(--status-online)',
                animation: 'breathe 2s ease-in-out infinite',
              }}
            />
          )}
          <span>{autoRefresh ? 'LIVE · ' : ''}{lastUpdated?.toLocaleTimeString() ?? '–'}</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes breathe { 0%,100%{opacity:1} 50%{opacity:.3} }
        select option { background: #0F172A; color: #F8FAFC; }
        input::placeholder { color: var(--text-dim); }
      `}</style>
    </div>
  );
};

export default TopologyGraph;
