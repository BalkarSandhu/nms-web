import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchAllDevices } from '@/store/deviceSlice';
import { authenticatedFetch } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    ArrowLeft, MapPin, Activity, Server, FileText, Signal, AlertCircle, 
    CheckCircle2, Power, Monitor, TrendingUp, TrendingDown, Clock, Zap, Network
} from 'lucide-react';
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
    return normalized ? 'Online' : 'Offline';
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

    const toRFC3339 = (value: Date) => value.toISOString();

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
        if (!deviceId) return;

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
                if (!res.ok) throw new Error(`History API error ${res.status}`);
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
                message: device.status_reason || (deviceStatusNormalized ? 'Device is online' : 'Device is offline'),
            });

            if (device.disabled) {
                generatedLogs.push({
                    id: logId++,
                    timestamp: new Date(device.updated_at).toLocaleString(),
                    level: 'warning',
                    message: 'Device is disabled',
                });
            }

            generatedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setLogs(generatedLogs);
        }
    }, [device]);

    if (!device) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500/50 mx-auto mb-4" />
                    <p className="text-gray-400 mb-6">Device not found</p>
                    <Button 
                        onClick={() => navigate('/devices')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Back to Devices
                    </Button>
                </div>
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
                return 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-300';
            case 'error':
                return 'bg-gradient-to-r from-red-500/20 to-red-500/5 border-red-500/30 text-red-300';
            case 'warning':
                return 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-300';
            case 'info':
            default:
                return 'bg-gradient-to-r from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-300';
        }
    };

    const getLogLevelBadge = (level: LogEntry['level']) => {
        switch (level) {
            case 'success':
                return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
            case 'error':
                return 'bg-red-500/20 text-red-300 border border-red-500/40';
            case 'warning':
                return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
            case 'info':
            default:
                return 'bg-blue-500/20 text-blue-300 border border-blue-500/40';
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
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            
            {/* Header */}
            <div className="sticky top-0 z-20 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-md">
                <div className="px-6 py-4 flex items-start justify-between gap-4">
                    <button 
                        onClick={() => navigate('/devices')}
                        className="p-2 rounded-lg border border-gray-700/50 bg-gray-900/50 hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-lg ${isDeviceOnline ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                <Monitor className={`h-5 w-5 ${isDeviceOnline ? 'text-emerald-400' : 'text-red-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl font-semibold text-gray-100 truncate">{device.display || device.hostname}</h1>
                                <p className="text-sm text-gray-500 font-mono">{device.ip}</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <StatusBadge 
                                icon={hasPower ? Zap : AlertCircle}
                                label={hasPower ? 'Power: ON' : 'No Power'}
                                active={hasPower}
                            />
                            <StatusBadge 
                                icon={Signal}
                                label={isDeviceOnline ? 'Online' : 'Offline'}
                                active={isDeviceOnline}
                            />
                            <StatusBadge 
                                icon={isConnected ? CheckCircle2 : AlertCircle}
                                label={isConnected ? 'Connected' : 'Disconnected'}
                                active={isConnected}
                            />
                        </div>
                    </div>

                    <div className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-2 whitespace-nowrap border ${
                        isDeviceOnline 
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' 
                            : 'bg-red-500/20 border-red-500/30 text-red-300'
                    }`}>
                        {isDeviceOnline ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {getStatusDisplay(device.is_reachable)}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LEFT COLUMN */}
                    <div className="space-y-6">
                        
                        {/* Device Information */}
                        <ProfessionalCard icon={<Server className="h-5 w-5 text-blue-400" />} title="Device Information">
                            <div className="space-y-3">
                                <InfoRow label="Display Name" value={device.display || device.hostname} />
                                <Divider />
                                <InfoRow label="IP Address" value={device.ip} />
                                <Divider />
                                <InfoRow label="Device Type" value={device.device_type?.name || 'Unknown'} />
                                <Divider />
                                <InfoRow label="Location" value={device.location?.name || 'Unknown'} />
                                <Divider />
                                <InfoRow label="Area" value={device.worker?.name || 'N/A'} />
                                <Divider />
                                <InfoRow 
                                    label="Coordinates" 
                                    value={device.location?.latitude && device.location?.longitude
                                        ? `${device.location.latitude.toFixed(4)}, ${device.location.longitude.toFixed(4)}`
                                        : "N/A"} 
                                />
                                <Divider />
                                <InfoRow label="Created" value={formatTimeAgo(device.created_at)} />
                                <Divider />
                                <InfoRow label="Last Updated" value={formatTimeAgo(device.updated_at)} />
                                <Divider />
                                <InfoRow label="Last Seen" value={formatTimeAgo(device.last_check)} />
                            </div>
                        </ProfessionalCard>

                        {/* Device Statistics */}
                        <ProfessionalCard icon={<Activity className="h-5 w-5 text-amber-400" />} title="Device Statistics">
                            <DeviceStatistics deviceId={device.id} />
                        </ProfessionalCard>

                        {/* Event Logs */}
                        <ProfessionalCard icon={<FileText className="h-5 w-5 text-cyan-400" />} title="Event Logs">
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {logs.length > 0 ? logs.map(log => (
                                    <div key={log.id} className={`border rounded-lg p-3 ${getLogLevelColor(log.level)}`}>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <span className="text-xs text-gray-500 font-mono">{log.timestamp}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getLogLevelBadge(log.level)}`}>
                                                {log.level.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="text-sm">{log.message}</div>
                                    </div>
                                )) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <FileText className="h-8 w-8 mx-auto opacity-30 mb-2" />
                                        <p className="text-xs">No events</p>
                                    </div>
                                )}
                            </div>
                        </ProfessionalCard>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Map */}
                        <ProfessionalCard icon={<MapPin className="h-5 w-5 text-cyan-400" />} title="Device Location" fullHeight>
                            <div className="h-96 rounded-lg overflow-hidden bg-gray-900/50 border border-gray-800/50">
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
                                            <MapPin className="h-12 w-12 mx-auto text-gray-700 mb-3" />
                                            <p className="text-gray-500 text-sm">Coordinates not available</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ProfessionalCard>

                        {/* Network Performance */}
                        <ProfessionalCard icon={<Network className="h-5 w-5 text-purple-400" />} title="Network Performance">
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    <TimeRangeButton active={timeRange === '24h'} onClick={() => { setTimeRange('24h'); setGranularity('hourly'); }}>24h</TimeRangeButton>
                                    <TimeRangeButton active={timeRange === '7d'} onClick={() => { setTimeRange('7d'); setGranularity('daily'); }}>1 week</TimeRangeButton>
                                    <TimeRangeButton active={timeRange === '30d'} onClick={() => { setTimeRange('30d'); setGranularity('daily'); }}>1 month</TimeRangeButton>
                                    <TimeRangeButton active={timeRange === 'custom'} onClick={() => setTimeRange('custom')}>Custom</TimeRangeButton>

                                    <div className="ml-auto flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Granularity:</span>
                                        <select
                                            className="bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1 text-xs text-gray-300 hover:border-gray-600"
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
                                    <div className="flex flex-wrap gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-800/50">
                                        <div className="flex flex-col">
                                            <label className="text-xs text-gray-500 mb-1">Start</label>
                                            <input
                                                type="datetime-local"
                                                value={customStart}
                                                onChange={(e) => setCustomStart(e.target.value)}
                                                className="bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1 text-xs text-gray-300"
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-xs text-gray-500 mb-1">End</label>
                                            <input
                                                type="datetime-local"
                                                value={customEnd}
                                                onChange={(e) => setCustomEnd(e.target.value)}
                                                className="bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1 text-xs text-gray-300"
                                            />
                                        </div>
                                    </div>
                                )}

                                {historyLoading ? (
                                    <div className="h-64 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="animate-spin mb-2">
                                                <Activity className="h-6 w-6 text-blue-500" />
                                            </div>
                                            <p className="text-gray-500 text-sm">Loading history...</p>
                                        </div>
                                    </div>
                                ) : historyError ? (
                                    <div className="h-64 flex items-center justify-center">
                                        <div className="text-center">
                                            <AlertCircle className="h-8 w-8 text-red-500/50 mx-auto mb-2" />
                                            <p className="text-red-400 text-sm">{historyError}</p>
                                        </div>
                                    </div>
                                ) : chartData.length === 0 ? (
                                    <div className="h-64 flex items-center justify-center">
                                        <p className="text-gray-500 text-sm">No history data for selected range</p>
                                    </div>
                                ) : (
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                                <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: '#9CA3AF' }} minTickGap={16} />
                                                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} domain={[0, 'dataMax + 10']} />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#111827', 
                                                        border: '1px solid #374151',
                                                        borderRadius: '6px'
                                                    }}
                                                    labelStyle={{ color: '#9CA3AF' }}
                                                />
                                                <Line type="monotone" dataKey="latency" stroke="#3B82F6" strokeWidth={2} dot={false} name="Latency (ms)" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </ProfessionalCard>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components
