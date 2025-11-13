export async function addDevice({
  protocol,
  ip,
  deviceTypeId,
  checkInterval,
  displayName,
  snmpUsername,
  snmpPassword,
  workerId,
  DeviceId
}: {
    protocol: string;
    ip: string;
    deviceTypeId: number;
    checkInterval: number;
    displayName: string;
    snmpUsername?: string;
    snmpPassword?: string;
    workerId: string;
    DeviceId: number;

}) {
  const url = `${import.meta.env.VITE_NMS_HOST}/devices`;
  const payload = {
    protocol,
    ip,
    deviceTypeId,
    checkInterval,
    displayName,    
    snmpUsername,
    snmpPassword,
    DeviceId,
    worker_id: workerId
  };

  const token = getCookie("token");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to add Device: ${response.statusText}`);
  }

  return await response.json();
}

export async function getDeviceTypes(): Promise<{ id: number; name: string }[]> {
  const url = `${import.meta.env.VITE_NMS_HOST}/devices/types`;

  const token = getCookie("token");

  const response = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Device types: ${response.statusText}`);
  }

  const DeviceTypeOptions = await response.json();

  return DeviceTypeOptions.devicemap((item: any) => ({
    id: item.id,
    name: item.name,
  }));
}

export async function getWorkerTypes(): Promise<{ id: string; hostname: string }[]> {
  const url = `${import.meta.env.VITE_NMS_HOST}/workers`;

  const token = getCookie("token");

  const response = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workers: ${response.statusText}`);
  }

  const data = await response.json();

  return data.workers.map((item: any) => ({
    id: item.id,
    hostname: item.hostname,
  }));
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}