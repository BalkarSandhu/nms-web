import React from 'react';
import { Card } from '@/components/ui/card';

interface DevicesSummaryProps {
  total: number;
  online: number;
  offline: number;
}

export const DevicesSummary: React.FC<DevicesSummaryProps> = ({ total, online, offline }) => (
  <div className="flex gap-4 mb-4 w-full">
    <Card className="flex-1 p-4 flex flex-col items-center bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
      <span className="text-lg font-semibold text-blue-700">Total Devices</span>
      <span className="text-2xl font-bold text-blue-900">{total}</span>
    </Card>
    <Card className="flex-1 p-4 flex flex-col items-center bg-gradient-to-br from-green-50 to-green-100 border-green-200">
      <span className="text-lg font-semibold text-green-700">Online</span>
      <span className="text-2xl font-bold text-green-900">{online}</span>
    </Card>
    <Card className="flex-1 p-4 flex flex-col items-center bg-gradient-to-br from-red-50 to-red-100 border-red-200">
      <span className="text-lg font-semibold text-red-700">Offline</span>
      <span className="text-2xl font-bold text-red-900">{offline}</span>
    </Card>
  </div>
);
