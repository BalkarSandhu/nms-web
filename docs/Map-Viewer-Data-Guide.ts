/**
 * Map Viewer Data Structure Quick Reference
 * 
 * This file provides TypeScript interfaces and examples for the Map Viewer component
 */

import { MapDataPoint } from './Map-Viewer';

// ============================================================================
// DATA POINT STRUCTURE
// ============================================================================

/**
 * Basic data point with required fields only
 */
export const minimalDataPoint: MapDataPoint = {
  id: 1,
  name: 'Point Name',
  coordinates: [-74.006, 40.7128], // [longitude, latitude]
  value: 100,
  category: 'red', // 'red' | 'azul' | 'green'
};

/**
 * Full data point with all optional fields
 */
export const fullDataPoint: MapDataPoint = {
  id: 'server-001',
  name: 'Primary Server',
  coordinates: [-74.006, 40.7128],
  value: 150,
  category: 'green',
  additionalData: {
    status: 'Online',
    load: '45%',
    uptime: '99.9%',
    lastUpdate: new Date().toISOString(),
    region: 'US-East',
    // Add any custom fields you need
  },
};

// ============================================================================
// COORDINATE EXAMPLES
// ============================================================================

export const commonCityCoordinates = {
  // North America
  newYork: [-74.006, 40.7128],
  losAngeles: [-118.2437, 34.0522],
  chicago: [-87.6298, 41.8781],
  toronto: [-79.3832, 43.6532],
  
  // Europe
  london: [-0.1278, 51.5074],
  paris: [2.3522, 48.8566],
  berlin: [13.405, 52.52],
  madrid: [-3.7038, 40.4168],
  rome: [12.4964, 41.9028],
  
  // Asia
  tokyo: [139.6917, 35.6895],
  beijing: [116.4074, 39.9042],
  shanghai: [121.4737, 31.2304],
  singapore: [103.8198, 1.3521],
  mumbai: [72.8777, 19.076],
  
  // Australia
  sydney: [151.2093, -33.8688],
  melbourne: [144.9631, -37.8136],
  
  // Middle East
  dubai: [55.2708, 25.2048],
  jerusalem: [35.2137, 31.7683],
  
  // Africa
  cairo: [31.2357, 30.0444],
  johannesburg: [28.0473, -26.2041],
};

// ============================================================================
// DATA TRANSFORMATION EXAMPLES
// ============================================================================

/**
 * Transform server data to MapDataPoint format
 */
export function transformServerData(servers: any[]): MapDataPoint[] {
  return servers.map((server) => ({
    id: server.id,
    name: server.hostname || server.name,
    coordinates: [server.longitude, server.latitude],
    value: server.responseTime || server.load || 1,
    category: 
      server.status === 'critical' ? 'red' :
      server.status === 'warning' ? 'azul' : 'green',
    additionalData: {
      ip: server.ipAddress,
      status: server.status,
      lastSeen: server.lastSeenAt,
      version: server.version,
    },
  }));
}

/**
 * Transform API response to MapDataPoint format
 */
export function transformApiResponse(response: any): MapDataPoint[] {
  if (!Array.isArray(response.data)) {
    console.error('Invalid API response format');
    return [];
  }

  return response.data.map((item: any, index: number) => ({
    id: item.id || index,
    name: item.name || `Point ${index}`,
    coordinates: [
      parseFloat(item.lng || item.longitude || 0),
      parseFloat(item.lat || item.latitude || 0),
    ],
    value: parseFloat(item.value || item.metric || 1),
    category: determineCategory(item),
    additionalData: item.metadata || {},
  }));
}

/**
 * Determine category based on thresholds
 */
function determineCategory(item: any): 'red' | 'azul' | 'green' {
  const value = item.value || item.metric || 0;
  const threshold = item.threshold || { high: 80, low: 40 };
  
  if (value >= threshold.high) return 'red';
  if (value >= threshold.low) return 'azul';
  return 'green';
}

// ============================================================================
// DYNAMIC DATA EXAMPLES
// ============================================================================

/**
 * Generate random data points for testing
 */
