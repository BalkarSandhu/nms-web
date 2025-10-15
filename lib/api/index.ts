type FetchOptions = RequestInit & { query?: Record<string, string | number | boolean | undefined> };

function buildUrl(path: string, query?: Record<string, any>) {
  if (!query) return path;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return params ? `${path}?${params}` : path;
}

async function fetchJson<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = buildUrl(path, options.query);
  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request to ${url} failed: ${res.status} ${res.statusText} ${text}`);
  }

  return (await res.json()) as T;
}

export async function getDevices() {
  return fetchJson('/api/devices');
}

export async function getDeviceInfo(deviceId: string) {
  return fetchJson(`/api/deviceInfo?deviceId=${encodeURIComponent(deviceId)}`);
}

export async function getStatistics() {
  return fetchJson('/api/statistics');
}

export async function addDevice(payload: any) {
  return fetchJson('/api/addDevice', { method: 'POST', body: payload });
}

export async function getDeviceById(deviceId: string) {
  return fetchJson(`/api/devices/${encodeURIComponent(deviceId)}`);
}

export default { fetchJson, getDevices, getDeviceInfo, getStatistics, addDevice, getDeviceById };
