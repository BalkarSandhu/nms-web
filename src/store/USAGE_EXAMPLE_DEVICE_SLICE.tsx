// Example: How to use the device slice in your components

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchAllDevices,
  fetchDevicesPaginated,
  fetchDeviceTypes,
  createDevice,
  deleteDevice,
  createDeviceType,
  deleteDeviceType,
  type CreateDevicePayload,
} from '@/store/deviceSlice';

export function ExampleDeviceComponent() {
  const dispatch = useAppDispatch();
  
  // Select data from the store
  const { devices, deviceTypes, loading, error, paginationMeta } = useAppSelector(
    (state) => state.devices
  );

  // Fetch devices when component mounts
  useEffect(() => {
    // Option 1: Fetch all devices
    dispatch(fetchAllDevices());
    
    // Option 2: Fetch paginated devices
    // dispatch(fetchDevicesPaginated());
    
    // Fetch device types
    dispatch(fetchDeviceTypes());
  }, [dispatch]);

  // Example: Create a new device
  const handleCreateDevice = async () => {
    const newDevice: CreateDevicePayload = {
      display: 'My Device',
      hostname: 'device.example.com',
      ip: '192.168.1.100',
      port: 80,
      protocol: 'ICMP',
      device_type_id: 1,
      location_id: 1,
      check_interval: 3600,
      timeout: 30,
      imei: '',
      worker_id: 'worker-1',
    };
    
    await dispatch(createDevice(newDevice));
    // After creating, refetch devices
    dispatch(fetchAllDevices());
  };

  // Example: Delete a device
  const handleDeleteDevice = async (deviceId: number) => {
    await dispatch(deleteDevice(deviceId));
    // Device is automatically removed from store
  };

  // Example: Create a device type
  const handleCreateDeviceType = async () => {
    await dispatch(createDeviceType('New Device Type'));
    // Device type is automatically added to store
  };

  // Example: Delete a device type
  const handleDeleteDeviceType = async (typeId: number) => {
    await dispatch(deleteDeviceType(typeId));
    // Device type is automatically removed from store
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      
      <h2>Devices ({devices.length})</h2>
      <ul>
        {devices.map((device) => (
          <li key={device.id}>
            {device.display} - {device.ip}
            <button onClick={() => handleDeleteDevice(device.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <h2>Device Types ({deviceTypes.length})</h2>
      <ul>
        {deviceTypes.map((type) => (
          <li key={type.id}>
            {type.name}
            <button onClick={() => handleDeleteDeviceType(type.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <button onClick={handleCreateDevice}>Create Device</button>
      <button onClick={handleCreateDeviceType}>Create Device Type</button>
    </div>
  );
}
