'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
  AlertCircle, RefreshCw, Network, Search,
  Signal, X, Info, Cpu, Clock, Hash, MapPin, Layers,
} from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import SummaryPanel from '@/components/Summary'; // ← ADD THIS IMPORT

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

/* ─── Status config ──────────────────────────────────────── */
const STATUS = {
  online:  { hex: '#00e5a0', glow: 'rgba(0,229,160,0.6)',   border: 'rgba(0,229,160,0.4)',   bg: 'rgba(0,229,160,0.07)',  text: '#00e5a0', label: 'ONLINE'  },
  offline: { hex: '#ff4d6d', glow: 'rgba(255,77,109,0.7)',  border: 'rgba(255,77,109,0.45)', bg: 'rgba(255,77,109,0.07)', text: '#ff4d6d', label: 'OFFLINE' },
  partial: { hex: '#ffb830', glow: 'rgba(255,184,48,0.55)', border: 'rgba(255,184,48,0.4)',  bg: 'rgba(255,184,48,0.07)', text: '#ffb830', label: 'PARTIAL' },
  unknown: { hex: '#4a5568', glow: 'rgba(74,85,104,0.3)',   border: 'rgba(74,85,104,0.3)',   bg: 'rgba(74,85,104,0.06)', text: '#718096', label: 'UNKNOWN' },
};
const getS = (s: string) => STATUS[s as keyof typeof STATUS] ?? STATUS.unknown;

/* ─── Node card dimensions ───────────────────────────────── */
const NODE_W  = 224;
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

/* ─── Cubic Bézier path from bottom of source to top of target ── */
function edgePath(s: GraphNode, t: GraphNode): string {
  const sh = getNodeH(s), th = getNodeH(t);
  const x1 = s.x ?? 0, y1 = (s.y ?? 0) + sh / 2;
  const x2 = t.x ?? 0, y2 = (t.y ?? 0) - th / 2;
  const dy = Math.abs(y2 - y1) * 0.55;
  return `M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`;
}