function StatusBadge({ icon: Icon, label, active }: any) {
    return (
        <div className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-2 border ${
            active 
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' 
                : 'bg-red-500/20 border-red-500/30 text-red-300'
        }`}>
            <Icon className="h-4 w-4" />
            {label}
        </div>
    );
}

function ProfessionalCard({ icon, title, children, fullHeight }: any) {
    return (
        <div className={`rounded-lg border border-gray-800/50 bg-gradient-to-br from-gray-900/40 to-gray-900/20 backdrop-blur-sm overflow-hidden hover:border-gray-700/50 transition-all ${fullHeight ? 'h-full' : ''}`}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800/50 bg-gray-900/50">
                {icon}
                <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
            </div>
            <div className="p-4">
                {children}
            </div>
        </div>
    );
}

function InfoRow({ label, value }: any) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">{label}</span>
            <span className="text-sm font-mono text-gray-300 text-right">{value}</span>
        </div>
    );
}

function Divider() {
    return <div className="h-px bg-gray-800/30"></div>;
}

function TimeRangeButton({ active, onClick, children }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all border ${
                active
                    ? 'bg-blue-600/80 border-blue-500/50 text-white'
                    : 'bg-gray-900/50 border-gray-700/50 text-gray-400 hover:border-gray-600/80 hover:text-gray-300'
            }`}
        >
            {children}
        </button>
    );
}