import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl/maplibre';
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
}

// Function to calculate the geographic center (mean) of all points
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
}: MapViewerProps) => {
  const mapRef = useRef<MapRef>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [hoveredPoint, setHoveredPoint] = useState<MapDataPoint | null>(null);
  const [popupFilter, setPopupFilter] = useState<FilterLink | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [colors, setColors] = useState<{ red: string; azul: string; green: string }>({
    red: '#D52941',
    azul: '#246EB9',
    green: '#4CB944',
  });
  const [hasAutoZoomed, setHasAutoZoomed] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Filter data based on status filter
  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return data;
    if (statusFilter === 'online') return data.filter(point => point.category === 'green');
    if (statusFilter === 'offline') return data.filter(point => point.category === 'red');
    return data;
  }, [data, statusFilter]);

  // Calculate mean center when data changes
  const meanCenter = useMemo(() => {
    if (!autoZoomToDensity || filteredData.length === 0) return null;
    return calculateMeanCenter(filteredData);
  }, [filteredData, autoZoomToDensity]);

  // Auto-zoom to mean center when map loads
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

  // Handle filter updates from popup
  useEffect(() => {
    if (popupFilter && onFilterSet) {
      onFilterSet(popupFilter);
      setPopupFilter(null);
    }
  }, [popupFilter, onFilterSet]);

  // Extract CSS custom properties for colors
  useEffect(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    setColors({
      red: computedStyle.getPropertyValue('--red').trim() || '#D52941',
      azul: computedStyle.getPropertyValue('--azul').trim() || '#246EB9',
      green: computedStyle.getPropertyValue('--green').trim() || '#4CB944',
    });
  }, []);

  // Map configuration with PMTiles
  const mapConfig = useMemo(() => {
    const pmtilesUrl = import.meta.env.VITE_MAP_SOURCE || 
                       'https://build.protomaps.com/20230901.pmtiles';
    
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

  return (
    <div className={`w-full h-full rounded overflow-hidden relative ${className}`}>
      {/* Filter Controls - Top Left */}
      <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-white/10">
        <div className="text-white text-sm font-semibold mb-2">Device Status</div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer hover:bg-white/10 p-2 rounded transition-colors">
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

      {/* Device Details Panel - Top Right */}
      {hoveredPoint && (
        <div className="absolute top-4 right-4 z-10 bg-black/90 backdrop-blur-sm rounded-lg p-4 shadow-2xl border border-white/20 min-w-[280px] max-w-[350px]">
          {/* Header with status indicator */}
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

          {/* Device Information */}
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400 text-sm">Device ID:</span>
              <span className="text-white text-sm font-medium">{hoveredPoint.id}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400 text-sm">Value:</span>
              <span className="text-white text-sm font-medium">{hoveredPoint.value}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400 text-sm">Location:</span>
              <span className="text-white text-sm font-medium">
                {hoveredPoint.coordinates[1].toFixed(4)}, {hoveredPoint.coordinates[0].toFixed(4)}
              </span>
            </div>

            {/* Additional Data */}
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

            {/* Popup Data if available */}
            {hoveredPoint.popupData && (
              <div className="mt-3 pt-3 border-t border-white/10">
                {hoveredPoint.popupData.data.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1">
                    <span className="text-gray-400 text-xs">{item.field}:</span>
                    <span 
                      className="text-xs font-medium"
                      style={{ color: colors[item.colour] || '#ffffff' }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Map
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
          </Source>
        )}

        {showPoints && filteredData.map(point => (
          <Marker
            key={point.id}
            longitude={point.coordinates[0]}
            latitude={point.coordinates[1]}
            anchor="center"
            onClick={() => onPointClick?.(point)}
          >
            <div 
              className="relative cursor-pointer hover:scale-110 transition-transform"
              style={{
                width: pointSize,
                height: pointSize,
                borderRadius: '50%',
                backgroundColor: colors[point.category],
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
              title={point.name}
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
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
      </Map>
    </div>
  );
};

export default MapViewer;d', 'line-cap': 'round' }}
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
              layout={{ 'line-join': 'roun