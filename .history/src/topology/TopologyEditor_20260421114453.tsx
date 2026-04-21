'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
  AlertCircle, RefreshCw, Search, Filter, Activity,
  Server, Network, Wifi, WifiOff, ChevronDown, ChevronRight,
  Layers, Signal, X, Info, Cpu, Clock, Hash, MapPin
} from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';

/* ─── Types ─────────────────────────────────────────────── */
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
  depth?: number;
  has_children?: boolean;
  latitude?: number;
  longitude?: number;
  location_type_id?: number;
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
  source: string | GraphNode;
  target: string | GraphNode;
  id: string;
}

/* ─── Status Config ──────────────────────────────────────── */
const STATUS = {
  online:  { hex: '#00e5a0', rgb: '0,229,160',   glow: '0 0 20px rgba(0,229,160,0.5)',   border: 'rgba(0,229,160,0.4)',   bg: 'rgba(0,229,160,0.07)',   text: '#00e5a0',   label: 'ONLINE'  },
  offline: { hex: '#ff4d6d', rgb: '255,77,109',   glow: '0 0 20px rgba(255,77,109,0.6)',  border: 'rgba(255,77,109,0.45)', bg: 'rgba(255,77,109,0.07)',  text: '#ff4d6d',   label: 'OFFLINE' },
  partial: { hex: '#ffb830', rgb: '255,184,48',   glow: '0 0 20px rgba(255,184,48,0.45)', border: 'rgba(255,184,48,0.4)', bg: 'rgba(255,184,48,0.07)',   text: '#ffb830',   label: 'PARTIAL' },
  unknown: { hex: '#4a5568', rgb: '74,85,104',    glow: 'none',                           border: 'rgba(74,85,104,0.35)',  bg: 'rgba(74,85,104,0.06)',   text: '#718096',   label: 'UNKNOWN' },
};
const getS = (s: string) => STATUS[s as keyof typeof STATUS] ?? STATUS.unknown;

/* ─── Node Dimensions ────────────────────────────────────── */
const NODE_W = 220;
const NODE_H_BASE = 100;
const getNodeHeight = (d: GraphNode) => {
  let h = NODE_H_BASE;
  if (d.data.device_count !== undefined) h += 52;
  if (d.data.health_percentage !== undefined) h += 34;
  return h;
};

/* ─── Flatten tree to graph ──────────────────────────────── */
const flattenTree = (locs: Location[], level = 0, parentId?: string): { nodes: GraphNode[]; links: GraphLink[] } => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  for (const loc of locs) {
    const nodeId = `n-${loc.id}`;
    nodes.push({ id: nodeId, data: { ...loc, level } });
    if (parentId) links.push({ id: `l-${parentId}-${nodeId}`, source: parentId, target: nodeId });
    if (loc.children?.length) {
      const sub = flattenTree(loc.children, level + 1, nodeId);
      nodes.push(...sub.nodes);
      links.push(...sub.links);
    }
  }
  return { nodes, links };
};

/* ─── Hierarchical layout ────────────────────────────────── */
const applyHierarchicalLayout = (nodes: GraphNode[], links: GraphLink[]) => {
  const LEVEL_GAP = 260;
  const SIBLING_GAP = 280;

  // Build adjacency
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  nodes.forEach(n => childrenMap.set(n.id, []));
  links.forEach(l => {
    const src = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
    const tgt = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
    childrenMap.get(src)?.push(tgt);
    parentMap.set(tgt, src);
  });

  const roots = nodes.filter(n => !parentMap.has(n.id));
  let xCursor = 0;

  const assignPositions = (nodeId: string, depth: number): number => {
    const children = childrenMap.get(nodeId) || [];
    if (!children.length) {
      const node = nodes.find(n => n.id === nodeId)!;
      node.fx = xCursor;
      node.fy = depth * LEVEL_GAP;
      const w = xCursor;
      xCursor += SIBLING_GAP;
      return w;
    }
    const childXs = children.map(c => assignPositions(c, depth + 1));
    const cx = (childXs[0] + childXs[childXs.length - 1]) / 2;
    const node = nodes.find(n => n.id === nodeId)!;
    node.fx = cx;
    node.fy = depth * LEVEL_GAP;
    return cx;
  };

  roots.forEach(r => assignPositions(r.id, 0));
};

