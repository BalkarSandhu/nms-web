import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchAllDevices } from '@/store/deviceSlice';
import { authenticatedFetch } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Activity, Server, FileText, Signal, AlertCircle, CheckCircle2, Power, Monitor, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MapViewer from '../dashboard/local-components/Map-Viewer';
import type { MapDataPoint } from '../dashboard/local-components/Map-Viewer';
import DeviceStatistics from '../locations/Devicestatistics';

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

export default function DeviceDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

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

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [mapDataPoints, setMapDataPoints] = useState<MapDataPoint[]>([]);

  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('24h');
  const [granularity, setGranularity] = useState<Granularity>('hourly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

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

      setLogs(generatedLogs);
    }
  }, [device]);

  if (!device) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="shadow-lg border-0 bg-white max-w-md w-full">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-16 w-16 mx-auto text-slate-400 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Device Not Found</h2>
            <p className="text-slate-600 mb-6">The requested device could not be located.</p>
            <Button onClick={() => navigate('/devices')} className="w-full">
              Back to Devices
            </Button>
          </CardContent>
        </Card>
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

  const getLogLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  const getLogLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'bg-emerald-100 text-emerald-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      case 'warning':
        return 'bg-amber-100 text-amber-700';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const chartData = useMemo(() => {
    return historyData
      .filter((entry) => entry.latency_ms !== undefined && entry.latency_ms !== null)
      .map((entry) => ({
        timestamp: entry.timestamp,
        timeLabel: new Date(entry.timestamp).toLocaleString(),
        latency: Number(entry.latency_ms.toFixed(2)),
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [historyData]);

  const isDeviceOnline = normalizeStatus(device.is_reachable);
  const hasPower = device.has_power === true;
  const isConnected = isDeviceOnline && !device.disabled;


  return (
    <div className="min-h-screen bg-slate-50 p-6">
      
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/devices')}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDeviceOnline ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <Monitor className={`h-6 w-6 ${isDeviceOnline ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">{device.display || device.hostname}</h1>
              <p className="text-sm text-slate-600">Device Details</p>
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
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Server className="h-5 w-5 text-blue-600" />
                Device Information
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Display Name</span>
                  <span className="text-sm font-semibold text-slate-900">{device.display || device.hostname}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">IP Address</span>
                  <span className="text-sm font-mono font-semibold text-slate-900">{device.ip}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Device Type</span>
                  <span className="text-sm font-semibold text-slate-900">{device.device_type?.name || 'Unknown'}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Location</span>
                  <span className="text-sm font-semibold text-slate-900">{device.location?.name || 'Unknown'}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Area</span>
                  <span className="text-sm font-semibold text-slate-900">{device.worker?.name || 'N/A'}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Coordinates</span>
                  <span className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                    {device.location?.latitude && device.location?.longitude
                      ? `${device.location.latitude.toFixed(4)}, ${device.location.longitude.toFixed(4)}`
                      : "N/A"}
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Created</span>
                  <span className="text-sm font-semibold text-slate-900">{formatTimeAgo(device.created_at)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Last Updated</span>
                  <span className="text-sm font-semibold text-slate-900">{formatTimeAgo(device.updated_at)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Last Seen</span>
                  <span className="text-sm font-semibold text-slate-900">{formatTimeAgo(device.last_check)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device Statistics Card */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Activity className="h-5 w-5 text-amber-600" />
                Device Statistics
              </CardTitle>
            </CardHeader>

            <CardContent>
              <DeviceStatistics deviceId={device.id} />
            </CardContent>
          </Card>

          {/* Event Logs Card */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <FileText className="h-5 w-5 text-amber-600" />
                Event Logs
              </CardTitle>
            </CardHeader>
            
            <CardContent className="max-h-96 overflow-y-auto">
              {logs.length > 0 ? (
                <div className="space-y-3">
                  {logs.map(log => (
                    <div key={log.id} className={`p-4 rounded-lg border ${getLogLevelColor(log.level)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-mono text-slate-500">{log.timestamp}</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getLogLevelBadge(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-slate-900">{log.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-500">No events available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Device Location Card */}
          <Card className="shadow-lg border-0 bg-white overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <MapPin className="h-5 w-5 text-cyan-600" />
                Device Location
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="h-96 bg-slate-50">
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
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-500 text-lg">Map coordinates not available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Network Performance Card */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-slate-900">Network Performance</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Button
                  size="sm"
                  variant={timeRange === '24h' ? 'default' : 'outline'}
                  onClick={() => {
                    setTimeRange('24h');
                    setGranularity('hourly');
                  }}
                >
                  24h
                </Button>
                <Button
                  size="sm"
                  variant={timeRange === '7d' ? 'default' : 'outline'}
                  onClick={() => {
                    setTimeRange('7d');
                    setGranularity('daily');
                  }}
                >
                  1 week
                </Button>
                <Button
                  size="sm"
                  variant={timeRange === '30d' ? 'default' : 'outline'}
                  onClick={() => {
                    setTimeRange('30d');
                    setGranularity('daily');
                  }}
                >
                  1 month
                </Button>
                <Button
                  size="sm"
                  variant={timeRange === 'custom' ? 'default' : 'outline'}
                  onClick={() => setTimeRange('custom')}
                >
                  Custom
                </Button>

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm text-slate-600">Granularity:</span>
                  <select
                    className="border border-slate-300 rounded-md px-3 py-1 text-sm bg-white"
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
                <div className="flex flex-wrap gap-4 mb-6 items-end">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-700 mb-1">Start Date</label>
                    <input
                      type="datetime-local"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="border border-slate-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-700 mb-1">End Date</label>
                    <input
                      type="datetime-local"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="border border-slate-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!customStart || !customEnd) {
                        setHistoryError('Please set both start and end dates');
                        return;
                      }
                      setHistoryError(null);
                      setTimeRange('custom');
                    }}
                  >
                    Apply
                  </Button>
                </div>
              )}

              {historyLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading performance data...</p>
                  </div>
                </div>
              ) : historyError ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                    <p className="text-red-600">{historyError}</p>
                  </div>
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-500">No performance data available for the selected range</p>
                  </div>
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="timeLabel" 
                        tick={{ fontSize: 12, fill: '#64748B' }} 
                        minTickGap={50}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#64748B' }} 
                        domain={[0, 'dataMax + 10']}
                        label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="latency" 
                        stroke="#2563EB" 
                        strokeWidth={3} 
                        dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#2563EB', strokeWidth: 2 }}
                        name="Latency (ms)" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );    
}