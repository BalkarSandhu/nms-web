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
  densityRadius?: number;
}

// Helper function to calculate distance between two points (Haversine formula)
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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

  // Calculate mean longitude and latitude
  let sumLon = 0;
  let sumLat = 0;
  
  data.forEach((point) => {
    sumLon += point.coordinates[0];
    sumLat += point.coordinates[1];
  });

  const meanLon = sumLon / data.length;
  const meanLat = sumLat / data.length;

  // Calculate the spread of points to determine appropriate zoom
  // Find the bounding box of all points
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

  // Calculate the span in degrees
  const lonSpan = maxLon - minLon;
  const latSpan = maxLat - minLat;
  const maxSpan = Math.max(lonSpan, latSpan);

  // Calculate zoom level based on span
  // Smaller span = zoom in more
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
  densityRadius = 50,
}: MapViewerProps) => {
  const mapRef = useRef<MapRef>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [hoveredPoint, setHoveredPoint] = useState<MapDataPoint | null>(null);
  const [popupFilter, setPopupFilter] = useState<FilterLink | null>(null);
  const [colors, setColors] = useState<{ red: string; azul: string; green: string }>({
    red: '#D52941',
    azul: '#246EB9',
    green: '#4CB944',
  });
  const [hasAutoZoomed, setHasAutoZoomed] = useState(false);

  // Calculate density center when data changes
  const densityCenter = useMemo(() => {
    if (!autoZoomToDensity || data.length === 0) return null;
    return findHighestDensityCenter(data, densityRadius);
  }, [data, autoZoomToDensity, densityRadius]);

  // Auto-zoom to density center when map loads
  useEffect(() => {
    if (
      mapRef.current &&
      densityCenter &&
      autoZoomToDensity &&
      !hasAutoZoomed &&
      data.length > 0
    ) {
      const map = mapRef.current.getMap();
      
      // Wait for map to be fully loaded
      if (map.loaded()) {
        map.flyTo({
          center: densityCenter.center,
          zoom: densityCenter.zoom,
          duration: 1500,
          essential: true
        });
        setHasAutoZoomed(true);
      } else {
        map.once('load', () => {
          map.flyTo({
            center: densityCenter.center,
            zoom: densityCenter.zoom,
            duration: 1500,
            essential: true
          });
          setHasAutoZoomed(true);
        });
      }
    }
  }, [densityCenter, autoZoomToDensity, hasAutoZoomed, data.length]);

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
    // Use the environment variable or fallback to a working public source
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
    red: data.filter((point) => point.category === 'red'),
    azul: data.filter((point) => point.category === 'azul'),
    green: data.filter((point) => point.category === 'green'),
  }), [data]);

  const showHeatmap = currentZoom <= heatmapZoomThreshold;
  const showPoints = currentZoom > pointsZoomThreshold;

  const connectionsGeoJSON = useMemo(() => {
    const features = connections.map(conn => {
      const fromPoint = data.find(p => p.id === conn.from);
      const toPoint = data.find(p => p.id === conn.to);
      
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
  }, [connections, data]);

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

  // Determine initial view state
  const initialViewState = useMemo(() => {
    if (autoZoomToDensity && densityCenter) {
      return {
        longitude: densityCenter.center[0],
        latitude: densityCenter.center[1],
        zoom: densityCenter.zoom
      };
    }
    return {
      longitude: centerCoordinates[0],
      latitude: centerCoordinates[1],
      zoom: zoom
    };
  }, [autoZoomToDensity, densityCenter, centerCoordinates, zoom]);

  return (
    <div className={`w-full h-full rounded overflow-hidden ${className}`}>
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

        {showPoints && data.map(point => (
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
              onMouseEnter={() => point.popupData && setHoveredPoint(point)}
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

        {hoveredPoint && hoveredPoint.popupData && (
          <Popup
            longitude={hoveredPoint.coordinates[0]}
            latitude={hoveredPoint.coordinates[1]}
            anchor="bottom"
            onClose={() => setHoveredPoint(null)}
            closeButton={false}
            closeOnClick={false}
            offset={15}
          >
            <div className="p-2 text-sm">
              <div className="font-semibold">{hoveredPoint.name}</div>
              <div className="text-xs text-gray-500">Value: {hoveredPoint.value}</div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default MapViewer;