/* ─── D3 Topology Canvas ─────────────────────────────────── */
interface TopoCanvasProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedId: string | null;
  onSelect: (id: string | null, data?: Location) => void;
}

const TopoCanvas: React.FC<TopoCanvasProps> = ({ nodes, links, selectedId, onSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const W = svgRef.current.clientWidth || 1200;
    const H = svgRef.current.clientHeight || 700;

    // ── Defs: markers + filters ──
    const defs = svg.append('defs');

    // Arrowheads per status
    Object.entries(STATUS).forEach(([key, s]) => {
      defs.append('marker')
        .attr('id', `arrow-${key}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 7)
        .attr('markerHeight', 7)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', s.hex);
    });

    // Glow filters
    Object.entries(STATUS).forEach(([key, s]) => {
      if (key === 'unknown') return;
      const f = defs.append('filter').attr('id', `glow-${key}`).attr('x', '-30%').attr('y', '-30%').attr('width', '160%').attr('height', '160%');
      f.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
      f.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).join('feMergeNode').attr('in', d => d);
    });

    // Grid pattern
    const pat = defs.append('pattern').attr('id', 'grid').attr('width', 40).attr('height', 40).attr('patternUnits', 'userSpaceOnUse');
    pat.append('path').attr('d', 'M 40 0 L 0 0 0 40').attr('fill', 'none').attr('stroke', 'rgba(255,255,255,0.025)').attr('stroke-width', 1);

    // ── Background ──
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'url(#grid)');

    // ── Root group + zoom ──
    const g = svg.append('g');
    gRef.current = g.node();

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // ── Double-click to reset view ──
    svg.on('dblclick.zoom', null);
    svg.on('dblclick', () => {
      svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity.translate(W / 2, 80).scale(0.7));
    });

    // ── Simulation ──
    const sim = d3.forceSimulation<GraphNode, GraphLink>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(220).strength(0.8))
      .force('charge', d3.forceManyBody().strength(-600))
      .force('x', d3.forceX(0).strength(0.02))
      .force('y', d3.forceY(0).strength(0.02))
      .force('collide', d3.forceCollide(160))
      .alphaDecay(0.04);

    simRef.current = sim;

    // ── Edges ──
    const linkGroup = g.append('g').attr('class', 'links');
    const linkEl = linkGroup.selectAll('g.link').data(links).join('g').attr('class', 'link');

    // Shadow line for glow
    linkEl.append('path')
      .attr('class', 'link-shadow')
      .attr('fill', 'none')
      .attr('stroke-width', 6)
      .attr('opacity', 0.18);

    // Main line
    linkEl.append('path')
      .attr('class', 'link-line')
      .attr('fill', 'none')
      .attr('stroke-width', d => {
        const tgt = typeof d.target === 'string' ? nodes.find(n => n.id === d.target) : d.target as GraphNode;
        return tgt?.data.status === 'offline' ? 2.5 : 2;
      })
      .attr('stroke-dasharray', d => {
        const tgt = typeof d.target === 'string' ? nodes.find(n => n.id === d.target) : d.target as GraphNode;
        return tgt?.data.status === 'offline' ? '10 6' : null;
      });

    // ── Nodes ──
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const nodeEl = nodeGroup.selectAll<SVGGElement, GraphNode>('g.node-group')
      .data(nodes, d => d.id)
      .join('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0);
          })
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        onSelect(d.id === selectedId ? null : d.id, d.data);
      });

    svg.on('click', () => onSelect(null));

    // Drop shadow filter for cards
    const dropFilter = defs.append('filter').attr('id', 'drop-shadow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    dropFilter.append('feDropShadow').attr('dx', 0).attr('dy', 4).attr('stdDeviation', 8).attr('flood-color', 'rgba(0,0,0,0.6)');

    nodeEl.each(function(d) {
      const el = d3.select(this);
      const s = getS(d.data.status);
      const nh = getNodeHeight(d);
      const level = d.data.level;

      // ── Card container ──
      const fo = el.append('foreignObject')
        .attr('x', -NODE_W / 2)
        .attr('y', -nh / 2)
        .attr('width', NODE_W)
        .attr('height', nh)
        .attr('class', 'node-fo');

      const div = fo.append('xhtml:div')
        .style('width', '100%')
        .style('height', '100%')
        .style('box-sizing', 'border-box')
        .style('font-family', "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace")
        .style('background', level === 0
          ? 'linear-gradient(135deg, #0d1b2a 0%, #162032 100%)'
          : level === 1
          ? 'linear-gradient(135deg, #0a1520 0%, #111e2e 100%)'
          : 'linear-gradient(135deg, #080f18 0%, #0c1824 100%)')
        .style('border', `1.5px solid ${d.id === selectedId ? s.hex : s.border}`)
        .style('border-radius', '10px')
        .style('overflow', 'hidden')
        .style('filter', 'url(#drop-shadow)')
        .style('transition', 'border-color 0.2s')
        .attr('xmlns', 'http://www.w3.org/1999/xhtml');

      // Top accent bar
      div.append('xhtml:div')
        .style('height', '3px')
        .style('background', `linear-gradient(90deg, ${s.hex} 0%, transparent 100%)`);

      const body = div.append('xhtml:div').style('padding', '9px 11px 11px');

      // Header row
      const hdr = body.append('xhtml:div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('gap', '7px')
        .style('margin-bottom', '7px');

      // Level icon box
      const iconSvg = level === 0 ? '⬡' : level === 1 ? '◈' : '◦';
      hdr.append('xhtml:div')
        .style('background', s.bg)
        .style('border', `1px solid ${s.border}`)
        .style('border-radius', '5px')
        .style('padding', '3px 5px')
        .style('font-size', '11px')
        .style('color', s.text)
        .style('flex-shrink', '0')
        .text(iconSvg);

      // Name
      hdr.append('xhtml:span')
        .style('color', '#e2eaf4')
        .style('font-weight', '700')
        .style('font-size', '11.5px')
        .style('letter-spacing', '0.3px')
        .style('flex', '1')
        .style('overflow', 'hidden')
        .style('text-overflow', 'ellipsis')
        .style('white-space', 'nowrap')
        .text(d.data.name);

      // Pulse dot
      hdr.append('xhtml:div')
        .style('width', '7px')
        .style('height', '7px')
        .style('border-radius', '50%')
        .style('background', s.hex)
        .style('box-shadow', `0 0 6px ${s.hex}`)
        .style('flex-shrink', '0')
        .style('animation', d.data.status === 'online' ? 'breathe 2s ease-in-out infinite' : 'none');

      // Status badge
      const badge = body.append('xhtml:div')
        .style('display', 'inline-flex')
        .style('align-items', 'center')
        .style('gap', '5px')
        .style('background', s.bg)
        .style('border', `1px solid ${s.border}`)
        .style('border-radius', '20px')
        .style('padding', '2px 9px')
        .style('margin-bottom', '9px');

      const icon = d.data.status === 'online' ? '▲' : d.data.status === 'offline' ? '▼' : d.data.status === 'partial' ? '◐' : '?';
      badge.append('xhtml:span').style('font-size', '9px').style('color', s.hex).text(icon);
      badge.append('xhtml:span')
        .style('font-size', '9.5px')
        .style('font-weight', '700')
        .style('color', s.text)
        .style('letter-spacing', '1px')
        .text(s.label);

      // Device stats
      if (d.data.device_count !== undefined) {
        const row = body.append('xhtml:div')
          .style('display', 'flex')
          .style('gap', '5px')
          .style('margin-bottom', '9px');
        [
          { l: 'TOTAL', v: d.data.device_count, c: '#7ea3c4' },
          { l: 'UP', v: d.data.online_device_count ?? 0, c: '#00e5a0' },
          { l: 'DOWN', v: d.data.offline_device_count ?? 0, c: '#ff4d6d' },
        ].forEach(({ l, v, c }) => {
          const cell = row.append('xhtml:div')
            .style('flex', '1')
            .style('background', 'rgba(255,255,255,0.03)')
            .style('border', '1px solid rgba(255,255,255,0.07)')
            .style('border-radius', '6px')
            .style('padding', '5px 3px')
            .style('text-align', 'center');
          cell.append('xhtml:div').style('font-size', '13px').style('font-weight', '700').style('color', c).text(String(v));
          cell.append('xhtml:div').style('font-size', '8.5px').style('color', '#445566').style('letter-spacing', '0.5px').text(l);
        });
      }

      // Health bar
      if (d.data.health_percentage !== undefined) {
        const hp = d.data.health_percentage;
        const hc = hp >= 80 ? '#00e5a0' : hp >= 50 ? '#ffb830' : '#ff4d6d';
        const hpDiv = body.append('xhtml:div');
        const hrow = hpDiv.append('xhtml:div')
          .style('display', 'flex')
          .style('justify-content', 'space-between')
          .style('margin-bottom', '4px');
        hrow.append('xhtml:span').style('font-size', '9px').style('color', '#445566').style('letter-spacing', '0.8px').text('HEALTH');
        hrow.append('xhtml:span').style('font-size', '9px').style('font-weight', '700').style('color', hc).text(`${hp}%`);
        const track = hpDiv.append('xhtml:div')
          .style('height', '4px').style('background', 'rgba(255,255,255,0.06)').style('border-radius', '99px').style('overflow', 'hidden');
        track.append('xhtml:div')
          .style('height', '100%').style('width', `${hp}%`)
          .style('background', `linear-gradient(90deg, ${hc}, ${hc}cc)`)
          .style('border-radius', '99px')
          .style('box-shadow', `0 0 8px ${hc}88`);
      }
    });

    // ── Tick update ──
    const getLinkPath = (d: GraphLink) => {
      const s = d.source as GraphNode;
      const t = d.target as GraphNode;
      if (!s.x || !s.y || !t.x || !t.y) return '';
      const sh = getNodeHeight(s);
      const th = getNodeHeight(t);
      const sx = s.x, sy = s.y + sh / 2;
      const tx = t.x, ty = t.y - th / 2;
      const my = (sy + ty) / 2;
      return `M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`;
    };

    sim.on('tick', () => {
      linkEl.select('.link-shadow')
        .attr('d', d => getLinkPath(d))
        .attr('stroke', d => {
          const tgt = d.target as GraphNode;
          return getS(tgt.data.status).hex;
        });
      linkEl.select('.link-line')
        .attr('d', d => getLinkPath(d))
        .attr('stroke', d => {
          const tgt = d.target as GraphNode;
          return getS(tgt.data.status).hex;
        })
        .attr('marker-end', d => {
          const tgt = d.target as GraphNode;
          return `url(#arrow-${tgt.data.status})`;
        });

      nodeEl.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Center initial view once settled
    sim.on('end', () => {
      const allX = nodes.map(n => n.x ?? 0);
      const allY = nodes.map(n => n.y ?? 0);
      const minX = Math.min(...allX), maxX = Math.max(...allX);
      const minY = Math.min(...allY), maxY = Math.max(...allY);
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      const scale = Math.min(0.85, Math.min(W / (maxX - minX + 400), H / (maxY - minY + 400)));
      svg.transition().duration(800)
        .call(zoom.transform, d3.zoomIdentity.translate(W / 2 - cx * scale, H / 2 - cy * scale).scale(scale));
    });

    // Cleanup
    return () => { sim.stop(); };
  }, [nodes, links]);

  // Update selection highlight without full rebuild
  useEffect(() => {
    if (!gRef.current) return;
    d3.select(gRef.current).selectAll<SVGGElement, GraphNode>('g.node-group').each(function(d) {
      const s = getS(d.data.status);
      d3.select(this).select('foreignObject > div')
        .style('border-color', d.id === selectedId ? s.hex : s.border)
        .style('box-shadow', d.id === selectedId ? s.glow : 'none');
    });
  }, [selectedId]);

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <style>{`
        @keyframes breathe { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
        @keyframes dash { to { stroke-dashoffset: -20; } }
        .link-line[stroke-dasharray] { animation: dash 0.8s linear infinite; }
      `}</style>
    </svg>
  );
};

