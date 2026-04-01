import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { authenticatedFetch } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Activity, Server,Signal, AlertCircle, CheckCircle2, Power, Monitor } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import MapViewer from '../dashboard/local-components/Map-Viewer';
import type { MapDataPoint } from '../dashboard/local-components/Map-Viewer';
import DeviceStatistics from '../locations/Devicestatistics';
import PacketLossCard from './PacketLossCard';
import AvgJitterCard from './AvgJitterCard';
import AvgLatencyCard from './AvgLatencyCard';

type LogEntry = {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
};

const normalizeStatus = (status: any): boolean => {
  if (status === 'unknown' || status === 'Unknown' || status === null || status === undefined) {
    return false;
  }
  return status;
};

const getStatusDisplay = (status: any): string => {
  const normalized = normalizeStatus(status);
  return normalized ? 'true' : 'false';
};

const getLatencyColor = (latency: number) => {
  if (latency <= 80) {
    return { label: 'Excellent', color: '#22c55e', tailwind: 'text-emerald-400' };
  }
  if (latency <= 120) {
    return { label: 'Warning', color: '#f59e0b', tailwind: 'text-amber-400' };
  }
  return { label: 'High', color: '#ef4444', tailwind: 'text-red-400' };
};

const renderLatencyDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx === null || cy === null) return null;
  const { latency } = payload;
  const color = getLatencyColor(latency).color;
  return <circle cx={cx} cy={cy} r={3} fill={color} stroke="#ffffff" strokeWidth={1} />;
};

