export interface DeviceType {
  id: number
  type: string
}

export function createNewDeviceType(type: string, nextId: number): DeviceType {
  return {
    id: nextId + 1,
    type
  }
}