/* ─── Detail Panel ───────────────────────────────────────── */
const DetailPanel: React.FC<{ data: Location; onClose: () => void }> = ({ data, onClose }) => {
  const s = getS(data.status);
  const hp = data.health_percentage ?? 0;
  const hc = hp >= 80 ? '#00e5a0' : hp >= 50 ? '#ffb830' : '#ff4d6d';

  const Field = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ color: '#334455', paddingTop: 1, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: '#445566', fontWeight: 700, letterSpacing: 1, marginBottom: 3, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#c8d6e5' }}>{value}</div>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'absolute', top: 16, right: 16, bottom: 16, width: 280,
      background: 'rgba(8,14,24,0.97)',
      border: `1px solid ${s.border}`,
      borderRadius: 12,
      backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: `${s.glow}, 0 32px 64px rgba(0,0,0,0.7)`,
      zIndex: 30,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${s.hex}, transparent)` }} />
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, color: '#334455', letterSpacing: 1, marginBottom: 3 }}>NODE DETAILS</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2eaf4' }}>{data.name}</div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#445566', cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, padding: 0, flexShrink: 0 }}>
          <X size={14} />
        </button>
      </div>

      {/* Status */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.hex, boxShadow: s.glow, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: s.text, letterSpacing: 1 }}>{s.label}</span>
        {data.status_reason && <span style={{ fontSize: 10, color: '#445566', marginLeft: 'auto' }}>{data.status_reason}</span>}
      </div>

      {/* Device stats */}
      {data.device_count !== undefined && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 6 }}>
          {[
            { l: 'TOTAL', v: data.device_count, c: '#7ea3c4' },
            { l: 'ONLINE', v: data.online_device_count ?? 0, c: '#00e5a0' },
            { l: 'OFFLINE', v: data.offline_device_count ?? 0, c: '#ff4d6d' },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, padding: '6px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 8.5, color: '#334455', letterSpacing: 0.5 }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Health */}
      {data.health_percentage !== undefined && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 9, color: '#445566', letterSpacing: 1 }}>HEALTH SCORE</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: hc }}>{hp}%</span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${hp}%`, background: `linear-gradient(90deg, ${hc}, ${hc}bb)`, borderRadius: 99, boxShadow: `0 0 10px ${hc}66`, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>
        {data.project && <Field icon={<Layers size={13} />} label="Project" value={data.project} />}
        {data.area && <Field icon={<MapPin size={13} />} label="Area" value={data.area} />}
        {data.description && <Field icon={<Info size={13} />} label="Description" value={<span style={{ color: '#556677', lineHeight: 1.6, fontSize: 11 }}>{data.description}</span>} />}
        {data.worker_id && <Field icon={<Cpu size={13} />} label="Worker ID" value={<span style={{ color: '#556677', fontSize: 11 }}>{data.worker_id}</span>} />}
        {data.id && <Field icon={<Hash size={13} />} label="ID" value={<span style={{ color: '#556677' }}>{data.id}</span>} />}
        {data.created_at && <Field icon={<Clock size={13} />} label="Created" value={<span style={{ color: '#556677', fontSize: 11 }}>{new Date(data.created_at).toLocaleString()}</span>} />}
        {data.updated_at && <Field icon={<Clock size={13} />} label="Last Updated" value={<span style={{ color: '#556677', fontSize: 11 }}>{new Date(data.updated_at).toLocaleString()}</span>} />}
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────── */
const TopologyGraph: React.FC = () => {
  const [rawNodes, setRawNodes] = useState<GraphNode[]>([]);
  const [rawLinks, setRawLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'partial'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<Location | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'subtree'>('tree');
  const [locationId, setLocationId] = useState<number>(1);
  const [selectedArea, setSelectedArea] = useState('all');
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);

  const processTreeData = (locs: Location[], level = 0): Location[] =>
    locs.map(l => ({ ...l, level, children: processTreeData(l.children || [], level + 1) }));

  const filterTreeByArea = (locs: Location[], area: string): Location[] => {
    if (area === 'all') return locs;
    const filter = (node: Location): Location | null => {
      const children = (node.children || []).map(filter).filter(Boolean) as Location[];
      if (node.area === area || children.length) return { ...node, children };
      return null;
    };
    return locs.map(filter).filter(Boolean) as Location[];
  };

  const extractAreas = (locs: Location[]): string[] => {
    const s = new Set<string>();
    const walk = (n: Location) => { if (n.area) s.add(n.area); (n.children || []).forEach(walk); };
    locs.forEach(walk);
    return Array.from(s).sort();
  };

  const fetchTopology = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const url = viewMode === 'subtree' && locationId
        ? `${import.meta.env.VITE_NMS_HOST}/locations/${locationId}/subtree`
        : `${import.meta.env.VITE_NMS_HOST}/locations/tree`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const raw = data.tree ?? data;
      const processed = processTreeData(Array.isArray(raw) ? raw : [raw]);
      setAvailableAreas(extractAreas(processed));
      const filtered = filterTreeByArea(processed, selectedArea);
      const { nodes: gn, links: gl } = flattenTree(filtered);
      applyHierarchicalLayout(gn, gl);
      setRawNodes(gn);
      setRawLinks(gl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load topology');
    } finally {
      setLoading(false);
    }
  }, [viewMode, locationId, selectedArea]);

  useEffect(() => { fetchTopology(); }, [fetchTopology]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(fetchTopology, 10_000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchTopology]);

  const { filteredNodes, filteredLinks } = useMemo(() => {
    const fn = rawNodes.filter(n =>
      (filterStatus === 'all' || n.data.status === filterStatus) &&
      (searchTerm === '' || n.data.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const ids = new Set(fn.map(n => n.id));
    const fl = rawLinks.filter(l => {
      const s = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
      const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
      return ids.has(s) && ids.has(t);
    });
    return { filteredNodes: fn, filteredLinks: fl };
  }, [rawNodes, rawLinks, filterStatus, searchTerm]);

  const stats = useMemo(() => ({
    total: rawNodes.length,
    online: rawNodes.filter(n => n.data.status === 'online').length,
    offline: rawNodes.filter(n => n.data.status === 'offline').length,
    partial: rawNodes.filter(n => n.data.status === 'partial').length,
  }), [rawNodes]);

  const handleSelect = (id: string | null, data?: Location) => {
    setSelectedId(id);
    setSelectedData(data ?? null);
  };

  return (
    <div style={{
      height: '100vh',
      background: '#060d18',
      color: '#c8d6e5',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(6,13,24,0.95)',
        backdropFilter: 'blur(16px)',
        padding: '12px 20px',
        flexShrink: 0,
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Logo block */}
            <div style={{ position: 'relative' }}>
              <div style={{ width: 36, height: 36, background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Network size={18} style={{ color: '#00e5a0' }} />
              </div>
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, background: '#00e5a0', borderRadius: '50%', boxShadow: '0 0 6px #00e5a0', animation: 'breathe 2s ease-in-out infinite' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: 1, color: '#e2eaf4', textTransform: 'uppercase' }}>Network Topology</h1>
                <span style={{ fontSize: 9, color: '#00e5a0', letterSpacing: 2, opacity: 0.7 }}>NMS v2</span>
              </div>
              <p style={{ fontSize: 10, color: '#334455', margin: 0, marginTop: 2, letterSpacing: 0.5 }}>Real-time infrastructure hierarchy — D3 force graph</p>
            </div>
          </div>

          {/* Stats + controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[
              { l: 'NODES', v: stats.total, c: '#7ea3c4', b: 'rgba(126,163,196,0.12)', br: 'rgba(126,163,196,0.2)' },
              { l: 'ONLINE', v: stats.online, c: '#00e5a0', b: 'rgba(0,229,160,0.08)', br: 'rgba(0,229,160,0.25)' },
              { l: 'PARTIAL', v: stats.partial, c: '#ffb830', b: 'rgba(255,184,48,0.08)', br: 'rgba(255,184,48,0.25)' },
              { l: 'OFFLINE', v: stats.offline, c: '#ff4d6d', b: 'rgba(255,77,109,0.08)', br: 'rgba(255,77,109,0.25)' },
            ].map(({ l, v, c, b, br }) => (
              <div key={l} style={{ background: b, border: `1px solid ${br}`, borderRadius: 7, padding: '5px 11px', textAlign: 'center', minWidth: 52 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 8, color: '#334455', letterSpacing: 0.8, marginTop: 2 }}>{l}</div>
              </div>
            ))}

            <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />

            <button
              onClick={fetchTopology} disabled={loading}
              style={{ padding: 7, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, cursor: loading ? 'wait' : 'pointer', color: '#556677', display: 'flex', opacity: loading ? 0.5 : 1 }}
            >
              <RefreshCw size={15} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>

            <button
              onClick={() => setAutoRefresh(v => !v)}
              style={{ padding: '5px 11px', background: autoRefresh ? 'rgba(0,229,160,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${autoRefresh ? 'rgba(0,229,160,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 7, cursor: 'pointer', color: autoRefresh ? '#00e5a0' : '#556677', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, letterSpacing: 0.5 }}
            >
              <Signal size={12} />
              {autoRefresh ? 'LIVE' : 'PAUSED'}
            </button>
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#334455' }} />
            <input
              type="text" placeholder="Search nodes…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '6px 10px 6px 30px', fontSize: 12, color: '#c8d6e5', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          {/* Area */}
          <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '6px 10px', fontSize: 12, color: '#c8d6e5', cursor: 'pointer', outline: 'none', fontFamily: 'inherit', minWidth: 120 }}>
            <option value="all">All Areas</option>
            {availableAreas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Status filters */}
          {(['all', 'online', 'partial', 'offline'] as const).map(s => {
            const active = filterStatus === s;
            const c = s === 'online' ? '#00e5a0' : s === 'offline' ? '#ff4d6d' : s === 'partial' ? '#ffb830' : '#7ea3c4';
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{ padding: '6px 12px', background: active ? `rgba(${s === 'online' ? '0,229,160' : s === 'offline' ? '255,77,109' : s === 'partial' ? '255,184,48' : '126,163,196'},0.10)` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? c + '40' : 'rgba(255,255,255,0.07)'}`, borderRadius: 7, cursor: 'pointer', color: active ? c : '#445566', fontSize: 10, fontWeight: 700, letterSpacing: 0.8, transition: 'all 0.2s', fontFamily: 'inherit' }}>
                {s.toUpperCase()}
              </button>
            );
          })}

          {/* View mode */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: 2 }}>
            {(['tree', 'subtree'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ padding: '4px 10px', background: viewMode === m ? 'rgba(0,229,160,0.12)' : 'transparent', border: viewMode === m ? '1px solid rgba(0,229,160,0.3)' : '1px solid transparent', borderRadius: 5, cursor: 'pointer', color: viewMode === m ? '#00e5a0' : '#445566', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, fontFamily: 'inherit' }}>
                {m === 'tree' ? 'FULL TREE' : 'SUBTREE'}
              </button>
            ))}
          </div>

          {viewMode === 'subtree' && (
            <input type="number" value={locationId} onChange={e => setLocationId(parseInt(e.target.value) || 1)} placeholder="ID"
              style={{ width: 64, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '6px 8px', fontSize: 12, color: '#c8d6e5', outline: 'none', textAlign: 'center', fontFamily: 'inherit' }} />
          )}
        </div>
      </div>

      {/* ── Canvas ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Error */}
        {error && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.3)', borderRadius: 9, padding: '10px 16px', whiteSpace: 'nowrap' }}>
            <AlertCircle size={15} style={{ color: '#ff4d6d', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#ff4d6d', margin: 0 }}>API ERROR</p>
              <p style={{ fontSize: 10, color: '#cc3355', margin: 0, marginTop: 1 }}>{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,13,24,0.80)', zIndex: 20, gap: 14 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 40, height: 40, border: '2px solid rgba(0,229,160,0.15)', borderTop: '2px solid #00e5a0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <Network size={16} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#00e5a0' }} />
            </div>
            <p style={{ fontSize: 11, color: '#334455', margin: 0, letterSpacing: 1 }}>LOADING TOPOLOGY…</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && rawNodes.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <Network size={40} style={{ color: '#1a2533' }} />
            <p style={{ color: '#334455', fontSize: 12, margin: 0, letterSpacing: 1 }}>NO NODES RETURNED</p>
          </div>
        )}

        {!loading && filteredNodes.length > 0 && (
          <TopoCanvas
            nodes={filteredNodes}
            links={filteredLinks}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        )}

        {/* Controls hint */}
        <div style={{ position: 'absolute', bottom: 40, left: 16, display: 'flex', gap: 10, pointerEvents: 'none' }}>
          {[
            { key: 'SCROLL', desc: 'Zoom' },
            { key: 'DRAG', desc: 'Pan canvas' },
            { key: 'NODE DRAG', desc: 'Reposition' },
            { key: 'DBL CLICK', desc: 'Reset view' },
          ].map(({ key, desc }) => (
            <div key={key} style={{ display: 'flex', gap: 4, alignItems: 'center', background: 'rgba(6,13,24,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 5, padding: '4px 8px' }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: '#00e5a0', letterSpacing: 0.5, background: 'rgba(0,229,160,0.08)', padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(0,229,160,0.15)' }}>{key}</span>
              <span style={{ fontSize: 9, color: '#334455', letterSpacing: 0.3 }}>{desc}</span>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selectedData && (
          <DetailPanel data={selectedData} onClose={() => { setSelectedId(null); setSelectedData(null); }} />
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(6,13,24,0.95)', padding: '5px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#334455', flexShrink: 0, letterSpacing: 0.5 }}>
        <span>DISPLAYING {filteredNodes.length} / {rawNodes.length} NODES · {filteredLinks.length} LINKS</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {autoRefresh && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5a0', boxShadow: '0 0 5px #00e5a0', animation: 'breathe 2s ease-in-out infinite' }} />}
          <span>{autoRefresh ? 'LIVE ·' : ''} {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes breathe { 0%,100%{opacity:1} 50%{opacity:0.35} }
        * { scrollbar-width: thin; scrollbar-color: #1a2533 transparent; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a2533; border-radius: 99px; }
        select option { background: #0d1b2a; color: #c8d6e5; }
      `}</style>
    </div>
  );
};

export default TopologyGraph;