export function generateRandomPoints(count: number = 20): MapDataPoint[] {
  const categories: Array<'red' | 'azul' | 'green'> = ['red', 'azul', 'green'];
  const points: MapDataPoint[] = [];

  for (let i = 0; i < count; i++) {
    points.push({
      id: i,
      name: `Point ${i + 1}`,
      coordinates: [
        Math.random() * 360 - 180, // longitude: -180 to 180
        Math.random() * 180 - 90,  // latitude: -90 to 90
      ],
      value: Math.floor(Math.random() * 100) + 10,
      category: categories[Math.floor(Math.random() * categories.length)],
      additionalData: {
        generatedAt: new Date().toISOString(),
        randomValue: Math.random(),
      },
    });
  }

  return points;
}

/**
 * Filter points by category
 */
export function filterByCategory(
  data: MapDataPoint[],
  category: 'red' | 'azul' | 'green'
): MapDataPoint[] {
  return data.filter((point) => point.category === category);
}

/**
 * Filter points by value range
 */
export function filterByValueRange(
  data: MapDataPoint[],
  min: number,
  max: number
): MapDataPoint[] {
  return data.filter((point) => point.value >= min && point.value <= max);
}

/**
 * Sort points by value
 */
export function sortByValue(
  data: MapDataPoint[],
  ascending: boolean = false
): MapDataPoint[] {
  return [...data].sort((a, b) => 
    ascending ? a.value - b.value : b.value - a.value
  );
}

// ============================================================================
// DATA VALIDATION
// ============================================================================

/**
 * Validate a single data point
 */
export function isValidDataPoint(point: any): point is MapDataPoint {
  if (!point || typeof point !== 'object') return false;
  
  const hasId = point.id !== undefined;
  const hasName = typeof point.name === 'string';
  const hasValidCoordinates = 
    Array.isArray(point.coordinates) &&
    point.coordinates.length === 2 &&
    typeof point.coordinates[0] === 'number' &&
    typeof point.coordinates[1] === 'number' &&
    point.coordinates[0] >= -180 && point.coordinates[0] <= 180 &&
    point.coordinates[1] >= -90 && point.coordinates[1] <= 90;
  const hasValue = typeof point.value === 'number' && point.value >= 0;
  const hasValidCategory = ['red', 'azul', 'green'].includes(point.category);

  return hasId && hasName && hasValidCoordinates && hasValue && hasValidCategory;
}

/**
 * Validate an array of data points and filter out invalid ones
 */
export function validateAndFilterData(data: any[]): MapDataPoint[] {
  if (!Array.isArray(data)) {
    console.error('Data must be an array');
    return [];
  }

  const validPoints = data.filter((point, index) => {
    const isValid = isValidDataPoint(point);
    if (!isValid) {
      console.warn(`Invalid data point at index ${index}:`, point);
    }
    return isValid;
  });

  console.log(`Validated ${validPoints.length} out of ${data.length} points`);
  return validPoints;
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

// Example 1: Basic usage with hardcoded data
export const example1Data: MapDataPoint[] = [
  {
    id: 1,
    name: 'Server Alpha',
    coordinates: [-74.006, 40.7128],
    value: 85,
    category: 'red',
  },
  {
    id: 2,
    name: 'Server Beta',
    coordinates: [-0.1278, 51.5074],
    value: 55,
    category: 'azul',
  },
  {
    id: 3,
    name: 'Server Gamma',
    coordinates: [139.6917, 35.6895],
    value: 25,
    category: 'green',
  },
];

// Example 2: Generate random test data
export const example2Data = generateRandomPoints(50);

// Example 3: Filter and sort data
export const example3Data = sortByValue(
  filterByCategory(example1Data, 'red'),
  false
);

// Export all for easy import
export default {
  minimalDataPoint,
  fullDataPoint,
  commonCityCoordinates,
  transformServerData,
  transformApiResponse,
  generateRandomPoints,
  filterByCategory,
  filterByValueRange,
  sortByValue,
  isValidDataPoint,
  validateAndFilterData,
  example1Data,
  example2Data,
  example3Data,
};
