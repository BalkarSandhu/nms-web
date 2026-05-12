import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

interface Device {
  id: number;
  hostname: string;
  latency_ms: number;
  is_reachable: boolean;
  ip?: string;
}

interface NetworkHealthCardProps {
  devices: Device[];
}

const NetworkHealthCard = ({ devices }: NetworkHealthCardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const reachableDevices = devices.filter(d => d.is_reachable);
  const totalLatency = reachableDevices.reduce((sum, d) => sum + (d.latency_ms || 0), 0);
  const avgLatency = reachableDevices.length > 0 ? totalLatency / reachableDevices.length : 0;

  const getHealthStatus = (latency: number) => {
    if (latency === 0 || latency === -1) {
      return { status: '---', color: 'text-slate-400', bgWrap: 'bg-slate-800/60 border-slate-700', gradient: 'from-slate-400 to-slate-600' };
    }
    if (latency < 20)  return { status: 'Excellent', color: 'text-emerald-300', bgWrap: 'bg-emerald-500/10 border-emerald-600/30', gradient: 'from-emerald-300 to-emerald-500' };
    if (latency < 50)  return { status: 'Good',      color: 'text-cyan-300',    bgWrap: 'bg-cyan-500/10 border-cyan-600/30',       gradient: 'from-cyan-300 to-cyan-500' };
    if (latency < 100) return { status: 'Fair',      color: 'text-amber-300',   bgWrap: 'bg-amber-500/10 border-amber-600/30',     gradient: 'from-amber-300 to-amber-500' };
    return                    { status: 'Poor',      color: 'text-red-300',     bgWrap: 'bg-red-500/10 border-red-600/30',         gradient: 'from-red-300 to-red-500' };
  };

  const getLatencyStatus = (latency: number) => {
    if (latency === -1)           return { color: 'text-slate-400',   icon: Minus };
    if (latency < 20)             return { color: 'text-emerald-300', icon: TrendingDown };
    if (latency < 50)             return { color: 'text-cyan-300',    icon: Minus };
    if (latency < 100)            return { color: 'text-amber-300',   icon: TrendingUp };
    return                              { color: 'text-red-300',     icon: TrendingUp };
  };

  const healthStatus = getHealthStatus(avgLatency);

  return (
    <>
      <Card
        className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100 cursor-pointer overflow-hidden hover:bg-slate-800/80 transition"
        onClick={() => setShowDetails(true)}
      >
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
            <Activity className="h-5 w-5 text-violet-300" />
            Network Health
          </CardTitle>
        </CardHeader>

        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-4 text-slate-400">
              <Activity className="h-8 w-8 mx-auto opacity-50 mb-2" />
              <p className="text-sm">No devices</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              <div className="text-center pb-3 border-b border-slate-700">
                <div
                  className={`text-2xl font-extrabold tracking-wide bg-gradient-to-b ${healthStatus.gradient} text-transparent bg-clip-text mb-1`}
                >
                  {healthStatus.status}
                </div>
                <p className="text-slate-400 text-sm">
                  {avgLatency > 0 ? `${avgLatency.toFixed(1)} ms avg` : "Signal Quality"}
                </p>
              </div>

              {/* Device List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {devices.map((device) => {
                  const latencyInfo = getLatencyStatus(device.latency_ms);
                  const IconComponent = latencyInfo.icon;
                  return (
                    <div
                      key={device.id}
                      className="bg-slate-900/60 border border-slate-700 rounded-lg p-2 hover:bg-slate-900 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-100 truncate">{device.hostname}</p>
                          {device.ip && (
                            <p className="text-xs text-slate-400 font-mono truncate">{device.ip}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {device.is_reachable ? (
                            <p className={`text-sm font-bold ${latencyInfo.color} flex items-center gap-1 whitespace-nowrap`}>
                              <IconComponent className="h-4 w-4" />
                              {device.latency_ms.toFixed(1)}ms
                            </p>
                          ) : (
                            <p className="text-sm font-bold text-red-300 whitespace-nowrap">Offline</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Latency Guide */}
              <div className="pt-3 border-t border-slate-700">
                <p className="text-xs font-bold text-slate-300 mb-2">Latency Guide</p>
                <div className="grid grid-cols-3 gap-2">
                  <span className="px-2 py-1 bg-emerald-500/15 text-emerald-300 text-xs font-semibold rounded-lg text-center">&lt; 20ms</span>
                  <span className="px-2 py-1 bg-cyan-500/15 text-cyan-300 text-xs font-semibold rounded-lg text-center">&lt; 50ms</span>
                  <span className="px-2 py-1 bg-red-500/15 text-red-300 text-xs font-semibold rounded-lg text-center">&gt; 100ms</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL */}
      {showDetails && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Network Health Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1 hover:bg-slate-700 rounded transition"
              >
                <X className="h-5 w-5 text-slate-300" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className={`${healthStatus.bgWrap} border rounded-xl p-4 mb-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Overall Network Health</p>
                    <p className={`text-2xl font-bold ${healthStatus.color}`}>{healthStatus.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Avg Latency</p>
                    <p className={`text-2xl font-bold ${healthStatus.color}`}>
                      {avgLatency > 0 ? `${avgLatency.toFixed(1)}ms` : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 text-center">
                  <div>
                    <p className="text-xs text-slate-400">Total</p>
                    <p className="text-lg font-semibold text-slate-100">{devices.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Online</p>
                    <p className="text-lg font-semibold text-emerald-300">{reachableDevices.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Offline</p>
                    <p className="text-lg font-semibold text-red-300">{devices.length - reachableDevices.length}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {devices.map((device) => {
                  const latencyInfo = getLatencyStatus(device.latency_ms);
                  const IconComponent = latencyInfo.icon;
                  return (
                    <div
                      key={device.id}
                      className="bg-slate-900/60 border border-slate-700 rounded-lg p-3 hover:bg-slate-900 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{device.hostname}</p>
                          <p className="text-xs text-slate-400">ID: {device.id}</p>
                          {device.ip && (
                            <p className="text-xs text-slate-400 font-mono mt-1">{device.ip}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {device.is_reachable ? (
                            <>
                              <div className="text-right">
                                <p className={`text-lg font-bold ${latencyInfo.color} flex gap-1 items-center`}>
                                  <IconComponent className="h-4 w-4" />
                                  {device.latency_ms.toFixed(1)}ms
                                </p>
                                <p className="text-xs text-slate-400">
                                  {device.latency_ms < 20 ? "Excellent" :
                                   device.latency_ms < 50 ? "Good" :
                                   device.latency_ms < 100 ? "Fair" : "Poor"}
                                </p>
                              </div>
                              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                            </>
                          ) : (
                            <>
                              <div className="text-right">
                                <p className="text-sm font-medium text-red-300">Offline</p>
                                <p className="text-xs text-slate-400">Not reachable</p>
                              </div>
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NetworkHealthCard;
