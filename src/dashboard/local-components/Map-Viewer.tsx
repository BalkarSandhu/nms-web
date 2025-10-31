import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { Protocol } from 'pmtiles';
import PopOverContent, { type FilterLink } from './hover-over-popup';
import 'maplibre-gl/dist/maplibre-gl.css';

// Register PMTiles protocol
let protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

// Popup data structure matching hover-over-popup.tsx
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

// Data point type definitions
export interface MapDataPoint {
  id: string | number;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  value: number; // For sizing circles or other metrics
  category: 'red' | 'azul' | 'green'; // Color category
  popupData?: PopupData; // Data for hover popup
  additionalData?: Record<string, any>; // For tooltips or custom data
}

export interface MapConnection {
  id: string | number;
  from: string | number; // ID of source point
  to: string | number;   // ID of destination point
  color?: string;        // Optional color override, defaults to category color
  width?: number;        // Line width, defaults to 2
  label?: string;        // Optional label for the connection
}

export interface MapViewerProps {
  data?: MapDataPoint[];
  connections?: MapConnection[];
  centerCoordinates?: [number, number]; // Map center [longitude, latitude]
  zoom?: number; // Initial zoom level
  showLabels?: boolean; // Show point labels
  pointSize?: number; // Base size for points
  enableZoom?: boolean; // Enable zoom controls
  enablePan?: boolean; // Enable panning
  onPointClick?: (point: MapDataPoint) => void;
  onFilterSet?: (filter: FilterLink) => void; // Callback when a filter is set from popup
  className?: string;
  bounds?: {
    minLongitude: number;
    maxLongitude: number;
    minLatitude: number;
    maxLatitude: number;
  };
  heatmapZoomThreshold?: number; // Zoom level below which heatmap is shown
  pointsZoomThreshold?: number; // Zoom level above which points are shown
  mapFlavor?: 'dark' | 'light'; // Map theme
}

