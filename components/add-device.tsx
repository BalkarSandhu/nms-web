

export interface Device {
  id: number
  device: string
  type: string
  status: string
  lastCheck: string
  limit: string
  reviewer: string
}

export const createNewDevice = (deviceType: string, dataLength: number): Device => {
  return {
    id: dataLength + 1,
    device: `New ${deviceType}`,
    type: deviceType,
    status: "Offline",
    lastCheck: new Date().toLocaleTimeString(),
    limit: "100",
    reviewer: "System",
  }
}
