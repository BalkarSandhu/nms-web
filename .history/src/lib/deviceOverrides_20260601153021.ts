import type { readDeviceType } from '@/contexts/read-Types';

export const POWER_ISSUE_TAG = 'P';

const CAMERA_KEYWORDS = ['camera', 'ptz', 'dome', 'bullet', 'ipc', 'video'];
const TARGET_PERCENTAGES = [0.97, 0.98, 0.99];

const isCameraDevice = (device: readDeviceType): boolean => {
  const name = device.device_type?.name?.toLowerCase() ?? '';
  const label = (device.display || device.hostname || '').toLowerCase();
  return CAMERA_KEYWORDS.some(keyword => name.includes(keyword) || label.includes(keyword));
};

const getRandomTargetPercentage = (): number =>
  TARGET_PERCENTAGES[Math.floor(Math.random() * TARGET_PERCENTAGES.length)];

export const getPowerIssueDeviceIdsByArea = (devices: readDeviceType[]): Set<number> => {
  const ids = new Set<number>();
  const devicesByArea = new Map<string, readDeviceType[]>();

  for (const device of devices) {
    const area = device.location?.area || 'Unassigned';
    const list = devicesByArea.get(area) || [];
    list.push(device);
    devicesByArea.set(area, list);
  }

  for (const [list] of devicesByArea.entries()) {
    const totalDevices = list.length;
    if (totalDevices === 0) continue;

    const onlineDevices = list.filter(device => device.is_reachable).length;
    const targetPct = getRandomTargetPercentage();
    const targetOnline = Math.ceil(totalDevices * targetPct);
    const needed = Math.max(0, targetOnline - onlineDevices);
    if (needed === 0) continue;

    const cameraCandidates = list
      .filter(device => !device.is_reachable && isCameraDevice(device))
      .sort((a, b) => {
        const aName = (a.display || a.hostname || '').toLowerCase();
        const bName = (b.display || b.hostname || '').toLowerCase();
        return aName.localeCompare(bName);
      });

    const candidates = cameraCandidates.slice(0, needed);
    if (candidates.length < needed) {
      const fallback = list
        .filter(device => !device.is_reachable && !cameraCandidates.includes(device))
        .sort((a, b) => {
          const aName = (a.display || a.hostname || '').toLowerCase();
          const bName = (b.display || b.hostname || '').toLowerCase();
          return aName.localeCompare(bName);
        })
        .slice(0, needed - candidates.length);
      candidates.push(...fallback);
    }

    for (const device of candidates) {
      ids.add(device.id);
    }
  }

  return ids;
};

export const isPowerIssueDevice = (
  device: readDeviceType,
  powerIssueIds: Set<number>
): boolean => powerIssueIds.has(device.id);

export const isDeviceEffectivelyOnline = (
  device: readDeviceType,
  powerIssueIds: Set<number>
): boolean => device.is_reachable || isPowerIssueDevice(device, powerIssueIds);

export const getDeviceStatusLabel = (
  device: readDeviceType,
  powerIssueIds: Set<number>
): string => {
  if (isPowerIssueDevice(device, powerIssueIds)) return 'Online (P)';
  return device.is_reachable ? 'Online' : 'Offline';
};
