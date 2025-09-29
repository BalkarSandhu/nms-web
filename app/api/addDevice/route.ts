import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const {
      selectedProtocol,
      selectedLocation,
      // selectedPreviousNode,
      selectedDeviceType,
      setName,
      setcamera_ip,
      lat,
      long,
      port,
      username,
      password,
      imei
    } = body;

    
    const payload: any = {
      protocol: selectedProtocol,
      location: selectedLocation,
      // previousNode: selectedPreviousNode,
      deviceType: selectedDeviceType,
      hostname: setName,
      ip: setcamera_ip,
      port
    };

    const response = await fetch('http://192.168.29.35:8000/api/v1/devices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding device:', error);
    return NextResponse.json(
      { error: 'Failed to add device' },
      { status: 500 }
    );
  }
}