/* ─── Evaluate cubic Bézier at t ─────────────────────────── */
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
   – SVG initialised ONCE, never remounted
   – data synced via a separate useEffect
   – zoom/pan state never touched on refresh
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

  /* ── ONE-TIME SVG bootstrap ──────────────────────────── */
  useEffect(() => {
    if (!svgRef.current || readyRef.current) return;
    const svg = d3.select(svgRef.current);
    const W = svgRef.current.clientWidth  || 1200;
    const H = svgRef.current.clientHeight || 700;

    const defs = svg.append('defs');

    /* dot grid */
    const pat = defs.append('pattern').attr('id', 'topo-grid')
      .attr('width', 40).attr('height', 40).attr('patternUnits', 'userSpaceOnUse');
    pat.append('circle').attr('cx', 0).attr('cy', 0).attr('r', 0.8).attr('fill', 'rgba(255,255,255,0.06)');
    pat.append('circle').attr('cx', 40).attr('cy', 0).attr('r', 0.8).attr('fill', 'rgba(255,255,255,0.06)');
    pat.append('circle').attr('cx', 0).attr('cy', 40).attr('r', 0.8).attr('fill', 'rgba(255,255,255,0.06)');
    pat.append('circle').attr('cx', 40).attr('cy', 40).attr('r', 0.8).attr('fill', 'rgba(255,255,255,0.06)');

    /* arrowhead per status */
    Object.entries(STATUS).forEach(([key, s]) => {
      defs.append('marker')
        .attr('id', `arr-${key}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8).attr('refY', 0)
        .attr('markerWidth', 8).attr('markerHeight', 8)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', s.hex).attr('opacity', 0.9);
    });

    /* glow filter per status */
    Object.entries(STATUS).forEach(([key, s]) => {
      const f = defs.append('filter').attr('id', `gf-${key}`)
        .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
      f.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'b');
      const m = f.append('feMerge');
      m.append('feMergeNode').attr('in', 'b');
      m.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    /* card drop shadow */
    const ds = defs.append('filter').attr('id', 'card-shadow')
      .attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    ds.append('feDropShadow').attr('dx', 0).attr('dy', 5)
      .attr('stdDeviation', 9).attr('flood-color', 'rgba(0,0,0,0.7)');

    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'url(#topo-grid)');

    const g = svg.append('g').attr('class', 'topo-root');
    rootRef.current = g.node();
    g.append('g').attr('class', 'link-layer');
    g.append('g').attr('class', 'node-layer');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.04, 4])
      .on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoom);
    svg.on('dblclick.zoom', null);
    svg.on('dblclick', () =>
      svg.transition().duration(650)
        .call(zoom.transform, d3.zoomIdentity.translate(W / 2, 80).scale(0.65)));
    zoomRef.current = zoom;

    svg.on('click', () => onSelect(null));
    readyRef.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── DATA SYNC ──────────────────────────────────────── */
  useEffect(() => {
    if (!readyRef.current || !rootRef.current || !nodes.length) return;

    const root = d3.select(rootRef.current);
    const svg  = d3.select(svgRef.current!);
    const W    = svgRef.current!.clientWidth  || 1200;
    const H    = svgRef.current!.clientHeight || 700;

    simRef.current?.stop();
    cancelAnimationFrame(rafRef.current);

    /* ── LINKS ─────────────────────────────────────── */
    const linkSel = root.select<SVGGElement>('.link-layer')
      .selectAll<SVGGElement, GraphLink>('g.edge')
      .data(links, d => d.id);

    linkSel.exit().remove();

    const linkEnter = linkSel.enter().append('g').attr('class', 'edge');
    linkEnter.append('path').attr('class', 'e-halo');   // wide blurred aura
    linkEnter.append('path').attr('class', 'e-core');   // solid coloured line
    linkEnter.append('path').attr('class', 'e-shine');  // brighter thin highlight
    linkEnter.append('circle').attr('class', 'e-photon').attr('r', 4);
    linkEnter.append('circle').attr('class', 'e-photon2').attr('r', 2.5); // second offset photon

    const linkAll = root.select('.link-layer').selectAll<SVGGElement, GraphLink>('g.edge');

    /* ── NODES ─────────────────────────────────────── */
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

    /* ── SIMULATION ─────────────────────────────────── */
    const sim = d3.forceSimulation<GraphNode, GraphLink>(nodes)
      .force('link',    d3.forceLink<GraphNode, GraphLink>(links).id(n => n.id).distance(230).strength(0.85))
      .force('charge',  d3.forceManyBody().strength(-700))
      .force('collide', d3.forceCollide(170))
      .alphaDecay(0.045)
      .velocityDecay(0.4);
    simRef.current = sim;

    /* shared helper to get link geometry */
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

    /* tick */
    sim.on('tick', () => {
      linkAll.each(function(d) {
        const g = getLinkGeom(d);
        if (!g) return;
        const p   = `M${g.x1},${g.y1} C${g.cx1},${g.cy1} ${g.cx2},${g.cy2} ${g.x2},${g.y2}`;
        const st  = getS((d.target as GraphNode).data.status);
        const sel = d3.select(this);
        const isDead = (d.target as GraphNode).data.status === 'offline';

        /* halo – thick blurred background glow */
        sel.select('.e-halo').attr('d', p).attr('fill', 'none')
          .attr('stroke', st.hex).attr('stroke-width', 10).attr('opacity', 0.12)
          .attr('filter', `url(#gf-${(d.target as GraphNode).data.status})`);

        /* core line */
        sel.select('.e-core').attr('d', p).attr('fill', 'none')
          .attr('stroke', st.hex).attr('stroke-width', isDead ? 2 : 2.5)
          .attr('stroke-dasharray', isDead ? '8 6' : null)
          .attr('opacity', isDead ? 0.55 : 0.85)
          .attr('marker-end', `url(#arr-${(d.target as GraphNode).data.status})`);

        /* shine overlay – thin bright stripe on top of core */
        sel.select('.e-shine').attr('d', p).attr('fill', 'none')
          .attr('stroke', 'rgba(255,255,255,0.25)').attr('stroke-width', 0.7)
          .attr('opacity', isDead ? 0 : 0.6);
      });

      nodeAll.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    /* ── PHOTON ANIMATION (RAF, independent of simulation) ── */
    // Each link gets two photons at different offsets for depth
    const LINK_OFFSETS: Map<string, number> = new Map();
    links.forEach((l, i) => LINK_OFFSETS.set(l.id, (i * 0.37) % 1));

    let t0 = performance.now();
    const SPEED = 0.28; // full path per second

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

        // photon 1
        const t1 = (elapsed * SPEED + offset) % 1;
        const p1 = cubicBezier(g2.x1, g2.y1, g2.cx1, g2.cy1, g2.cx2, g2.cy2, g2.x2, g2.y2, t1);
        sel.select('.e-photon')
          .attr('cx', p1.x).attr('cy', p1.y)
          .attr('fill', st.hex).attr('opacity', 0.95)
          .attr('filter', `url(#gf-${(d.target as GraphNode).data.status})`);

        // photon 2 – offset by 0.5, smaller
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

    /* auto-fit once settled */
    sim.on('end', () => {
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
    });

    return () => {
      sim.stop();
      cancelAnimationFrame(rafRef.current);
    };
  }, [nodes, links]); // ONLY rebuild when graph topology data changes

  /* ── SELECTION HIGHLIGHT – no rebuild ──────────────── */
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

/* ─── Build HTML card inside a foreignObject ────────────── */
function buildCard(g: d3.Selection<SVGGElement, GraphNode, null, undefined>, d: GraphNode) {
  const s  = getS(d.data.status);
  const nh = getNodeH(d);
  const hp = d.data.health_percentage ?? 0;
  const hc = hp >= 80 ? '#00e5a0' : hp >= 50 ? '#ffb830' : '#ff4d6d';
  const lv = d.data.level;

  const fo = g.append('foreignObject')
    .attr('x', -NODE_W / 2).attr('y', -nh / 2)
    .attr('width', NODE_W).attr('height', nh);

  const outer = fo.append('xhtml:div')
    .attr('xmlns', 'http://www.w3.org/1999/xhtml')
    .attr('class', 'card-root')
    .style('width', `${NODE_W}px`).style('height', `${nh}px`)
    .style('box-sizing', 'border-box')
    .style('font-family', "'JetBrains Mono','Fira Code','Cascadia Code',monospace")
    .style('background', lv === 0
      ? 'linear-gradient(145deg,#0d1b2e 0%,#162234 100%)'
      : lv === 1
      ? 'linear-gradient(145deg,#0a1624 0%,#101d2c 100%)'
      : 'linear-gradient(145deg,#07101c 0%,#0c1724 100%)')
    .style('border', `1.5px solid ${s.border}`)
    .style('border-radius', '10px').style('overflow', 'hidden')
    .style('transition', 'border-color .15s, box-shadow .15s')
    .style('filter', 'url(#card-shadow)');

  outer.append('xhtml:div').style('height', '3px')
    .style('background', `linear-gradient(90deg,${s.hex} 0%,transparent 100%)`);

  const body = outer.append('xhtml:div').style('padding', '9px 12px 12px');

  const hdr = body.append('xhtml:div')
    .style('display', 'flex').style('align-items', 'center')
    .style('gap', '7px').style('margin-bottom', '7px');

  hdr.append('xhtml:div')
    .style('background', s.bg).style('border', `1px solid ${s.border}`)
    .style('border-radius', '5px').style('padding', '2px 5px')
    .style('font-size', '10px').style('color', s.text).style('flex-shrink', '0')
    .text(lv === 0 ? '⬡' : lv === 1 ? '◈' : '◦');

  hdr.append('xhtml:span')
    .style('color', '#e2eaf4').style('font-weight', '700').style('font-size', '11.5px')
    .style('flex', '1').style('overflow', 'hidden')
    .style('text-overflow', 'ellipsis').style('white-space', 'nowrap')
    .text(d.data.name);

  hdr.append('xhtml:div')
    .style('width', '7px').style('height', '7px').style('border-radius', '50%')
    .style('background', s.hex).style('box-shadow', `0 0 6px ${s.hex}`).style('flex-shrink', '0')
    .style('animation', d.data.status === 'online' ? 'breathe 2s ease-in-out infinite' : 'none');

  const badge = body.append('xhtml:div')
    .style('display', 'inline-flex').style('align-items', 'center').style('gap', '5px')
    .style('background', s.bg).style('border', `1px solid ${s.border}`)
    .style('border-radius', '20px').style('padding', '2px 9px').style('margin-bottom', '9px');
  badge.append('xhtml:span').style('font-size', '9px').style('color', s.hex)
    .text(d.data.status === 'online' ? '▲' : d.data.status === 'offline' ? '▼' : d.data.status === 'partial' ? '◐' : '?');
  badge.append('xhtml:span').style('font-size', '9.5px').style('font-weight', '700')
    .style('color', s.text).style('letter-spacing', '1px').text(s.label);

  if (d.data.device_count !== undefined) {
    const row = body.append('xhtml:div').style('display', 'flex').style('gap', '5px').style('margin-bottom', '9px');
    [
      { l: 'TOTAL', v: d.data.device_count,           c: '#7ea3c4' },
      { l: 'UP',    v: d.data.online_device_count  ?? 0, c: '#00e5a0' },
      { l: 'DOWN',  v: d.data.offline_device_count ?? 0, c: '#ff4d6d' },
    ].forEach(({ l, v, c }) => {
      const cell = row.append('xhtml:div')
        .style('flex', '1').style('background', 'rgba(255,255,255,0.03)')
        .style('border', '1px solid rgba(255,255,255,0.07)')
        .style('border-radius', '6px').style('padding', '5px 3px').style('text-align', 'center');
      cell.append('xhtml:div').style('font-size', '13px').style('font-weight', '700').style('color', c).text(String(v));
      cell.append('xhtml:div').style('font-size', '8px').style('color', '#445566').style('letter-spacing', '.5px').text(l);
    });
  }

  if (d.data.health_percentage !== undefined) {
    const hpw = body.append('xhtml:div');
    const hr = hpw.append('xhtml:div').style('display', 'flex').style('justify-content', 'space-between').style('margin-bottom', '4px');
    hr.append('xhtml:span').style('font-size', '9px').style('color', '#445566').style('letter-spacing', '.8px').text('HEALTH');
    hr.append('xhtml:span').style('font-size', '9px').style('font-weight', '700').style('color', hc).text(`${hp}%`);
    const track = hpw.append('xhtml:div').style('height', '4px').style('background', 'rgba(255,255,255,0.06)').style('border-radius', '99px').style('overflow', 'hidden');
    track.append('xhtml:div').style('height', '100%').style('width', `${hp}%`)
      .style('background', `linear-gradient(90deg,${hc},${hc}cc)`).style('border-radius', '99px').style('box-shadow', `0 0 8px ${hc}88`);
  }
}

/* ═══════════════════════════════════════════════════════════
   Detail Panel
   ═══════════════════════════════════════════════════════════ */
const DetailPanel: React.FC<{ data: Location; onClose: () => void }> = ({ data, onClose }) => {
  const s  = getS(data.status);
  const hp = data.health_percentage ?? 0;
  const hc = hp >= 80 ? '#00e5a0' : hp >= 50 ? '#ffb830' : '#ff4d6d';

  const F = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ color: '#334455', paddingTop: 1, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 8.5, color: '#445566', fontWeight: 700, letterSpacing: 1, marginBottom: 3, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#c8d6e5' }}>{value}</div>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'absolute', top: 16, right: 16, bottom: 16, width: 270,
      background: 'rgba(7,12,22,0.97)', border: `1px solid ${s.border}`,
      borderRadius: 12, backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', boxShadow: `0 0 28px ${s.glow}, 0 32px 64px rgba(0,0,0,0.7)`,
      zIndex: 30, fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
      <div style={{ height: 3, background: `linear-gradient(90deg,${s.hex},transparent)` }} />
      <div style={{ padding: '11px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 8.5, color: '#334455', letterSpacing: 1, marginBottom: 2 }}>NODE DETAILS</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2eaf4' }}>{data.name}</div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#445566', cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
          <X size={13} />
        </button>
      </div>
      <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.hex, boxShadow: `0 0 7px ${s.hex}`, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: s.text, letterSpacing: 1 }}>{s.label}</span>
        {data.status_reason && <span style={{ fontSize: 10, color: '#445566', marginLeft: 'auto' }}>{data.status_reason}</span>}
      </div>
      {data.device_count !== undefined && (
        <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 6 }}>
          {[
            { l: 'TOTAL',   v: data.device_count,           c: '#7ea3c4' },
            { l: 'ONLINE',  v: data.online_device_count  ?? 0, c: '#00e5a0' },
            { l: 'OFFLINE', v: data.offline_device_count ?? 0, c: '#ff4d6d' },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, padding: '6px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 8, color: '#334455', letterSpacing: .5 }}>{l}</div>
            </div>
          ))}
        </div>
      )}
      {data.health_percentage !== undefined && (
        <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 8.5, color: '#445566', letterSpacing: 1 }}>HEALTH SCORE</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: hc }}>{hp}%</span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${hp}%`, background: `linear-gradient(90deg,${hc},${hc}bb)`, borderRadius: 99, boxShadow: `0 0 10px ${hc}66` }} />
          </div>
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>
        {data.project    && <F icon={<Layers size={13}/>} label="Project"     value={data.project} />}
        {data.area       && <F icon={<MapPin  size={13}/>} label="Area"        value={data.area} />}
        {data.description && <F icon={<Info   size={13}/>} label="Description" value={<span style={{ color: '#556677', lineHeight: 1.6, fontSize: 11 }}>{data.description}</span>} />}
        {data.worker_id  && <F icon={<Cpu     size={13}/>} label="Worker ID"   value={<span style={{ color: '#556677' }}>{data.worker_id}</span>} />}
        <F icon={<Hash size={13}/>} label="Node ID" value={<span style={{ color: '#556677' }}>{data.id}</span>} />
        {data.created_at && <F icon={<Clock size={13}/>} label="Created"  value={<span style={{ color: '#556677', fontSize: 11 }}>{new Date(data.created_at).toLocaleString()}</span>} />}
        {data.updated_at && <F icon={<Clock size={13}/>} label="Updated"  value={<span style={{ color: '#556677', fontSize: 11 }}>{new Date(data.updated_at).toLocaleString()}</span>} />}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Main page component
   ═══════════════════════════════════════════════════════════ */
const TopologyGraph: React.FC = () => {
  const [graphNodes,   setGraphNodes]   = useState<GraphNode[]>([]);
  const [graphLinks,   setGraphLinks]   = useState<GraphLink[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState<'all'|'online'|'offline'|'partial'>('all');
  const [autoRefresh,  setAutoRefresh]  = useState(true);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<Location | null>(null);
  const [viewMode,     setViewMode]     = useState<'tree'|'subtree'>('tree');
  const [locationId,   setLocationId]   = useState<number>(1);
  const [selectedArea, setSelectedArea] = useState('all');
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);
  const [showSummary,  setShowSummary]  = useState(false); // ← ADD THIS STATE

  /* filter helpers */
  const filterByArea = (locs: Location[], area: string): Location[] => {
    if (area === 'all') return locs;
    const f = (n: Location): Location | null => {
      const kids = (n.children ?? []).map(f).filter(Boolean) as Location[];
      if (n.area === area || kids.length) return { ...n, children: kids };
      return null;
    };
    return locs.map(f).filter(Boolean) as Location[];
  };

  /* ── FULL FETCH (rebuilds layout) ─────────────────────
     Only triggered when viewMode / locationId / selectedArea
     actually change. The 10-second auto-refresh uses a
     SEPARATE lighter patch path below.                   */
  const fetchTopology = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const url = viewMode === 'subtree' && locationId
        ? `${import.meta.env.VITE_NMS_HOST}/locations/${locationId}/subtree`
        : `${import.meta.env.VITE_NMS_HOST}/locations/tree`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
      const data  = await res.json();
      const raw: Location[] = Array.isArray(data.tree ?? data) ? (data.tree ?? data) : [data.tree ?? data];

      const areaSet = new Set<string>();
      const walkArea = (n: Location) => { if (n.area) areaSet.add(n.area); (n.children ?? []).forEach(walkArea); };
      raw.forEach(walkArea);
      setAvailableAreas(Array.from(areaSet).sort());

      const filtered = filterByArea(raw, selectedArea);
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
  }, [viewMode, locationId, selectedArea]);

  useEffect(() => { fetchTopology(); }, [fetchTopology]);

  /* ── STATUS-ONLY REFRESH (every 10s) ─────────────────
     Fetches fresh data but ONLY patches .status and
     device counts on existing nodes.
     Positions, zoom, and layout are never touched.      */
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(async () => {
      try {
        const url = viewMode === 'subtree' && locationId
          ? `${import.meta.env.VITE_NMS_HOST}/locations/${locationId}/subtree`
          : `${import.meta.env.VITE_NMS_HOST}/locations/tree`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const raw: Location[] = Array.isArray(data.tree ?? data) ? (data.tree ?? data) : [data.tree ?? data];

        /* index by id */
        const byId = new Map<number, Location>();
        const idx = (locs: Location[]) => locs.forEach(l => { byId.set(l.id, l); idx(l.children ?? []); });
        idx(raw);

        /* patch in-place, preserving x/y/fx/fy so simulation & zoom are untouched */
        setGraphNodes(prev => prev.map(n => {
          const fresh = byId.get(n.data.id);
          if (!fresh) return n;
          return {
            ...n,
            data: {
              ...n.data,
              status:                fresh.status,
              device_count:          fresh.device_count,
              online_device_count:   fresh.online_device_count,
              offline_device_count:  fresh.offline_device_count,
              health_percentage:     fresh.health_percentage,
            },
          };
        }));
        setLastUpdated(new Date());
      } catch { /* silently swallow refresh errors */ }
    }, 10_000);
    return () => clearInterval(id);
  }, [autoRefresh, viewMode, locationId]);

  /* filtered nodes for search/status pills */
  const { filteredNodes, filteredLinks } = useMemo(() => {
    const fn = graphNodes.filter(n =>
      (filterStatus === 'all' || n.data.status === filterStatus) &&
      (searchTerm   === ''    || n.data.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const ids = new Set(fn.map(n => n.id));
    const fl  = graphLinks.filter(l => {
      const s = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
      const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
      return ids.has(s) && ids.has(t);
    });
    return { filteredNodes: fn, filteredLinks: fl };
  }, [graphNodes, graphLinks, filterStatus, searchTerm]);

  const stats = useMemo(() => ({
    total:   graphNodes.length,
    online:  graphNodes.filter(n => n.data.status === 'online').length,
    offline: graphNodes.filter(n => n.data.status === 'offline').length,
    partial: graphNodes.filter(n => n.data.status === 'partial').length,
  }), [graphNodes]);

  const handleSelect = (id: string | null, data?: Location) => {
    setSelectedId(id ?? null);
    setSelectedData(data ?? null);
  };

  /* ── RENDER ─────────────────────────────────────────── */
  return (
    <div style={{ height: '100vh', background: '#060d18', color: '#c8d6e5', display: 'flex', flexDirection: 'column', fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace", overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(6,13,24,0.97)', backdropFilter: 'blur(16px)', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 36, height: 36, background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.18)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Network size={18} style={{ color: '#00e5a0' }} />
              </div>
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, background: '#00e5a0', borderRadius: '50%', boxShadow: '0 0 6px #00e5a0', animation: 'breathe 2s ease-in-out infinite' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: 1, color: '#e2eaf4', textTransform: 'uppercase' }}>Network Topology</h1>
                <span style={{ fontSize: 9, color: '#00e5a0', letterSpacing: 2, opacity: .65 }}>NMS v2</span>
              </div>
              <p style={{ fontSize: 9.5, color: '#2a3a4a', margin: 0, marginTop: 2, letterSpacing: .4 }}>Real-time infrastructure hierarchy · D3 force graph</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[
              { l:'NODES',   v:stats.total,   c:'#7ea3c4', b:'rgba(126,163,196,0.10)', br:'rgba(126,163,196,0.2)' },
              { l:'ONLINE',  v:stats.online,  c:'#00e5a0', b:'rgba(0,229,160,0.08)',   br:'rgba(0,229,160,0.22)'  },
              { l:'PARTIAL', v:stats.partial, c:'#ffb830', b:'rgba(255,184,48,0.08)',  br:'rgba(255,184,48,0.22)' },
              { l:'OFFLINE', v:stats.offline, c:'#ff4d6d', b:'rgba(255,77,109,0.08)', br:'rgba(255,77,109,0.22)' },
            ].map(({ l, v, c, b, br }) => (
              <div key={l} style={{ background: b, border: `1px solid ${br}`, borderRadius: 7, padding: '5px 11px', textAlign: 'center', minWidth: 50 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 8, color: '#334455', letterSpacing: .8, marginTop: 2 }}>{l}</div>
              </div>
            ))}
            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.05)', margin: '0 2px' }} />
            <button onClick={fetchTopology} disabled={loading}
              style={{ padding: 7, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, cursor: loading ? 'wait' : 'pointer', color: '#556677', display: 'flex', opacity: loading ? .5 : 1 }}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin .8s linear infinite' : 'none' }} />
            </button>
            <button onClick={() => setAutoRefresh(v => !v)}
              style={{ padding: '5px 11px', background: autoRefresh ? 'rgba(0,229,160,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${autoRefresh ? 'rgba(0,229,160,0.22)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 7, cursor: 'pointer', color: autoRefresh ? '#00e5a0' : '#556677', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, letterSpacing: .5 }}>
              <Signal size={12} />{autoRefresh ? 'LIVE' : 'PAUSED'}
            </button>
            {/* ← ADD SUMMARY BUTTON HERE */}
            <button onClick={() => setShowSummary(v => !v)}
              style={{ padding: '5px 11px', background: showSummary ? 'rgba(0,229,160,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${showSummary ? 'rgba(0,229,160,0.22)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 7, cursor: 'pointer', color: showSummary ? '#00e5a0' : '#556677', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, letterSpacing: .5 }}>
              <Layers size={12} />SUMMARY
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#2a3a4a' }} />
            <input type="text" placeholder="Search nodes…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '6px 10px 6px 29px', fontSize: 12, color: '#c8d6e5', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '6px 10px', fontSize: 12, color: '#c8d6e5', cursor: 'pointer', outline: 'none', fontFamily: 'inherit', minWidth: 120 }}>
            <option value="all">All Areas</option>
            {availableAreas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {(['all','online','partial','offline'] as const).map(st => {
            const active = filterStatus === st;
            const c  = st==='online'?'#00e5a0':st==='offline'?'#ff4d6d':st==='partial'?'#ffb830':'#7ea3c4';
            const rgb= st==='online'?'0,229,160':st==='offline'?'255,77,109':st==='partial'?'255,184,48':'126,163,196';
            return (
              <button key={st} onClick={() => setFilterStatus(st)}
                style={{ padding: '6px 11px', background: active ? `rgba(${rgb},0.09)` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? c+'38' : 'rgba(255,255,255,0.07)'}`, borderRadius: 7, cursor: 'pointer', color: active ? c : '#445566', fontSize: 10, fontWeight: 700, letterSpacing: .8, transition: 'all .2s', fontFamily: 'inherit' }}>
                {st.toUpperCase()}
              </button>
            );
          })}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: 2 }}>
            {(['tree','subtree'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ padding: '4px 10px', background: viewMode===m?'rgba(0,229,160,0.10)':'transparent', border: viewMode===m?'1px solid rgba(0,229,160,0.28)':'1px solid transparent', borderRadius: 5, cursor: 'pointer', color: viewMode===m?'#00e5a0':'#445566', fontSize: 10, fontWeight: 700, letterSpacing: .5, fontFamily: 'inherit' }}>
                {m==='tree'?'FULL TREE':'SUBTREE'}
              </button>
            ))}
          </div>
          {viewMode === 'subtree' && (
            <input type="number" value={locationId} onChange={e => setLocationId(parseInt(e.target.value)||1)}
              style={{ width: 64, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '6px 8px', fontSize: 12, color: '#c8d6e5', outline: 'none', textAlign: 'center', fontFamily: 'inherit' }} />
          )}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {error && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,77,109,0.07)', border: '1px solid rgba(255,77,109,0.28)', borderRadius: 9, padding: '9px 16px', whiteSpace: 'nowrap' }}>
            <AlertCircle size={14} style={{ color: '#ff4d6d', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#ff4d6d', margin: 0 }}>API ERROR</p>
              <p style={{ fontSize: 10, color: '#cc3355', margin: 0, marginTop: 1 }}>{error}</p>
            </div>
          </div>
        )}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,13,24,0.82)', zIndex: 20, gap: 14 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 40, height: 40, border: '2px solid rgba(0,229,160,0.12)', borderTop: '2px solid #00e5a0', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
              <Network size={15} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#00e5a0' }} />
            </div>
            <p style={{ fontSize: 10, color: '#2a3a4a', margin: 0, letterSpacing: 1 }}>LOADING TOPOLOGY…</p>
          </div>
        )}
        {!loading && !error && graphNodes.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <Network size={38} style={{ color: '#1a2533' }} />
            <p style={{ color: '#2a3a4a', fontSize: 11, margin: 0, letterSpacing: 1 }}>NO NODES RETURNED</p>
          </div>
        )}

        {/* TopoCanvas is ALWAYS mounted – never conditionally rendered,
            so zoom/pan state persists across re-renders             */}
        <TopoCanvas nodes={filteredNodes} links={filteredLinks} selectedId={selectedId} onSelect={handleSelect} />

        <div style={{ position: 'absolute', bottom: 36, left: 16, display: 'flex', gap: 8, pointerEvents: 'none' }}>
          {[['SCROLL','Zoom'],['DRAG','Pan'],['NODE DRAG','Reposition'],['DBL CLICK','Reset view']].map(([k,d]) => (
            <div key={k} style={{ display: 'flex', gap: 4, alignItems: 'center', background: 'rgba(6,13,24,0.85)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 5, padding: '3px 7px' }}>
              <span style={{ fontSize: 7.5, fontWeight: 700, color: '#00e5a0', letterSpacing: .5, background: 'rgba(0,229,160,0.07)', padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(0,229,160,0.13)' }}>{k}</span>
              <span style={{ fontSize: 8.5, color: '#2a3a4a', letterSpacing: .3 }}>{d}</span>
            </div>
          ))}
        </div>

        {selectedData && (
          <DetailPanel data={selectedData} onClose={() => { setSelectedId(null); setSelectedData(null); }} />
        )}

        {/* ← RENDER SUMMARY PANEL HERE */}
        <SummaryPanel
          allLocations={graphNodes.map(n => n.data)}
          onLocationSelect={(location) => {
            if (location) {
              handleSelect(`n-${location.id}`, location);
              setShowSummary(false);
            }
          }}
          isOpen={showSummary}
          onClose={() => setShowSummary(false)}
        />
      </div>

      {/* Status bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(6,13,24,0.97)', padding: '4px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9.5, color: '#2a3a4a', flexShrink: 0, letterSpacing: .4 }}>
        <span>SHOWING {filteredNodes.length} / {graphNodes.length} NODES · {filteredLinks.length} LINKS</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {autoRefresh && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00e5a0', boxShadow: '0 0 4px #00e5a0', animation: 'breathe 2s ease-in-out infinite' }} />}
          <span>{autoRefresh ? 'LIVE · ' : ''}{lastUpdated?.toLocaleTimeString() ?? '–'}</span>
        </div>
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes breathe { 0%,100%{opacity:1} 50%{opacity:.3} }
        * { scrollbar-width: thin; scrollbar-color: #182030 transparent; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #182030; border-radius: 99px; }
        select option { background: #0d1b2a; color: #c8d6e5; }
      `}</style>
    </div>
  );
};

export default TopologyGraph;