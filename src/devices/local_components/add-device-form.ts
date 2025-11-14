export async function addDevice({
  protocol,
  ipAddress,
  deviceTypeId,
  // checkInterval,
  displayName,
  username,
  password,
  // area,
  device,
  workerId,
  community,
  snmpVersion,
  snmpAuthProtocol,
  snmpUsername,
  snmpPassword,
  snmpPrivProtocol,
  snmpPrivPassword,
}: {
  protocol: string;
  ipAddress: string;
  deviceTypeId: number;
  checkInterval: number;
  displayName: string;
  username?: string;
  password?: string;
  area: string;
  device: string;
  workerId: string;
  community?: string;
  snmpVersion?: string;
  snmpAuthProtocol?: string;
  snmpUsername?: string;
  snmpPassword?: string;
  snmpPrivProtocol?: string;
  snmpPrivPassword?: string;
}) {
  const url = `${import.meta.env.VITE_NMS_HOST}/devices`;
  
  const payload: any = {
    protocol,
    ip: ipAddress,
    device_type_id: deviceTypeId,
    display: displayName,
    worker_id: workerId,
    hostname: device,
    location_id: 1,
    timeout: 30,
  };

  if (protocol === "SNMP") {
    payload.snmp_community = community;
    payload.snmp_version = snmpVersion;
    payload.snmp_auth_protocol = snmpAuthProtocol;
    payload.snmp_username = snmpUsername;
    payload.snmp_password = snmpPassword;
    payload.snmp_priv_protocol = snmpPrivProtocol;
    payload.snmp_priv_password = snmpPrivPassword;
  } else if (protocol === "GPRS") {
    payload.imei = username;
    payload.port = password ? parseInt(password) : undefined;
  }

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

  const deviceTypeOptions = await response.json();

  return deviceTypeOptions.device_types.map((item: any) => ({
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