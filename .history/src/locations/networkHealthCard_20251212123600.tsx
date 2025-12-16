import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

  // Calculate avg latency
  const reachableDevices = devices.filter(d => d.is_reachable);
  const totalLatency = reachableDevices.reduce((sum, d) => sum + (d.latency_ms || 0), 0);
  const avgLatency = reachableDevices.length > 0 ? totalLatency / reachableDevices.length : 0;

  // Health status
  const getHealthStatus = (latency: number) => {
    if (latency === 0) return { status: '---', color: 'text-gray-600', bgColor: 'bg-gray-50', gradient: 'from-gray-400 to-gray-600' };
    if (latency < 20) return { status: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50', gradient: 'from-green-400 to-green-700' };
    if (latency < 50) return { status: 'Fair', color: 'text-blue-600', bgColor: 'bg-blue-50', gradient: 'from-blue-400 to-blue-700' };
    if (latency < 100) return { status: 'Fair', color: 'text-blue-600', bgColor: 'bg-blue-50', gradient: 'from-blue-400 to-blue-700' };
    return { status: 'Poor', color: 'text-red-600', bgColor: 'bg-red-50', gradient: 'from-red-400 to-red-700' };
  };

  const getLatencyStatus = (latency: number) => {
    if (latency < 20) return { color: 'text-green-600', icon: TrendingDown };
    if (latency < 50) return { color: 'text-blue-600', icon: Minus };
    if (latency < 100) return { color: 'text-orange-600', icon: TrendingUp };
    return { color: 'text-red-600', icon: TrendingUp };
  };

  const healthStatus = getHealthStatus(avgLatency);

  return (
    <>
      <Card
        className="border border-gray-200 shadow-md hover:shadow-lg transition cursor-pointer rounded-2xl bg-white/70 backdrop-blur-xl"
        onClick={() => setShowDetails(true)}
      >
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-900">Network Health</CardTitle>
        </CardHeader>

        <CardContent className="p-2">

  {/* FIXED LAYOUT – 40% LEFT / 60% RIGHT */}
  <div className="flex w-full">

    {/* LEFT COLUMN — Gradient Vertical Status (40%) */}
    <div className="w-[40%] flex flex-col items-center justify-center border-r pr-3">

      <div className="flex flex-col items-center text-center">
        <div
          className={` text-m font-extrabold tracking-wide 
                      bg-gradient-to-b ${healthStatus.gradient} 
                      text-transparent bg-clip-text`}
        >
          {healthStatus.status.split("").map((char, i) => (
            <span key={i}>{char}</span>
          ))}
        </div>

        <p className="text-gray-500 text-xs mt-2 tracking-wide">
          {avgLatency > 0 ? `${avgLatency.toFixed(1)} ms avg` : "Signal Quality"}
        </p>
      </div>

    </div>

    {/* RIGHT COLUMN — Device List (60%) */}
    <div className="w-[60%] pl-2">
      <div className="space-y-1 max-h-30 overflow-y-auto pr-2">

        {devices.map((device) => {
          const latencyInfo = getLatencyStatus(device.latency_ms);
          const IconComponent = latencyInfo.icon;

          return (
            <div
              key={device.id}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3
                         hover:bg-gray-100 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {device.hostname}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">{device.ip}</p>
                </div>

                <div className="flex items-center gap-2">
                  <p className={`text-xs font-bold ${latencyInfo.color} flex items-center gap-1`}>
                    <IconComponent className="h-4 w-4" />
                    {device.latency_ms.toFixed(1)}ms
                  </p>
                </div>
              </div>
            </div>
          );
        })}

      </div>
    </div>
    

  </div>
  <div>
  <p className="text-xs font-bold text-gray-900 mb-2">
    Latency Guide
  </p>

  <div className="flex items-center gap-3">

    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg">
      Excellent &lt; 20ms
    </span>

    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
      Fair &lt; 50ms
    </span>

    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-lg">
      Poor &lt; 100ms
    </span>

  </div>
</div>


</CardContent>

      </Card>

      {/* MODAL */}
      {showDetails && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">Network Health Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">

              {/* Summary Card */}
              <div className={`${healthStatus.bgColor} border rounded-xl p-4 mb-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Overall Network Health</p>
                    <p className={`text-2xl font-bold ${healthStatus.color}`}>{healthStatus.status}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-600">Avg Latency</p>
                    <p className={`text-2xl font-bold ${healthStatus.color}`}>
                      {avgLatency > 0 ? `${avgLatency.toFixed(1)}ms` : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 text-center">
                  <div>
                    <p className="text-xs text-gray-600">Total</p>
                    <p className="text-lg font-semibold">{devices.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Online</p>
                    <p className="text-lg font-semibold text-green-600">{reachableDevices.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Offline</p>
                    <p className="text-lg font-semibold text-red-600">{devices.length - reachableDevices.length}</p>
                  </div>
                </div>
              </div>

              {/* Device List */}
              <div className="space-y-2">
                {devices.map((device) => {
                  const latencyInfo = getLatencyStatus(device.latency_ms);
                  const IconComponent = latencyInfo.icon;

                  return (
                    <div
                      key={device.id}
                      className="bg-gray-50 border rounded-lg p-3 hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{device.hostname}</p>
                          <p className="text-xs text-gray-500">ID: {device.id}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          {device.is_reachable ? (
                            <>
                              <div className="text-right">
                                <p className={`text-lg font-bold ${latencyInfo.color} flex gap-1 items-center`}>
                                  <IconComponent className="h-4 w-4" />
                                  {device.latency_ms.toFixed(1)}ms
                                </p>
                                <p className="text-xs text-gray-500">
                                  {device.latency_ms < 20
                                    ? "Excellent"
                                    : device.latency_ms < 50
                                    ? "Fair"
                                    : device.latency_ms < 100
                                    ? "Fair"
                                    : "Poor"}
                                </p>
                              </div>
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            </>
                          ) : (
                            <>
                              <div className="text-right">
                                <p className="text-sm font-medium text-red-600">Offline</p>
                                <p className="text-xs text-gray-500">Not reachable</p>
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
