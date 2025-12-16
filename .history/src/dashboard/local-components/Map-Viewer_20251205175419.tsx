import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Map as MapGL, Source, Layer, Marker } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';

// Register PMTiles protocol
const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

// Popup data structure
export interface PopupData {
  indicatorColour: "red" | "blue" | "white" | "green";
  headerLeft: { field: string; value: string };
  headerRight: { field: string; value: string };
  sideLabel: { field: string; value: string };
  data: {
    field: string;
    value: string;
    colour: "red" | "blue" | "white" | "green";
  }[];
}

export interface FilterLink {
  field: string;
  value: string;
}

// Data point type definitions
export interface MapDataPoint {
  id: string | number;
  name: string;
  coordinates: [number, number];
  value: number;
  category: 'red' | 'azul' | 'green';
  popupData?: PopupData;
  additionalData?: Record<string, any>;
  location?: string;
}

export interface MapConnection {
  id: string | number;
  from: string | number;
  to: string | number;
  color?: string;
  width?: number;
  label?: string;
}

export interface MapViewerProps {
  data?: MapDataPoint[];
  connections?: MapConnection[];
  centerCoordinates?: [number, number];
  zoom?: number;
  showLabels?: boolean;
  pointSize?: number;
  enableZoom?: boolean;
  enablePan?: boolean;
  onPointClick?: (point: MapDataPoint) => void;
  onFilterSet?: (filter: FilterLink) => void;
  className?: string;
  bounds?: {
    minLongitude: number;
    maxLongitude: number;
    minLatitude: number;
    maxLatitude: number;
  };
  heatmapZoomThreshold?: number;
  pointsZoomThreshold?: number;
  mapFlavor?: 'dark' | 'light';
  autoZoomToDensity?: boolean;
  enableTopology?: boolean;
  topologyNodeSize?: number;
  topologyConnectionRadius?: number;
}

interface TopologyNode {
  id: string;
  coordinates: [number, number];
  devices: MapDataPoint[];
  status: 'red' | 'green' | 'mixed';
}

const groupDevicesByLocation = (data: MapDataPoint[]): TopologyNode[] => {
  const locationMap = new Map<string, MapDataPoint[]>();
  
  data.forEach(point => {
    const key = `${point.name}-${point.coordinates[0].toFixed(6)},${point.coordinates[1].toFixed(6)}`;
    if (!locationMap.has(key)) {
      locationMap.set(key, []);
    }
    locationMap.get(key)!.push(point);
  });
  
  const nodes: TopologyNode[] = [];
  locationMap.forEach((devices, key) => {
    if (devices.length > 1) {
      const hasOffline = devices.some(d => d.category === 'red');
      const hasOnline = devices.some(d => d.category === 'green');
      let status: 'red' | 'green' | 'mixed';
      
      if (hasOffline && hasOnline) {
        status = 'mixed';
      } else if (hasOffline) {
        status = 'red';
      } else {
        status = 'green';
      }
      
      nodes.push({
        id: key,
        coordinates: devices[0].coordinates,
        devices,
        status
      });
    }
  });
  
  return nodes;
};

const calculateMeanCenter = (
  data: MapDataPoint[]
): { center: [number, number]; zoom: number } | null => {
  if (data.length === 0) return null;
  
  if (data.length === 1) {
    return {
      center: data[0].coordinates,
      zoom: 10
    };
  }

  let sumLon = 0;
  let sumLat = 0;
  
  data.forEach((point) => {
    sumLon += point.coordinates[0];
    sumLat += point.coordinates[1];
  });

  const meanLon = sumLon / data.length;
  const meanLat = sumLat / data.length;

  let minLon = data[0].coordinates[0];
  let maxLon = data[0].coordinates[0];
  let minLat = data[0].coordinates[1];
  let maxLat = data[0].coordinates[1];

  data.forEach((point) => {
    minLon = Math.min(minLon, point.coordinates[0]);
    maxLon = Math.max(maxLon, point.coordinates[0]);
    minLat = Math.min(minLat, point.coordinates[1]);
    maxLat = Math.max(maxLat, point.coordinates[1]);
  });

  const lonSpan = maxLon - minLon;
  const latSpan = maxLat - minLat;
  const maxSpan = Math.max(lonSpan, latSpan);

  let zoomLevel: number;
  if (maxSpan > 10) {
    zoomLevel = 5;
  } else if (maxSpan > 5) {
    zoomLevel = 6;
  } else if (maxSpan > 2) {
    zoomLevel = 7;
  } else if (maxSpan > 1) {
    zoomLevel = 8;
  } else if (maxSpan > 0.5) {
    zoomLevel = 9;
  } else if (maxSpan > 0.2) {
    zoomLevel = 10;
  } else if (maxSpan > 0.1) {
    zoomLevel = 11;
  } else {
    zoomLevel = 12;
  }

  return {
    center: [meanLon, meanLat],
    zoom: zoomLevel
  };
};

