import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchLocations } from '@/store/locationsSlice';
import { fetchDevices } from '@/store/deviceSlice';
import { fetchWorkers, fetchWorkerStats } from '@/store/workerSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft, Server, Activity, Wifi, WifiOff, Signal, AlertCircle,
  CheckCircle2, FileText, Cpu, Network, Gauge, Power, Zap, MapPin,
  Tag, Clock, ShieldCheck, ShieldAlert, Hash,
} from 'lucide-react';
import LocationTelemetry from '@/locations/LocationTelemetry';
import { getAuthHeaders } from '@/lib/auth';

type LogEntry = {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  device?: string;
};

const formatTimeAgo = (dateString?: string) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Never';
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const getApprovalPill = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return 'bg-emerald-100 text-emerald-800';
  if (s === 'denied') return 'bg-red-100 text-red-800';
  return 'bg-amber-100 text-amber-800';
};

const getStatusPill = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'active' || s === 'online') return 'bg-emerald-100 text-emerald-800';
  return 'bg-slate-200 text-slate-800';
};

const getUtilizationStyle = (pct: number) => {
  if (pct >= 90) return { bar: 'bg-red-500', text: 'text-red-300' };
  if (pct >= 70) return { bar: 'bg-amber-400', text: 'text-amber-300' };
  return { bar: 'bg-emerald-400', text: 'text-emerald-300' };
};

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { workers = [] } = useAppSelector(state => state.workers);
  const { devices = [] } = useAppSelector(state => state.devices);
  const { locations = [] } = useAppSelector(state => state.locations);

  const [actionMsg, setActionMsg] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!workers || workers.length === 0) {
      dispatch(fetchWorkers({}));
      dispatch(fetchWorkerStats());
    }
    if (!devices || devices.length === 0) dispatch(fetchDevices());
    if (!locations || locations.length === 0) dispatch(fetchLocations());
  }, [dispatch]);

  const worker = useMemo(
    () => (id ? workers.find(w => w.id === id) : undefined),
    [workers, id],
  );

  const workerDevices = useMemo(
    () => (worker ? devices.filter(d => d.worker_id === worker.id) : []),
    [devices, worker],
  );

  const workerLocations = useMemo(
    () => (worker ? locations.filter(l => l.worker_id === worker.id) : []),
    [locations, worker],
  );

  const stats = useMemo(() => {
    const total = workerDevices.length;
    const online = workerDevices.filter(d => d.is_reachable === true).length;
    const offline = total - online;
    const powered = workerDevices.filter(d => d.has_power === true).length;
    const noPower = workerDevices.filter(d => d.has_power === false).length;
    const max = worker?.max_devices ?? 0;
    const utilization = max > 0 ? Math.round((total / max) * 100) : 0;

    const latencies = workerDevices
      .map(d => Number((d as any).latency_ms))
      .filter(n => Number.isFinite(n) && n > 0);
    const avgLatency = latencies.length
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    const failures = workerDevices
      .map(d => Number((d as any).consecutive_failures))
      .filter(n => Number.isFinite(n));
    const totalFailures = failures.reduce((a, b) => a + b, 0);

    return { total, online, offline, powered, noPower, utilization, avgLatency, totalFailures };
  }, [workerDevices, worker]);

  const deviceTypeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    workerDevices.forEach(d => {
      const name = d.device_type?.name || 'Unknown';
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [workerDevices]);

  const logs = useMemo<LogEntry[]>(() => {
    if (!worker) return [];
    const out: LogEntry[] = [];
    let logId = 1;

    if (worker.registered_at) {
      out.push({
        id: logId++,
        timestamp: new Date(worker.registered_at).toLocaleString(),
        level: 'info',
        message: `Worker registered`,
      });
    }
    if (worker.approved_at) {
      out.push({
        id: logId++,
        timestamp: new Date(worker.approved_at).toLocaleString(),
        level: 'success',
        message: `Worker approved${worker.approved_by ? ` by ${worker.approved_by}` : ''}`,
      });
    }
    if (worker.last_seen) {
      out.push({
        id: logId++,
        timestamp: new Date(worker.last_seen).toLocaleString(),
        level: 'info',
        message: `Last heartbeat received`,
      });
    }

    workerDevices.forEach(device => {
      out.push({
        id: logId++,
        timestamp: new Date(device.updated_at || Date.now()).toLocaleString(),
        level: device.is_reachable ? 'success' : 'error',
        message: device.status_reason || (device.is_reachable ? 'Device online' : 'Device offline'),
        device: device.hostname,
      });
    });

    return out.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [worker, workerDevices]);

  if (!worker) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 mb-4">Worker not found</p>
          <Button onClick={() => navigate('/areas')}>Back to Areas</Button>
        </div>
      </div>
    );
  }

  const handleApprove = async () => {
    const approver = window.prompt('Enter your name to approve this worker:');
    if (!approver?.trim()) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/${worker.id}/approve`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ approval_status: 'approved', approved_by: approver }),
        },
      );
      if (!res.ok) throw new Error('Failed to approve worker');
      setActionMsg({ msg: 'Worker approved', type: 'success' });
      dispatch(fetchWorkers({}));
      dispatch(fetchWorkerStats());
    } catch (e: any) {
      setActionMsg({ msg: e.message || 'Approval failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!window.confirm('Deny this worker? This cannot be undone.')) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/${worker.id}/delete`,
        { method: 'DELETE', headers: getAuthHeaders() },
      );
      if (!res.ok) throw new Error('Failed to deny worker');
      setActionMsg({ msg: 'Worker denied', type: 'success' });
      dispatch(fetchWorkers({}));
      dispatch(fetchWorkerStats());
      setTimeout(() => navigate('/areas'), 1200);
    } catch (e: any) {
      setActionMsg({ msg: e.message || 'Denial failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const utilStyle = getUtilizationStyle(stats.utilization);
  const isActive = (worker.status || '').toLowerCase() === 'active' || (worker.status || '').toLowerCase() === 'online';

  const getLogLevelWrapper = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300';
      case 'error':   return 'bg-red-900/30 border-red-700/40 text-red-300';
      case 'warning': return 'bg-amber-900/30 border-amber-700/40 text-amber-300';
      default:        return 'bg-cyan-900/30 border-cyan-700/40 text-cyan-300';
    }
  };
  const getLogLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'bg-emerald-500/15 text-emerald-300';
      case 'error':   return 'bg-red-500/15 text-red-300';
      case 'warning': return 'bg-amber-500/15 text-amber-300';
      default:        return 'bg-cyan-500/15 text-cyan-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-300" />
          </button>

          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-900' : 'bg-red-900'}`}>
              <Cpu className={`h-6 w-6 ${isActive ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{worker.name}</h1>
              <p className="text-sm text-gray-400">Worker Details · {worker.ip_address || 'No IP'}</p>
            </div>
          </div>
        </div>

        {/* Status pills + Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`px-3 py-1 rounded-full font-medium text-sm flex items-center gap-2 ${getStatusPill(worker.status)}`}>
            <Signal className="h-4 w-4" />
            {worker.status ? worker.status.charAt(0).toUpperCase() + worker.status.slice(1) : 'Unknown'}
          </div>
          <div className={`px-3 py-1 rounded-full font-medium text-sm flex items-center gap-2 ${getApprovalPill(worker.approval_status)}`}>
            {worker.approval_status === 'approved'
              ? <ShieldCheck className="h-4 w-4" />
              : <ShieldAlert className="h-4 w-4" />}
            {worker.approval_status ? worker.approval_status.charAt(0).toUpperCase() + worker.approval_status.slice(1) : 'Unknown'}
          </div>
          <div className="px-3 py-1 rounded-full font-medium text-sm flex items-center gap-2 bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Online: {stats.online}
          </div>
          <div className={`px-3 py-1 rounded-full font-medium text-sm flex items-center gap-2 ${stats.offline > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
            <AlertCircle className="h-4 w-4" />
            Offline: {stats.offline}
          </div>

          {worker.approval_status === 'pending' && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeny}
                disabled={actionLoading}
              >
                Deny
              </Button>
            </div>
          )}
        </div>
      </div>

      {actionMsg && (
        <div className={`mb-4 px-4 py-2 rounded border text-sm ${
          actionMsg.type === 'success'
            ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300'
            : 'bg-red-900/30 border-red-700/40 text-red-300'
        }`}>
          {actionMsg.msg}
        </div>
      )}

      {/* KPI tiles — full width */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiTile
          label="Total Devices"
          value={String(stats.total)}
          accent="cyan"
          icon={<Wifi className="h-3.5 w-3.5" />}
        />
        <KpiTile
          label="Online Rate"
          value={stats.total ? `${Math.round((stats.online / stats.total) * 100)}%` : '—'}
          accent={stats.total && stats.online / stats.total >= 0.95 ? 'emerald' : stats.total && stats.online / stats.total >= 0.8 ? 'amber' : 'red'}
          icon={<Signal className="h-3.5 w-3.5" />}
        />
        <KpiTile
          label="Avg Latency"
          value={stats.avgLatency ? `${stats.avgLatency.toFixed(1)} ms` : '—'}
          accent="cyan"
          icon={<Clock className="h-3.5 w-3.5" />}
          sub="current snapshot"
        />
        <KpiTile
          label="Total Failures"
          value={String(stats.totalFailures)}
          accent={stats.totalFailures > 0 ? 'red' : 'emerald'}
          icon={<AlertCircle className="h-3.5 w-3.5" />}
          sub="consecutive across devices"
        />
      </div>

      {/* Info row — 2 columns, balanced heights via flex */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">

        {/* LEFT: Worker Info + Capabilities + Utilization stacked */}
        <div className="flex flex-col gap-6">
          {/* Worker Information */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                <Server className="h-5 w-5 text-cyan-400" />
                Worker Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <InfoRow icon={<Hash className="h-4 w-4 text-slate-400" />} label="Worker ID" value={worker.id} mono />
                <InfoRow icon={<Network className="h-4 w-4 text-slate-400" />} label="IP Address" value={worker.ip_address || 'N/A'} mono />
                <InfoRow icon={<Tag className="h-4 w-4 text-slate-400" />} label="Version" value={worker.version || 'N/A'} />
                <InfoRow icon={<Cpu className="h-4 w-4 text-slate-400" />} label="Max Devices" value={String(worker.max_devices ?? 0)} />
                <InfoRow icon={<Clock className="h-4 w-4 text-slate-400" />} label="Last Seen" value={formatTimeAgo(worker.last_seen)} />
                <InfoRow icon={<Clock className="h-4 w-4 text-slate-400" />} label="Registered" value={formatDate(worker.registered_at)} />
                {worker.approved_at && (
                  <InfoRow icon={<ShieldCheck className="h-4 w-4 text-slate-400" />} label="Approved" value={formatDate(worker.approved_at)} />
                )}
                {worker.approved_by && (
                  <InfoRow icon={<ShieldCheck className="h-4 w-4 text-slate-400" />} label="Approved By" value={worker.approved_by} />
                )}
              </div>
            </CardContent>
          </Card>

         
          {worker.capabilities && worker.capabilities.length > 0 && (
            <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100 flex-1">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Tag className="h-5 w-5 text-violet-300" />
                  Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {worker.capabilities.map((cap, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-600/30"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: Devices Summary (tall, with scrollable device list) */}
        <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100 flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
              <Wifi className="h-5 w-5 text-emerald-300" />
              Devices Summary
              <span className="ml-auto text-emerald-300 font-semibold">{stats.total}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-emerald-500/10 border border-emerald-600/30 rounded-lg p-2 text-center">
                <div className="text-emerald-300 text-xl font-bold">{stats.online}</div>
                <div className="text-emerald-400 text-[11px] mt-1 flex items-center justify-center gap-1">
                  <Signal className="h-3 w-3" /> Online
                </div>
              </div>
              <div className="bg-red-500/10 border border-red-600/30 rounded-lg p-2 text-center">
                <div className="text-red-300 text-xl font-bold">{stats.offline}</div>
                <div className="text-red-400 text-[11px] mt-1 flex items-center justify-center gap-1">
                  <WifiOff className="h-3 w-3" /> Offline
                </div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-600/30 rounded-lg p-2 text-center">
                <div className="text-emerald-300 text-xl font-bold">{stats.powered}</div>
                <div className="text-emerald-400 text-[11px] mt-1 flex items-center justify-center gap-1">
                  <Zap className="h-3 w-3" /> Powered
                </div>
              </div>
              <div className="bg-red-500/10 border border-red-600/30 rounded-lg p-2 text-center">
                <div className="text-red-300 text-xl font-bold">{stats.noPower}</div>
                <div className="text-red-400 text-[11px] mt-1 flex items-center justify-center gap-1">
                  <Power className="h-3 w-3" /> No Power
                </div>
              </div>
            </div>

            {workerDevices.length > 0 ? (
              <div className="space-y-2 flex-1 overflow-y-auto pr-1 max-h-[480px]">
                {workerDevices.map(device => {
                  const isOnline = device.is_reachable === true;
                  return (
                    <div
                      key={device.id}
                      className="bg-slate-900/60 border border-slate-700 rounded-lg p-3 hover:bg-slate-900 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-100 font-medium text-sm truncate">{device.hostname}</div>
                          <div className="text-slate-400 text-xs font-mono mt-0.5">{device.ip}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">{device.device_type?.name || 'Unknown'}</div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${
                          isOnline ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
                        }`}>
                          {isOnline ? <Signal className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                          {isOnline ? 'Online' : 'Offline'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 flex-1">
                <Wifi className="h-8 w-8 mx-auto opacity-50 mb-2" />
                No devices assigned
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data row — 2 cols of equal weight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Device-type breakdown */}
        <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Activity className="h-5 w-5 text-cyan-400" />
              Device Type Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deviceTypeBreakdown.length === 0 ? (
              <div className="text-slate-400 text-sm py-4 text-center">No devices to summarize</div>
            ) : (
              <div className="space-y-2">
                {deviceTypeBreakdown.map(([name, count]) => {
                  const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <div className="w-1/3 truncate text-sm text-slate-100">{name}</div>
                      <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full bg-cyan-400" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-20 text-right text-xs text-slate-300 tabular-nums">
                        {count} ({pct}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Managed Locations */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <MapPin className="h-5 w-5 text-emerald-300" />
                Managed Locations
                <span className="ml-auto text-emerald-300 font-semibold">{workerLocations.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workerLocations.length === 0 ? (
                <div className="text-slate-400 text-sm py-4 text-center">
                  No locations linked to this worker
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {workerLocations.map(loc => {
                    const locDevices = devices.filter(d => d.location_id === loc.id);
                    const locOnline = locDevices.filter(d => d.is_reachable).length;
                    return (
                      <button
                        key={loc.id}
                        onClick={() => navigate(`/locations/${loc.id}`)}
                        className="text-left bg-slate-900/60 border border-slate-700 rounded-lg p-3 hover:bg-slate-900 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-slate-100 font-medium text-sm truncate">{loc.name}</div>
                            <div className="text-slate-400 text-[11px] mt-0.5 truncate">
                              {loc.project ? `${loc.project} · ` : ''}{loc.area || 'No area'}
                            </div>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <div className="text-xs text-emerald-300 font-semibold tabular-nums">
                              {locOnline}/{locDevices.length}
                            </div>
                            <div className="text-[10px] text-slate-500">online</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Live aggregated telemetry — full width */}
      <div className="mb-6">
        <LocationTelemetry
          devices={workerDevices.map(d => ({ id: d.id, hostname: d.hostname }))}
          title="Worker Telemetry"
          entityLabel="worker"
        />
      </div>

      {/* Activity Log — full width */}
      
    </div>
  );
}

function InfoRow({
  icon, label, value, mono = false,
}: {
  icon?: React.ReactNode; label: string; value: string; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-400 flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className={`text-sm font-semibold text-slate-100 text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function KpiTile({
  label, value, accent = 'cyan', icon, sub,
}: {
  label: string; value: string; accent?: 'cyan' | 'emerald' | 'amber' | 'red' | 'violet'; icon?: React.ReactNode; sub?: string;
}) {
  const styles: Record<string, { fg: string; bg: string; border: string }> = {
    cyan:    { fg: 'text-cyan-300',    bg: 'bg-cyan-500/10',    border: 'border-cyan-600/30' },
    emerald: { fg: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-600/30' },
    amber:   { fg: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-600/30' },
    red:     { fg: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-600/30' },
    violet:  { fg: 'text-violet-300',  bg: 'bg-violet-500/10',  border: 'border-violet-600/30' },
  };
  const c = styles[accent];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
      <div className="flex items-center gap-2 text-xs text-slate-300">
        {icon}<span>{label}</span>
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${c.fg}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