export const MapViewer = ({
  data = [],
  connections = [],
  centerCoordinates = [78.9629, 20.5937], // Center of India
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
  }, // India bounds
  heatmapZoomThreshold = 6,
  pointsZoomThreshold = 6,
  mapFlavor = 'dark',
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

  // Handle filter updates from popup
  useEffect(() => {
    if (popupFilter && onFilterSet) {
      onFilterSet(popupFilter);
      setPopupFilter(null); // Reset after handling
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
    const pmtilesUrl = import.meta.env.VITE_MAP_SOURCE || 'http://localhost:8080/India.pmtiles';
    
    // Define custom layers for India PMTiles data
    const customLayers: any[] = [
      // Earth/background layer
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
      // Water bodies
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
      // Landuse areas
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
            'wood', mapFlavor === 'dark' ? '#1a3d2e' : '#b8d6b9',
            'forest', mapFlavor === 'dark' ? '#1a3d2e' : '#b8d6b9',
            'grass', mapFlavor === 'dark' ? '#2a4d2e' : '#d8e6c9',
            mapFlavor === 'dark' ? '#2a2a2a' : '#e8e8e8'
          ],
          'fill-opacity': 0.3
        }
      },
      // Landcover
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
      // Buildings
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
        id: 'buildings-outline',
        type: 'line',
        source: 'india-tiles',
        'source-layer': 'buildings',
        minzoom: 13,
        paint: {
          'line-color': mapFlavor === 'dark' ? '#4a4a4a' : '#c0c0c0',
          'line-width': 0.5,
          'line-opacity': 0.5
        }
      },
      // Roads - different types
      {
        id: 'roads-minor',
        type: 'line',
        source: 'india-tiles',
        'source-layer': 'roads',
        filter: ['in', 'class', 'minor', 'service'],
        paint: {
          'line-color': mapFlavor === 'dark' ? '#3a3a3a' : '#ffffff',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0.5,
            14, 2,
            18, 4
          ],
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
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 1,
            12, 3,
            16, 8
          ],
          'line-opacity': 0.8
        }
      },
      {
        id: 'roads-motorway',
        type: 'line',
        source: 'india-tiles',
        'source-layer': 'roads',
        filter: ['in', 'class', 'motorway', 'trunk'],
        paint: {
          'line-color': mapFlavor === 'dark' ? '#5a5a5a' : '#ff6b6b',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 1,
            10, 4,
            14, 10
          ],
          'line-opacity': 0.9
        }
      },
      // Boundaries
      {
        id: 'boundaries',
        type: 'line',
        source: 'india-tiles',
        'source-layer': 'boundaries',
        paint: {
          'line-color': mapFlavor === 'dark' ? '#666666' : '#999999',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 1,
            8, 2,
            12, 3
          ],
          'line-dasharray': [3, 2],
          'line-opacity': 0.7
        }
      },
      // Places - city labels
      {
        id: 'places',
        type: 'symbol',
        source: 'india-tiles',
        'source-layer': 'places',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 10,
            8, 14,
            12, 18
          ],
          'text-anchor': 'center',
          'text-offset': [0, 1.5]
        },
        paint: {
          'text-color': mapFlavor === 'dark' ? '#ffffff' : '#000000',
          'text-halo-color': mapFlavor === 'dark' ? '#000000' : '#ffffff',
          'text-halo-width': 2
        }
      },
      // POIs
      // {
      //   id: 'pois',
      //   type: 'circle',
      //   source: 'india-tiles',
      //   'source-layer': 'pois',
      //   minzoom: 14,
      //   paint: {
      //     'circle-radius': 4,
      //     'circle-color': mapFlavor === 'dark' ? '#4CAF50' : '#2196F3',
      //     'circle-opacity': 0.2,
      //     'circle-stroke-width': 1,
      //     'circle-stroke-color': mapFlavor === 'dark' ? '#ffffff0f' : '#000000'
      //   }
      // }
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

  // Max bounds for restricting map view
  const maxBounds: [[number, number], [number, number]] = useMemo(() => [
    [bounds.minLongitude, bounds.minLatitude],
    [bounds.maxLongitude, bounds.maxLatitude]
  ], [bounds]);

  // Group data by category
  const groupedData = useMemo(() => ({
    red: data.filter((point) => point.category === 'red'),
    azul: data.filter((point) => point.category === 'azul'),
    green: data.filter((point) => point.category === 'green'),
  }), [data]);

  // Determine what to show based on zoom
  const showHeatmap = currentZoom <= heatmapZoomThreshold;
  const showPoints = currentZoom > pointsZoomThreshold;

  // Convert connections to GeoJSON LineStrings
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

  // Handle zoom changes
  const handleMove = useCallback((evt: any) => {
    setCurrentZoom(evt.viewState.zoom);
  }, []);

  // Create GeoJSON for heatmap visualization
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

  return (
    <div className={`w-full h-full ${className}`}>
      <Map
        ref={mapRef}
        style={{ width: '100%', height: '100%' }}
        initialViewState={{
          longitude: centerCoordinates[0],
          latitude: centerCoordinates[1],
          zoom: zoom
        }}
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
        {/* Heatmap layers - visible when zoom <= threshold */}
        {showHeatmap && (
          <>
            {/* Red category heatmap */}
            <Source id="red-heat" type="geojson" data={createHeatmapGeoJSON(groupedData.red)}>
              <Layer
                id="red-heat-layer"
                type="heatmap"
                paint={{
                  'heatmap-weight': [
                    'interpolate',
                    ['linear'],
                    ['get', 'value'],
                    0, 0,
                    100, 1
                  ],
                  'heatmap-intensity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 1,
                    9, 3
                  ],
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
                  'heatmap-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 20,
                    9, 40
                  ],
                  'heatmap-opacity': 0.7
                }}
              />
            </Source>

            {/* Azul (Blue) category heatmap */}
            <Source id="azul-heat" type="geojson" data={createHeatmapGeoJSON(groupedData.azul)}>
              <Layer
                id="azul-heat-layer"
                type="heatmap"
                paint={{
                  'heatmap-weight': [
                    'interpolate',
                    ['linear'],
                    ['get', 'value'],
                    0, 0,
                    100, 1
                  ],
                  'heatmap-intensity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 1,
                    9, 3
                  ],
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
                  'heatmap-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 20,
                    9, 40
                  ],
                  'heatmap-opacity': 0.7
                }}
              />
            </Source>

            {/* Green category heatmap */}
            <Source id="green-heat" type="geojson" data={createHeatmapGeoJSON(groupedData.green)}>
              <Layer
                id="green-heat-layer"
                type="heatmap"
                paint={{
                  'heatmap-weight': [
                    'interpolate',
                    ['linear'],
                    ['get', 'value'],
                    0, 0,
                    100, 1
                  ],
                  'heatmap-intensity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 1,
                    9, 3
                  ],
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
                  'heatmap-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 20,
                    9, 40
                  ],
                  'heatmap-opacity': 0.7
                }}
              />
            </Source>
          </>
        )}

        {/* Connection lines - visible when points are visible */}
        {showPoints && connections.length > 0 && (
          <Source
            id="connections"
            type="geojson"
            data={connectionsGeoJSON}
          >
            {/* Glow effect layer (bottom) */}
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
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
            />
            {/* Main line layer */}
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
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
            />
          </Source>
        )}

        {/* Arrow markers for connections - visible when points are visible */}
        {showPoints && connections.map(conn => {
          const fromPoint = data.find(p => p.id === conn.from);
          const toPoint = data.find(p => p.id === conn.to);
          
          if (!fromPoint || !toPoint) return null;
          
          // Calculate midpoint and angle for arrow
          const midLng = (fromPoint.coordinates[0] + toPoint.coordinates[0]) / 2;
          const midLat = (fromPoint.coordinates[1] + toPoint.coordinates[1]) / 2;
          
          return (
            <Marker
              key={`arrow-${conn.id}`}
              longitude={midLng}
              latitude={midLat}
              anchor="center"
              rotation={Math.atan2(
                toPoint.coordinates[1] - fromPoint.coordinates[1],
                toPoint.coordinates[0] - fromPoint.coordinates[0]
              ) * (180 / Math.PI)}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: `${4 + (conn.width || 2) * 0.5}px solid transparent`,
                  borderRight: `${4 + (conn.width || 2) * 0.5}px solid transparent`,
                  borderBottom: `${8 + (conn.width || 2)}px solid ${conn.color || '#888888'}`,
                  opacity: 0.9,
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                }}
              />
            </Marker>
          );
        })}

        {/* Point markers - visible when zoom > threshold */}
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

        {/* Hover popup */}
        {hoveredPoint && hoveredPoint.popupData && (
          <Popup
            longitude={hoveredPoint.coordinates[0]}
            latitude={hoveredPoint.coordinates[1]}
            anchor="bottom"
            onClose={() => setHoveredPoint(null)}
            closeButton={false}
            closeOnClick={false}
            className="map-popup p-0!"
            offset={15}
          >
            <PopOverContent 
              EventData={hoveredPoint.popupData} 
              setFilter={setPopupFilter}
            />
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default MapViewer;