export default function DeviceDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const deviceId = Number(searchParams.get('id'));

  const { devices } = useAppSelector(state => state.devices);

  type HistoryEntry = {
    id: number;
    device_id: number;
    timestamp: string;
    is_reachable: boolean;
    latency_ms: number;
    jitter_ms: number;
    packet_loss_percent: number;
    source: string;
  };

  type TimeRangeKey = '24h' | '7d' | '30d' | 'custom';
  type Granularity = 'raw' | 'hourly' | 'daily';

  const [mapDataPoints, setMapDataPoints] = useState<MapDataPoint[]>([]);

  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('24h');
  const [granularity, setGranularity] = useState<Granularity>('hourly');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [uptimeData, setUptimeData] = useState<any>(null);
  const [ setUptimeLoading] = useState(false);
  const [_, setUptimeError] = useState<string | null>(null);

  const device = devices.find(d => d.id === deviceId);

  const toRFC3339 = (value: Date) => {
    return value.toISOString();
  };

  const computeRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);
    let gran: Granularity = 'hourly';

    if (timeRange === '24h') {
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      gran = 'hourly';
    } else if (timeRange === '7d') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      gran = 'daily';
    } else if (timeRange === '30d') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      gran = 'daily';
    } else {
      if (customStart && customEnd) {
        start = new Date(customStart);
        end = new Date(customEnd);
      } else {
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        gran = 'hourly';
      }
    }

    const effectiveGranularity = timeRange === 'custom' ? granularity : gran;
    return { start, end, granularity: effectiveGranularity };
  };

  useEffect(() => {
    if (!deviceId) {
      return;
    }

    const { start, end, granularity: requestGranularity } = computeRange();

    const startRFC = toRFC3339(start);
    const endRFC = toRFC3339(end);

    setHistoryLoading(true);
    setHistoryError(null);

    const baseUrl = `${import.meta.env.VITE_NMS_HOST}/devices/${deviceId}/history`;
    const params = new URLSearchParams();
    params.append('start', startRFC);
    params.append('end', endRFC);
    params.append('granularity', requestGranularity);

    if (requestGranularity === 'raw') {
      params.append('page', '1');
      params.append('page_size', '1000');
    }

    authenticatedFetch(`${baseUrl}?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`History API error ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        if (json && Array.isArray(json.data)) {
          setHistoryData(json.data);
        } else {
          setHistoryData([]);
          setHistoryError('History response format is invalid');
        }
      })
      .catch((err) => {
        setHistoryError(err.message || 'Failed to fetch history');
        setHistoryData([]);
      })
      .finally(() => setHistoryLoading(false));
  }, [deviceId, timeRange, granularity, customStart, customEnd]);

  useEffect(() => {
    if (!deviceId) return;

    setUptimeError(null);

    const baseUrl = `${import.meta.env.VITE_NMS_HOST}/devices/${deviceId}/uptime`;
    const params = new URLSearchParams();
    params.append('range', '24h'); // Default to 24h

    authenticatedFetch(`${baseUrl}?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Uptime API error ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        if (json && typeof json === 'object' && 'uptime_pct' in json) {
          setUptimeData(json);
        } else {
          setUptimeError('Uptime response format is invalid');
        }
      })
      .catch((err) => {
        setUptimeError(err.message || 'Failed to fetch uptime');
      })
  }, [deviceId]);

  useEffect(() => {
    if (device && device.location?.latitude && device.location?.longitude) {
      const isOnline = normalizeStatus(device.is_reachable);
      const dataPoints: MapDataPoint[] = [{
        id: device.id,
        name: device.hostname,
        coordinates: [device.location.longitude, device.location.latitude] as [number, number],
        value: isOnline ? 1 : 0,
        category: isOnline ? 'green' : 'red',
        popupData: {
          indicatorColour: isOnline ? 'green' : 'red',
          headerLeft: { field: 'Device', value: device.hostname },
          headerRight: { field: 'Status', value: getStatusDisplay(device.is_reachable) },
          sideLabel: { field: 'Location', value: device.location?.name || 'Unknown' },
          data: [
            { field: 'IP Address', value: device.ip, colour: 'white' },
            { field: 'Type', value: device.device_type?.name || 'N/A', colour: 'white' },
            { field: 'Last Updated', value: device.updated_at || 'N/A', colour: 'white' },
          ]
        },
        additionalData: {
          'device_id': device.id,
          'ip': device.ip,
          'type': device.device_type?.name || 'Unknown',
        }
      }];

      setMapDataPoints(dataPoints);
    }
  }, [device]);

  useEffect(() => {
    if (device) {
      const generatedLogs: LogEntry[] = [];
      let logId = 1;

      const deviceStatusNormalized = normalizeStatus(device.is_reachable);
      generatedLogs.push({
        id: logId++,
        timestamp: new Date(device.last_check || device.updated_at).toLocaleString(),
        level: deviceStatusNormalized ? 'success' : 'error',
        message: device.status_reason || (deviceStatusNormalized ? 'Device online' : 'Device offline'),
      });

      if (device.disabled) {
        generatedLogs.push({
          id: logId++,
          timestamp: new Date(device.updated_at).toLocaleString(),
          level: 'warning',
          message: 'Device is disabled',
        });
      }

      generatedLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    }
  }, [device]);

  if (!device) {
    return (
      <div className="p-2 text-center">
        <p className="text-m text-gray-500">Device not found</p>
        <Button onClick={() => navigate('/devices')} className="mt-4">
          Back to Devices
        </Button>
      </div>
    );
  }

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  
  

const chartData = useMemo(() => {
    return historyData
      .filter((entry) => entry.latency_ms !== undefined && entry.latency_ms !== null)
      .map((entry) => {
        const latencyValue = Number(entry.latency_ms.toFixed(2));
        const latencyStatus = getLatencyColor(latencyValue);
        return {
          timestamp: entry.timestamp,
          timeLabel: new Date(entry.timestamp).toLocaleString(),
          latency: latencyValue,
          latencyStatus,
        };
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [historyData]);

  const averageLatency = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    return chartData.reduce((sum, entry) => sum + entry.latency, 0) / chartData.length;
  }, [chartData]);

  const latencySummary = getLatencyColor(averageLatency);
  const isDeviceOnline = normalizeStatus(device.is_reachable);
  const hasPower = device.has_power === true;
  const isConnected = isDeviceOnline && !device.disabled;


  return (
    <div className="min-h-screen bg-gray-900 p-6">
      
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/devices')}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-300" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDeviceOnline ? 'bg-green-900' : 'bg-red-900'}`}>
              <Monitor className={`h-6 w-6 ${isDeviceOnline ? 'text-green-400' : 'text-red-400'}`} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">{device.display || device.hostname}</h1>
              <p className="text-sm text-gray-400">Device Details</p>
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full font-medium text-sm flex items-center gap-2 ${
            hasPower ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}>
            <Power className="h-4 w-4" />
            {hasPower ? 'Powered' : 'No Power'}
          </div>

          <div className={`px-3 py-1 rounded-full font-medium text-sm flex items-center gap-2 ${
            isDeviceOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}>
            <Signal className="h-4 w-4" />
            {isDeviceOnline ? 'Online' : 'Offline'}
          </div>

          <div className={`px-3 py-1 rounded-full font-medium text-sm flex items-center gap-2 ${
            isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          
          {/* Device Information Card */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                <Server className="h-5 w-5 text-cyan-400" />
                Device Information
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium ">Display Name</span>
                  <span className="text-sm font-semibold ">{device.display || device.hostname}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium ">IP Address</span>
                  <span className="text-sm font-mono font-semibold ">{device.ip}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium ">Device Type</span>
                  <span className="text-sm font-semibold ">{device.device_type?.name || 'Unknown'}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium ">Location</span>
                  <span className="text-sm font-semibold ">{device.location?.name || 'Unknown'}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium ">Area</span>
                  <span className="text-sm font-semibold ">{device.worker?.name || 'N/A'}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium ">Coordinates</span>
                  <span className="text-sm font-semibold  flex items-center gap-1">
                    {device.location?.latitude && device.location?.longitude
                      ? `${device.location.latitude.toFixed(4)}, ${device.location.longitude.toFixed(4)}`
                      : "N/A"}
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium ">Created</span>
                  <span className="text-sm font-semibold ">{formatTimeAgo(device.created_at)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium ">Last Updated</span>
                  <span className="text-sm font-semibold ">{formatTimeAgo(device.updated_at)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium ">Last Seen</span>
                  <span className="text-sm font-semibold ">{formatTimeAgo(device.last_check)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device Statistics Card */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                <Activity className="h-5 w-5 text-emerald-300" />
                Device Statistics
              </CardTitle>
            </CardHeader>

            <CardContent>
              <DeviceStatistics deviceId={device.id} />
            </CardContent>
          </Card>

          
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 space-y-2">

                      {uptimeData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PacketLossCard value={uptimeData.avg_packet_loss_percent} />
              <AvgJitterCard value={uptimeData.avg_jitter_ms} />
              <AvgLatencyCard value={uptimeData.avg_latency_ms} />
            </div>
          )}
          <div className="grid grid-cols-1 gap-2">
            {/* Device Availability Graph */}
            

          {/* Network Performance Graph */}
            <Card className="border border-slate-700 shadow-lg bg-slate-800 text-slate-100 hover:shadow-xl transition">
              <CardHeader>
                <CardTitle className="text-m font-semibold text-white">Network Performance</CardTitle>
              </CardHeader>

               

              <CardContent className="p-3">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={
                      timeRange === '24h'
                        ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                        : 'bg-slate-300 text-black hover:bg-slate-200'
                    }
                    onClick={() => {
                      setTimeRange('24h');
                      setGranularity('hourly');
                    }}
                  >24h</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={
                      timeRange === '7d'
                        ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                        : 'bg-slate-300 text-black hover:bg-slate-200'
                    }
                    onClick={() => {
                      setTimeRange('7d');
                      setGranularity('daily');
                    }}
                  >1 week</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={
                      timeRange === '30d'
                        ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                        : 'bg-slate-300 text-black hover:bg-slate-200'
                    }
                    onClick={() => {
                      setTimeRange('30d');
                      setGranularity('daily');
                    }}
                  >1 month</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={
                      timeRange === 'custom'
                        ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                        : 'bg-slate-300 text-black hover:bg-slate-200'
                    }
                    onClick={() => setTimeRange('custom')}
                  >Custom</Button>

                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-slate-400">Granularity:</span>
                    <select
                      className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100"
                      value={granularity}
                      onChange={(e) => setGranularity(e.target.value as Granularity)}
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="raw">Raw</option>
                    </select>
                  </div>
                </div>

                {timeRange === 'custom' && (
                  <div className="flex flex-wrap gap-2 mb-3 items-center">
                    <div className="flex flex-col text-xs text-gray-600">
                      <label>Start</label>
                      <input
                        type="datetime-local"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="border rounded px-2 py-1"
                      />
                    </div>
                    <div className="flex flex-col text-xs text-gray-600">
                      <label>End</label>
                      <input
                        type="datetime-local"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="border rounded px-2 py-1"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!customStart || !customEnd) {
                          setHistoryError('For custom range, please set both start and end');
                          return;
                        }
                        setHistoryError(null);
                        setTimeRange('custom');
                      }}
                    >Apply</Button>
                  </div>
                )}

                {historyLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-slate-400">Loading history...</p>
                  </div>
                ) : historyError ? (
                  <div className="h-64 flex items-center justify-center text-red-400">{historyError}</div>
                ) : chartData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">No history data for selected range</div>
                ) : (
                  <div className="h-64">
                    <div className="mb-2 text-sm">
                      <span className="font-medium">Average latency:</span>
                      <span className={`ml-2 ${latencySummary.tailwind}`}>{averageLatency.toFixed(2)}ms ({latencySummary.label})</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: '#cbd5e1' }} minTickGap={16} />
                        <YAxis tick={{ fontSize: 10, fill: '#cbd5e1' }} domain={[0, 'dataMax + 10']} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#e2e8f0' }} labelStyle={{ color: '#cbd5e1' }} />
                        <Line type="monotone" dataKey="latency" stroke={latencySummary.color} strokeWidth={2} dot={renderLatencyDot} name="Latency (ms)" />
                        <ReferenceArea y1={0} y2={80} fill="#16a34a" fillOpacity={0.05} />
                        <ReferenceArea y1={80} y2={120} fill="#fbbf24" fillOpacity={0.05} />
                        <ReferenceArea y1={120} y2="dataMax" fill="#ef4444" fillOpacity={0.05} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          
          
          {/* Map Card */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden h-126">
            <CardHeader>
              <CardTitle className="flex items-center gap-1 text-m font-semibold text-gray-900">
                <MapPin className="h-5 w-5 text-cyan-600" />
                Device Location
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 m-0 h-full">
              <div className="h-full overflow-hidden bg-white">
                {device.location?.latitude && device.location?.longitude ? (
                  <MapViewer
                    data={mapDataPoints}
                    connections={[]}
                    centerCoordinates={[device.location.longitude, device.location.latitude]}
                    zoom={14}
                    showLabels={true}
                    pointSize={16}
                    enableZoom={true}
                    enablePan={true}
                    mapFlavor="dark"
                    autoZoomToDensity={false}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500">Map coordinates not available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          

          {/* Graphs Section */}
          
        </div>
      </div>
    </div>
  );    
}