type FilterType = 'all' | 'online' | 'offline';

export const MapViewer = ({
  data = [],
  connections = [],
  centerCoordinates = [78.9629, 20.5937],
  zoom = 4,
  showLabels = false,
  pointSize = 12,
  enableZoom = true,
  enablePan = true,
  onPointClick,
  onFilterSet,
  className = '',
  bounds = {
    minLongitude: 68.1766,
    maxLongitude: 97.4025,
    minLatitude: 8.4,
    maxLatitude: 37.6
  },
  heatmapZoomThreshold = 6,
  pointsZoomThreshold = 6,
  mapFlavor = 'dark',
  autoZoomToDensity = true,
  enableTopology = true,
  topologyNodeSize = 20,
  topologyConnectionRadius = 0.003,
}: MapViewerProps) => {
  const mapRef = useRef<MapRef>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [hoveredPoint, setHoveredPoint] = useState<MapDataPoint | null>(null);
  const [hoveredNode, setHoveredNode] = useState<TopologyNode | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<MapDataPoint | null>(null);
  const [popupFilter, setPopupFilter] = useState<FilterLink | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [colors, setColors] = useState<{ red: string; azul: string; green: string; blue?: string; mixed?: string }>({
    red: '#D52941',
    azul: '#246EB9',
    green: '#4CB944',
    blue: '#246EB9',
    mixed: '#FFA500',
  });
  const [hasAutoZoomed, setHasAutoZoomed] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return data;
    if (statusFilter === 'online') return data.filter(point => point.category === 'green');
    if (statusFilter === 'offline') return data.filter(point => point.category === 'red');
    return data;
  }, [data, statusFilter]);

  const topologyNodes = useMemo(() => {
    if (!enableTopology) return [];
    return groupDevicesByLocation(filteredData);
  }, [filteredData, enableTopology]);

  const singleDevices = useMemo(() => {
    if (!enableTopology) return filteredData;
    
    const groupedDeviceIds = new Set<string | number>();
    topologyNodes.forEach(node => {
      node.devices.forEach(device => groupedDeviceIds.add(device.id));
    });
    
    return filteredData.filter(device => !groupedDeviceIds.has(device.id));
  }, [filteredData, topologyNodes, enableTopology]);

  // Find the topology node that contains the selected device
  const selectedTopologyNode = useMemo(() => {
    if (!selectedDevice || !enableTopology) return null;
    return topologyNodes.find(node => 
      node.devices.some(d => d.id === selectedDevice.id)
    );
  }, [selectedDevice, topologyNodes, enableTopology]);

  const topologyConnectionsGeoJSON = useMemo(() => {
    if (!enableTopology || !selectedTopologyNode) return { type: 'FeatureCollection' as const, features: [] };
    
    const node = selectedTopologyNode;
    const centerCoord = node.coordinates;
    
    const features = node.devices.map((device, idx) => {
      const angle = (idx / node.devices.length) * 2 * Math.PI;
      const offsetLon = Math.cos(angle) * topologyConnectionRadius;
      const offsetLat = Math.sin(angle) * topologyConnectionRadius;
      const deviceCoord: [number, number] = [
        centerCoord[0] + offsetLon,
        centerCoord[1] + offsetLat
      ];
      
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [centerCoord, deviceCoord]
        },
        properties: {
          id: `${node.id}-${device.id}`,
          color: colors[device.category] || colors.azul,
          width: 2,
          deviceId: device.id,
          nodeId: node.id,
          lineType: 'dotted'
        }
      };
    });

    return {
      type: 'FeatureCollection' as const,
      features
    };
  }, [selectedTopologyNode, enableTopology, topologyConnectionRadius, colors]);

  const locationConnectionsGeoJSON = useMemo(() => {
    if (!selectedDevice) return { type: 'FeatureCollection' as const, features: [] };
    
    const features: any[] = [];
    const deviceLocation = selectedDevice.location;
    
    if (!deviceLocation) return { type: 'FeatureCollection' as const, features: [] };
    
    const relatedDevices: Array<{ coordinates: [number, number]; id: string | number; isTopologyDevice: boolean }> = [];
    
    // Add devices from topology nodes with same location
    topologyNodes.forEach(node => {
      node.devices.forEach((device, idx) => {
        if (device.location === deviceLocation) {
          const angle = (idx / node.devices.length) * 2 * Math.PI;
          const offsetLon = Math.cos(angle) * topologyConnectionRadius;
          const offsetLat = Math.sin(angle) * topologyConnectionRadius;
          
          relatedDevices.push({
            coordinates: [node.coordinates[0] + offsetLon, node.coordinates[1] + offsetLat],
            id: device.id,
            isTopologyDevice: true
          });
        }
      });
    });
    
    // Add single devices with same location
    singleDevices.forEach(device => {
      if (device.location === deviceLocation) {
        relatedDevices.push({
          coordinates: device.coordinates,
          id: device.id,
          isTopologyDevice: false
        });
      }
    });

    // Create mesh connections
    if (relatedDevices.length > 1) {
      for (let i = 0; i < relatedDevices.length; i++) {
        for (let j = i + 1; j < relatedDevices.length; j++) {
          features.push({
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: [relatedDevices[i].coordinates, relatedDevices[j].coordinates]
            },
            properties: {
              id: `location-${deviceLocation}-${relatedDevices[i].id}-${relatedDevices[j].id}`,
              color: '#4CB944',
              width: 2,
              locationName: deviceLocation,
              lineType: 'solid'
            }
          });
        }
      }
    }

    return {
      type: 'FeatureCollection' as const,
      features
    };
  }, [selectedDevice, topologyNodes, singleDevices, topologyConnectionRadius]);

  const meanCenter = useMemo(() => {
    if (!autoZoomToDensity || filteredData.length === 0) return null;
    return calculateMeanCenter(filteredData);
  }, [filteredData, autoZoomToDensity]);

  useEffect(() => {
    if (
      mapRef.current &&
      meanCenter &&
      autoZoomToDensity &&
      !hasAutoZoomed &&
      filteredData.length > 0 &&
      isInitialLoad
    ) {
      const map = mapRef.current.getMap();
      
      const performZoom = () => {
        setTimeout(() => {
          map.flyTo({
            center: meanCenter.center,
            zoom: meanCenter.zoom,
            duration: 2000,
            essential: true
          });
          setHasAutoZoomed(true);
          setIsInitialLoad(false);
        }, 800);
      };
      
      if (map.loaded()) {
        performZoom();
      } else {
        map.once('load', () => {
          performZoom();
        });
      }
    }
  }, [meanCenter, autoZoomToDensity, hasAutoZoomed, filteredData.length, isInitialLoad]);

  useEffect(() => {
    if (popupFilter && onFilterSet) {
      onFilterSet(popupFilter);
      setPopupFilter(null);
    }
  }, [popupFilter, onFilterSet]);

  useEffect(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    setColors({
      red: computedStyle.getPropertyValue('--red').trim() || '#D52941',
      azul: computedStyle.getPropertyValue('--azul').trim() || '#246EB9',
      green: computedStyle.getPropertyValue('--green').trim() || '#4CB944',
      blue: computedStyle.getPropertyValue('--blue').trim() || '#246EB9',
      mixed: '#FFA500',
    });
  }, []);

  const mapConfig = useMemo(() => {
    const pmtilesUrl = 'https://build.protomaps.com/20230901.pmtiles';
    
    const customLayers: any[] = [
      {
        id: 'earth',
        type: 'fill',
        source: 'india-tiles',
        'source-layer': 'earth',
        paint: {
          'fill-color': mapFlavor === 'dark' ? '#1a1a1a' : '#f8f8f8',
          'fill-opacity': 1
        }
      },
      {
        id: 'water',
        type: 'fill',
        source: 'india-tiles',
        'source-layer': 'water',
        paint: {
          'fill-color': mapFlavor === 'dark' ? '#0d47a1' : '#a8d8f0',
          'fill-opacity': 0.2
        }
      },
      {
        id: 'landuse',
        type: 'fill',
        source: 'india-tiles',
        'source-layer': 'landuse',
        paint: {
          'fill-color': [
            'match',
            ['get', 'class'],
            'residential', mapFlavor === 'dark' ? '#2a2a2a' : '#e8e8e8',
            'commercial', mapFlavor === 'dark' ? '#3a2a2a' : '#f0e8e8',
            'industrial', mapFlavor === 'dark' ? '#3a3a2a' : '#e8e8f0',
            'park', mapFlavor === 'dark' ? '#1a4d2e' : '#c8e6c9',
            mapFlavor === 'dark' ? '#2a2a2a' : '#e8e8e8'
          ],
          'fill-opacity': 0.3
        }
      },
      {
        id: 'landcover',
        type: 'fill',
        source: 'india-tiles',
        'source-layer': 'landcover',
        paint: {
          'fill-color': [
            'match',
            ['get', 'class'],
            'grass', mapFlavor === 'dark' ? '#2a4d2e' : '#d8e6c9',
            'wood', mapFlavor === 'dark' ? '#1a3d2e' : '#b8d6b9',
            'scrub', mapFlavor === 'dark' ? '#2a3d2e' : '#c8d6c9',
            mapFlavor === 'dark' ? '#2a3d2e' : '#c8d6c9'
          ],
          'fill-opacity': 0.4
        }
      },
      {
        id: 'buildings',
        type: 'fill',
        source: 'india-tiles',
        'source-layer': 'buildings',
        minzoom: 13,
        paint: {
          'fill-color': mapFlavor === 'dark' ? '#3a3a3a' : '#d8d8d8',
          'fill-opacity': 1
        }
      },
      {
        id: 'roads-minor',
        type: 'line',
        source: 'india-tiles',
        'source-layer': 'roads',
        filter: ['in', 'class', 'minor', 'service'],
        paint: {
          'line-color': mapFlavor === 'dark' ? '#3a3a3a' : '#ffffff',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 14, 2, 18, 4],
          'line-opacity': 0.7
        }
      },
      {
        id: 'roads-major',
        type: 'line',
        source: 'india-tiles',
        'source-layer': 'roads',
        filter: ['in', 'class', 'primary', 'secondary', 'tertiary'],
        paint: {
          'line-color': mapFlavor === 'dark' ? '#4a4a4a' : '#ffd700',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 3, 16, 8],
          'line-opacity': 0.8
        }
      },
      {
        id: 'boundaries',
        type: 'line',
        source: 'india-tiles',
        'source-layer': 'boundaries',
        paint: {
          'line-color': mapFlavor === 'dark' ? '#666666' : '#999999',
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1, 8, 2, 12, 3],
          'line-dasharray': [3, 2],
          'line-opacity': 0.7
        }
      },
      {
        id: 'places',
        type: 'symbol',
        source: 'india-tiles',
        'source-layer': 'places',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 8, 14, 12, 18],
          'text-anchor': 'center',
          'text-offset': [0, 1.5]
        },
        paint: {
          'text-color': mapFlavor === 'dark' ? '#ffffff' : '#000000',
          'text-halo-color': mapFlavor === 'dark' ? '#000000' : '#ffffff',
          'text-halo-width': 2
        }
      }
    ];
    
    return {
      version: 8 as const,
      glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
      sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${mapFlavor}`,
      sources: {
        'india-tiles': {
          type: "vector" as const,
          url: `pmtiles://${pmtilesUrl}`,
          attribution: '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>'
        }
      },
      layers: customLayers
    };
  }, [mapFlavor]);

  const maxBounds: [[number, number], [number, number]] = useMemo(() => [
    [bounds.minLongitude, bounds.minLatitude],
    [bounds.maxLongitude, bounds.maxLatitude]
  ], [bounds]);

  const groupedData = useMemo(() => ({
    red: filteredData.filter((point) => point.category === 'red'),
    azul: filteredData.filter((point) => point.category === 'azul'),
    green: filteredData.filter((point) => point.category === 'green'),
  }), [filteredData]);

  const showHeatmap = currentZoom <= heatmapZoomThreshold;
  const showPoints = currentZoom > pointsZoomThreshold;

  const connectionsGeoJSON = useMemo(() => {
    const features = connections.map(conn => {
      const fromPoint = filteredData.find(p => p.id === conn.from);
      const toPoint = filteredData.find(p => p.id === conn.to);
      
      if (!fromPoint || !toPoint) return null;
      
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [fromPoint.coordinates, toPoint.coordinates]
        },
        properties: {
          id: conn.id,
          color: conn.color || '#888888',
          width: conn.width || 2,
          label: conn.label || '',
          from: conn.from,
          to: conn.to
        }
      };
    }).filter(Boolean);

    return {
      type: 'FeatureCollection' as const,
      features: features as any[]
    };
  }, [connections, filteredData]);

  const handleMove = useCallback((evt: any) => {
    setCurrentZoom(evt.viewState.zoom);
  }, []);

  const createHeatmapGeoJSON = (categoryData: MapDataPoint[]): FeatureCollection<Point> => ({
    type: 'FeatureCollection',
    features: categoryData.map(point => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: point.coordinates
      },
      properties: {
        id: point.id,
        name: point.name,
        value: point.value,
        category: point.category,
        ...point.additionalData
      }
    }))
  });

  const initialViewState = useMemo(() => {
    if (autoZoomToDensity && meanCenter) {
      return {
        longitude: meanCenter.center[0],
        latitude: meanCenter.center[1],
        zoom: meanCenter.zoom
      };
    }
    return {
      longitude: centerCoordinates[0],
      latitude: centerCoordinates[1],
      zoom: zoom
    };
  }, [autoZoomToDensity, meanCenter, centerCoordinates, zoom]);

  const getStatusCounts = useMemo(() => {
    return {
      all: data.length,
      online: data.filter(p => p.category === 'green').length,
      offline: data.filter(p => p.category === 'red').length,
    };
  }, [data]);

  const handleDeviceClick = (device: MapDataPoint) => {
    setSelectedDevice(device);
    setHoveredPoint(device);
    setHoveredNode(null);
    if (onPointClick) {
      onPointClick(device);
    }
  };

  const handleNodeClick = (node: TopologyNode) => {
    setHoveredNode(node);
    setHoveredPoint(null);
    setSelectedDevice(null);
  };
  // THIS IS THE RETURN/RENDER SECTION - PASTE THIS AFTER THE handleNodeClick FUNCTION

  return (
    <div className={`w-full h-full rounded overflow-hidden relative ${className}`}>
      {/* Filter Controls */}
      <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-white/10">
        <div className="text-white text-sm font-semibold">Device Status</div>
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1 cursor-pointer hover:bg-white/10 p-2 rounded transition-colors">
            <input
              type="radio"
              name="status-filter"
              value="all"
              checked={statusFilter === 'all'}
              onChange={() => setStatusFilter('all')}
              className="w-4 h-4 accent-blue-500"
            />
            <span className="text-white text-sm">All Devices ({getStatusCounts.all})</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer hover:bg-white/10 p-2 rounded transition-colors">
            <input
              type="radio"
              name="status-filter"
              value="online"
              checked={statusFilter === 'online'}
              onChange={() => setStatusFilter('online')}
              className="w-4 h-4 accent-green-500"
            />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-white text-sm">Online ({getStatusCounts.online})</span>
            </div>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer hover:bg-white/10 p-2 rounded transition-colors">
            <input
              type="radio"
              name="status-filter"
              value="offline"
              checked={statusFilter === 'offline'}
              onChange={() => setStatusFilter('offline')}
              className="w-4 h-4 accent-red-500"
            />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-white text-sm">Offline ({getStatusCounts.offline})</span>
            </div>
          </label>
        </div>
      </div>

      {/* Clear Selection Button */}
      {selectedDevice && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={() => {
              setSelectedDevice(null);
              setHoveredPoint(null);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear Topology View
          </button>
        </div>
      )}

      {/* Device Details Panel */}
      {hoveredPoint && (
        <div className="absolute top-4 right-4 z-10 bg-black/90 backdrop-blur-sm rounded-lg p-4 shadow-2xl border border-white/20 min-w-[280px] max-w-[350px]">
          <div className="flex items-start justify-between mb-3 pb-3 border-b border-white/10">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ backgroundColor: colors[hoveredPoint.category] }}
                ></div>
                <h3 className="text-white font-bold text-lg truncate">{hoveredPoint.name}</h3>
              </div>
              <p className="text-gray-400 text-xs">
                {hoveredPoint.category === 'green' ? 'Online' : hoveredPoint.category === 'red' ? 'Offline' : 'Unknown'}
              </p>
            </div>
            <button
              onClick={() => setHoveredPoint(null)}
              className="text-gray-400 hover:text-white transition-colors ml-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            {hoveredPoint.additionalData && Object.keys(hoveredPoint.additionalData).length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="text-gray-400 text-xs mb-2 uppercase tracking-wide">Additional Info</div>
                {Object.entries(hoveredPoint.additionalData).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center py-1">
                    <span className="text-gray-400 text-xs capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="text-white text-xs">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}

            {hoveredPoint.popupData && (
              <div className="mt-3 pt-3 border-t border-white/10">
                {hoveredPoint.popupData.data.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1">
                    <span className="text-gray-400 text-xs">{item.field}:</span>
                    <span className="text-xs font-medium" style={{ color:'#ffffff' }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Topology Node Details Panel */}
      {hoveredNode && !hoveredPoint && (
        <div 
          className="absolute top-4 right-4 z-10 bg-black/90 backdrop-blur-sm rounded-lg p-4 shadow-2xl border border-white/20 min-w-[280px] max-w-[350px]"
          onMouseEnter={() => setHoveredNode(hoveredNode)}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <div className="flex items-start justify-between mb-3 pb-3 border-b border-white/10">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ backgroundColor: hoveredNode.status === 'mixed' ? colors.mixed : colors[hoveredNode.status] }}
                ></div>
                <h3 className="text-white font-bold text-lg">Site Overview</h3>
              </div>
              <p className="text-gray-400 text-xs">
                {hoveredNode.devices.length} devices at this location
              </p>
            </div>
            <button
              onClick={() => setHoveredNode(null)}
              className="text-gray-400 hover:text-white transition-colors ml-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            <div className="text-gray-400 text-xs mb-2 uppercase tracking-wide">Devices</div>
            {hoveredNode.devices.map((device) => (
              <div 
                key={device.id} 
                className="flex items-center gap-2 p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                onClick={() => {
                  setHoveredNode(null);
                  handleDeviceClick(device);
                }}
              >
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colors[device.category] }}
                ></div>
                <span className="text-white text-xs truncate">{device.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <MapGL
        ref={mapRef}
        style={{ width: '100%', height: '100%' }}
        initialViewState={initialViewState}
        onMove={handleMove}
        maxBounds={maxBounds}
        dragRotate={false}
        scrollZoom={enableZoom}
        dragPan={enablePan}
        boxZoom={false}
        attributionControl={false}
        mapStyle={mapConfig}
        mapLib={maplibregl}
      >
        {showHeatmap && (
          <>
            <Source id="red-heat" type="geojson" data={createHeatmapGeoJSON(groupedData.red)}>
              <Layer
                id="red-heat-layer"
                type="heatmap"
                paint={{
                  'heatmap-weight': ['interpolate', ['linear'], ['get', 'value'], 0, 0, 100, 1],
                  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(213, 41, 65, 0)',
                    0.2, 'rgba(213, 41, 65, 0.2)',
                    0.4, 'rgba(213, 41, 65, 0.4)',
                    0.6, 'rgba(213, 41, 65, 0.6)',
                    0.8, 'rgba(213, 41, 65, 0.8)',
                    1, 'rgba(213, 41, 65, 1)'
                  ],
                  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 9, 40],
                  'heatmap-opacity': 0.7
                }}
              />
            </Source>

            <Source id="azul-heat" type="geojson" data={createHeatmapGeoJSON(groupedData.azul)}>
              <Layer
                id="azul-heat-layer"
                type="heatmap"
                paint={{
                  'heatmap-weight': ['interpolate', ['linear'], ['get', 'value'], 0, 0, 100, 1],
                  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(36, 110, 185, 0)',
                    0.2, 'rgba(36, 110, 185, 0.24)',
                    0.4, 'rgba(36, 110, 185, 0.48)',
                    0.6, 'rgba(36, 110, 185, 0.72)',
                    0.8, 'rgba(36, 110, 185, 0.88)',
                    1, 'rgba(36, 110, 185, 1)'
                  ],
                  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 9, 40],
                  'heatmap-opacity': 0.7
                }}
              />
            </Source>

            <Source id="green-heat" type="geojson" data={createHeatmapGeoJSON(groupedData.green)}>
              <Layer
                id="green-heat-layer"
                type="heatmap"
                paint={{
                  'heatmap-weight': ['interpolate', ['linear'], ['get', 'value'], 0, 0, 100, 1],
                  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(76, 185, 68, 0)',
                    0.2, 'rgba(76, 185, 68, 0.195)',
                    0.4, 'rgba(76, 185, 68, 0.39)',
                    0.6, 'rgba(76, 185, 68, 0.585)',
                    0.8, 'rgba(76, 185, 68, 0.78)',
                    1, 'rgba(76, 185, 68, 1)'
                  ],
                  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 9, 40],
                  'heatmap-opacity': 0.7
                }}
              />
            </Source>
          </>
        )}

        {showPoints && connections.length > 0 && (
          <Source id="connections" type="geojson" data={connectionsGeoJSON}>
            <Layer
              id="connections-glow"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  6, ['*', ['get', 'width'], 1.5],
                  10, ['*', ['get', 'width'], 2],
                  15, ['*', ['get', 'width'], 3]
                ],
                'line-opacity': 0.2,
                'line-blur': 4
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
            <Layer
              id="connections-layer"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  6, ['*', ['get', 'width'], 0.5],
                  10, ['get', 'width'],
                  15, ['*', ['get', 'width'], 1.5]
                ],
                'line-opacity': 0.8
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
          </Source>
        )}

        {/* Topology Connections - DOTTED (only when device selected) */}
        {showPoints && enableTopology && topologyConnectionsGeoJSON.features.length > 0 && (
          <Source id="topology-connections" type="geojson" data={topologyConnectionsGeoJSON}>
            <Layer
              id="topology-connections-layer"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  6, 1.5,
                  10, 2,
                  15, 3
                ],
                'line-opacity': 0.7,
                'line-dasharray': [2, 2]
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
          </Source>
        )}

        {/* Location-based Connections - SOLID (only when device selected) */}
        {showPoints && locationConnectionsGeoJSON.features.length > 0 && (
          <Source id="location-connections" type="geojson" data={locationConnectionsGeoJSON}>
            <Layer
              id="location-connections-glow"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  6, 3,
                  10, 4,
                  15, 6
                ],
                'line-opacity': 0.2,
                'line-blur': 4
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
            <Layer
              id="location-connections-layer"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  6, 1.5,
                  10, 2.5,
                  15, 4
                ],
                'line-opacity': 0.8
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
          </Source>
        )}

        {/* Topology Nodes */}
        {showPoints && enableTopology && topologyNodes.map(node => (
          <Marker
            key={`node-${node.id}`}
            longitude={node.coordinates[0]}
            latitude={node.coordinates[1]}
            anchor="center"
          >
            <div 
              className="relative cursor-pointer hover:scale-110 transition-transform"
              style={{
                width: topologyNodeSize,
                height: topologyNodeSize,
                borderRadius: '50%',
                backgroundColor: node.status === 'mixed' ? colors.mixed : colors[node.status],
                border: '3px solid white',
                boxShadow: selectedTopologyNode?.id === node.id ? '0 0 20px rgba(255,255,255,0.8)' : '0 4px 8px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={`${node.devices.length} devices`}
              onMouseEnter={() => {
                setHoveredPoint(null);
                setHoveredNode(node);
              }}
              onMouseLeave={() => {}}
              onClick={() => handleNodeClick(node)}
            >
              <span className="text-white text-xs font-bold">{node.devices.length}</span>
            </div>
          </Marker>
        ))}

        {/* Topology Device Points */}
        {showPoints && enableTopology && selectedTopologyNode && selectedTopologyNode.devices.map((device, idx) => {
          const angle = (idx / selectedTopologyNode.devices.length) * 2 * Math.PI;
          const offsetLon = Math.cos(angle) * topologyConnectionRadius;
          const offsetLat = Math.sin(angle) * topologyConnectionRadius;
          
          return (
            <Marker
              key={`topology-device-${device.id}`}
              longitude={selectedTopologyNode.coordinates[0] + offsetLon}
              latitude={selectedTopologyNode.coordinates[1] + offsetLat}
              anchor="center"
            >
              <div 
                className="relative cursor-pointer hover:scale-110 transition-transform"
                style={{
                  width: pointSize * 0.8,
                  height: pointSize * 0.8,
                  borderRadius: '50%',
                  backgroundColor: colors[device.category],
                  border: selectedDevice?.id === device.id ? '3px solid white' : '2px solid white',
                  boxShadow: selectedDevice?.id === device.id ? '0 0 15px rgba(255,255,255,0.8)' : '0 2px 4px rgba(0,0,0,0.3)'
                }}
                title={device.name}
                onMouseEnter={() => setHoveredPoint(device)}
                onMouseLeave={() => {}}
                onClick={() => handleDeviceClick(device)}
              >
                {showLabels && currentZoom > 15 && (
                  <div 
                    className="absolute left-full ml-2 whitespace-nowrap text-xs font-medium"
                    style={{ color: colors[device.category] }}
                  >
                    {device.name}
                  </div>
                )}
              </div>
            </Marker>
          );
        })}

        {/* Single Devices */}
        {showPoints && singleDevices.map(point => (
          <Marker
            key={point.id}
            longitude={point.coordinates[0]}
            latitude={point.coordinates[1]}
            anchor="center"
          >
            <div 
              className="relative cursor-pointer hover:scale-110 transition-transform"
              style={{
                width: pointSize,
                height: pointSize,
                borderRadius: '50%',
                backgroundColor: colors[point.category],
                border: selectedDevice?.id === point.id ? '3px solid white' : '2px solid white',
                boxShadow: selectedDevice?.id === point.id ? '0 0 15px rgba(255,255,255,0.8)' : '0 2px 4px rgba(0,0,0,0.3)'
              }}
              title={point.name}
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => {}}
              onClick={() => handleDeviceClick(point)}
            >
              {showLabels && currentZoom > 15 && (
                <div 
                  className="absolute left-full ml-2 whitespace-nowrap text-xs font-medium"
                  style={{ color: colors[point.category] }}
                >
                  {point.name}
                </div>
              )}
            </div>
          </Marker>
        ))}
      </MapGL>
    </div>
  );
};

export default MapViewer;