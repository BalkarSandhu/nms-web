import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, TrendingUp, TrendingDown, Minus, Wifi, WifiOff, Activity } from 'lucide-react';

interface Device {
  id: number;
  hostname: string;
  latency_ms: number;
  last_check:string;
  is_reachable: boolean;
  ip?: string;
}

interface NetworkHealthCardProps {
  device: Device; // Changed from devices array to single device
}

const NetworkHealthCard = ({ device }: NetworkHealthCardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  // Health status based on latency
  const getHealthStatus = (latency: number, isReachable: boolean) => {
    if (!isReachable) return { 
      status: 'Offline', 
      color: 'text-red-600', 
      bgColor: 'bg-red-50', 
      gradient: 'from-red-400 to-red-700',
      borderColor: 'border-red-200'
    };
    if (latency === 0) return { 
      status: 'Unknown', 
      color: 'text-gray-600', 
      bgColor: 'bg-gray-50', 
      gradient: 'from-gray-400 to-gray-600',
      borderColor: 'border-gray-200'
    };
    if (latency < 20) return { 
      status: 'Excellent', 
      color: 'text-green-600', 
      bgColor: 'bg-green-50', 
      gradient: 'from-green-400 to-green-700',
      borderColor: 'border-green-200'
    };
    if (latency < 50) return { 
      status: 'Fair', 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50', 
      gradient: 'from-blue-400 to-blue-700',
      borderColor: 'border-blue-200'
    };
    if (latency < 100) return { 
      status: 'Fair', 
      color: 'text-blue-600', 
      bgColor: 'bg-blude-50', 
      gradient: 'from-blue-400 to-blue-700',
      borderColor: 'border-blue-200'
    };
    return { 
      status: 'Poor', 
      color: 'text-red-600', 
      bgColor: 'bg-red-50', 
      gradient: 'from-red-400 to-red-700',
      borderColor: 'border-red-200'
    };
  };

  const getLatencyIcon = (latency: number) => {
    if (latency < 20) return TrendingDown;
    if (latency < 50) return Minus;
    return TrendingUp;
  };

  const healthStatus = getHealthStatus(device.latency_ms, device.is_reachable);
  const LatencyIcon = getLatencyIcon(device.latency_ms);

  return (
    <>
      <Card
        className="border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden"
        onClick={() => setShowDetails(true)}
      >
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-600" />
            Network Health
          </CardTitle>
        </CardHeader>

        <CardContent className="p-3">
  <div className="flex flex-col items-center">

    {/* ROW 1 → ICON + STATUS + LATENCY */}
    <div className="flex items-center gap-3 py-3">
      
      {/* Wifi Icon */}
      {device.is_reachable ? (
        <Wifi className="w-8 h-8 text-green-600 animate-pulse drop-shadow-md" />
      ) : (
        <WifiOff className="w-8 h-8 text-red-500 opacity-80" />
      )}

      {/* Status Text */}
      <span className="text-sm font-bold text-gray-800">
        {healthStatus.status}
      </span>

      {/* Latency */}
      {device.is_reachable && device.latency_ms > 0 && (
        <div className={`flex items-center gap-1 ${healthStatus.color}`}>
          <LatencyIcon className="h-4 w-4" />
          <span className="text-sm font-semibold">
            {device.latency_ms.toFixed(1)} ms
          </span>
        </div>
      )}
    </div>

    {/* ROW 2 → DEVICE INFO */}
    <div className="text-center mb-3">
  <p className="text-sm font-medium text-gray-900">{device.hostname}</p>

  <p className="text-xs font-mono mt-1 text-red-600 bg-yellow-100">
    LAST CHECK: {String(device.last_check)}
  </p>
</div>


    {/* ROW 3 → LATENCY GUIDE */}
    {device.is_reachable && (
      <div className="mt-2 pt-3 border-t border-gray-200 w-full">
        <p className="text-xs font-semibold text-gray-700 mb-2 text-center">
          Latency Guide
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-100 rounded-lg p-2">
            <p className="text-xs font-bold text-green-700">&lt; 20ms</p>
            <p className="text-xs text-green-600">Excellent</p>
          </div>
          <div className="bg-yellow-100 rounded-lg p-2">
            <p className="text-xs font-bold text-yellow-700">&lt; 50ms</p>
            <p className="text-xs text-yellow-600">Fair</p>
          </div>
          <div className="bg-red-100 rounded-lg p-2">
            <p className="text-xs font-bold text-red-700">&gt; 100ms</p>
            <p className="text-xs text-red-600">Poor</p>
          </div>
        </div>
      </div>
    )}

  </div>
</CardContent>

      </Card>

      {/* MODAL - Detailed View */}
      {showDetails && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full"
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
            <div className="p-6">
              
              {/* Status Card */}
              <div className={`${healthStatus.bgColor} border ${healthStatus.borderColor} rounded-xl p-6 mb-6`}>
                <div className="flex flex-col items-center text-center">
                  {device.is_reachable ? (
                    <Wifi className="w-20 h-20 mb-4 text-green-600 animate-pulse" />
                  ) : (
                    <WifiOff className="w-20 h-20 mb-4 text-red-500" />
                  )}
                  
                  <div
                    className={`text-3xl font-extrabold mb-2 
                                bg-gradient-to-b ${healthStatus.gradient} 
                                text-transparent bg-clip-text`}
                  >
                    {healthStatus.status}
                  </div>

                  {device.is_reachable && device.latency_ms > 0 && (
                    <div className={`flex items-center gap-2 ${healthStatus.color} text-xl font-bold`}>
                      <LatencyIcon className="h-5 w-5" />
                      {device.latency_ms.toFixed(1)} ms
                    </div>
                  )}
                </div>
              </div>

              {/* Device Details */}
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Device Name</p>
                  <p className="text-sm font-semibold text-gray-900">{device.hostname}</p>
                </div>

                {device.ip && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">IP Address</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">{device.ip}</p>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Connection Status</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${device.is_reachable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <p className={`text-sm font-semibold ${device.is_reachable ? 'text-green-600' : 'text-red-600'}`}>
                      {device.is_reachable ? 'Reachable' : 'Unreachable'}
                    </p>
                  </div>
                </div>

                {device.is_reachable && device.latency_ms > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Network Performance</p>
                    <p className={`text-sm font-semibold ${healthStatus.color}`}>
                      {device.latency_ms < 20
                        ? "Excellent - Optimal performance"
                        : device.latency_ms < 50
                        ? "Fair - Acceptable performance"
                        : device.latency_ms < 100
                        ? "Fair - May experience delays"
                        : "Poor - Significant delays expected"}
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NetworkHealthCard;