'use client';
import * as React from 'react';
import { useState, useCallback, useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import Map, { Source, Layer, MapRef, ViewState } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { layers, namedFlavor } from '@protomaps/basemaps';
// import { // toast } from 'sonner';
// import DrawControl from './draw-control';
// import type { FeatureCollection, Feature, Polygon, GeoJsonProperties, Geometry } from 'geojson';


// import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
// import './map-styles.css';

interface MapWrapperProps {
    children?: React.ReactNode;
    initialViewState?: {
        longitude: number;
        latitude: number;
        zoom: number;
    };
    showDrawingTools?: boolean;
    mapStyle?: string;
    mapFlavor?: string;
    interactiveLayerIds?: string[];    
    onClick?:(e: maplibregl.MapLayerMouseEvent) => void;
    onMouseMove?:(e: maplibregl.MapLayerMouseEvent) => void;
    onMouseLeave?:(e: maplibregl.MapLayerMouseEvent) => void;
    maxBounds?: [[number, number], [number, number]];
    username?: string;
    selectedPolygonId?: number | null;
    onPolygonSelected?: (id: number | null) => void;
}

// Custom draw styles to match app theme
const drawStyles = [
    // ACTIVE (being drawn)
    {
        id: 'gl-draw-line',
        type: 'line',
        filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
        layout: {
            'line-cap': 'round',
            'line-join': 'round'
        },
        paint: {
            'line-color': '#ff4d4f',
            'line-width': 2
        }
    },
    {
        id: 'gl-draw-polygon-fill',
        type: 'fill',
        filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
        paint: {
            'fill-color': '#ff4d4f',
            'fill-outline-color': '#ff4d4f',
            'fill-opacity': 0.3
        }
    },
    {
        id: 'gl-draw-polygon-stroke-active',
        type: 'line',
        filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
        layout: {
            'line-cap': 'round',
            'line-join': 'round'
        },
        paint: {
            'line-color': '#ff4d4f',
            'line-width': 2
        }
    },
    // INACTIVE (static, already drawn)
    {
        id: 'gl-draw-polygon-fill-static',
        type: 'fill',
        filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
        paint: {
            'fill-color': '#1890ff',
            'fill-outline-color': '#1890ff',
            'fill-opacity': 0.3
        }
    },
    {
        id: 'gl-draw-polygon-stroke-static',
        type: 'line',
        filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
        layout: {
            'line-cap': 'round',
            'line-join': 'round'
        },
        paint: {
            'line-color': '#1890ff',
            'line-width': 2
        }
    },
    // VERTICES (points)
    {
        id: 'gl-draw-point-point-stroke-inactive',
        type: 'circle',
        filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
        paint: {
            'circle-radius': 5,
            'circle-color': '#fff',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#1890ff'
        }
    },
    {
        id: 'gl-draw-point-active',
        type: 'circle',
        filter: ['all', ['==', '$type', 'Point'], ['!=', 'meta', 'midpoint'], ['==', 'active', 'true']],
        paint: {
            'circle-radius': 7,
            'circle-color': '#fff',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ff4d4f'
        }
    },
    {
        id: 'gl-draw-point-inactive',
        type: 'circle',
        filter: ['all', ['==', '$type', 'Point'], ['!=', 'meta', 'midpoint'], ['==', 'active', 'false']],
        paint: {
            'circle-radius': 5,
            'circle-color': '#fff',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#1890ff'
        }
    },
    // MIDPOINTS (point between vertices)
    {
        id: 'gl-draw-polygon-midpoint',
        type: 'circle',
        filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
        paint: {
            'circle-radius': 3,
            'circle-color': '#fff',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ff4d4f'
        }
    }
];

const MapWrapper = forwardRef<MapRef, MapWrapperProps>(({
    children,
    initialViewState = {
        longitude: 85.220218,
        latitude: 23.693452,
        
        zoom: 10
    },
    showDrawingTools = false,
    mapFlavor = "dark",
    interactiveLayerIds = ['locations-points', 'geofences-fill'],
    onClick,
    onMouseMove,
    onMouseLeave,
    maxBounds = [
        [84.411355, 22.920898], // Southwest coordinates
        [86.449326, 24.382847]  // Northeast coordinates
        // [0, -90], // Southwest coordinates
        // [180, 90]  // Northeast coordinates
    ],
    username = 'anonymous',
    selectedPolygonId: externalSelectedPolygonId = null,
    onPolygonSelected
}, ref) => {
    const [features, setFeatures] = useState<Record<string, any>>({});
    const [drawMode, setDrawMode] = useState<string>('draw_polygon');
    const mapRef = useRef<MapRef>(null);
    const drawControlRef = useRef<any>(null);
    
    // Expose the mapRef to parent components
    // Simply forward the entire mapRef so parent can access it directly
    useImperativeHandle(ref, () => mapRef.current as MapRef, [mapRef.current]);
    
    // State for saved polygons from the database
    // const [savedPolygons, setSavedPolygons] = useState<SavedGeofence[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    
    // Use either external or internal polygon selection state
    const [internalSelectedPolygonId, setInternalSelectedPolygonId] = useState<number | null>(null);
    const selectedPolygonId = externalSelectedPolygonId !== undefined ? externalSelectedPolygonId : internalSelectedPolygonId;
    
    // Function to handle polygon selection that respects both internal and external state
    const handlePolygonSelection = (id: number | null) => {
        setInternalSelectedPolygonId(id);
        if (onPolygonSelected) {
            onPolygonSelected(id);
        }
    };

    const [viewState, setViewState] = useState<Partial<ViewState>>({
        longitude: initialViewState.longitude,
        latitude: initialViewState.latitude,
        zoom: initialViewState.zoom
    });

    const mapConfig = useMemo(() => {
        const baseLayers = layers("protomaps", namedFlavor(mapFlavor), { lang: "en" });
        
        // Add custom vegetation styling for dark mode
        const customLayers = [...baseLayers];
        
        if (mapFlavor === "dark") {
            // Find and modify vegetation/forest layers to be visible in dark green
            const vegetationLayers: any[] = [
                {
                    id: "vegetation-dark-override",
                    type: "fill",
                    source: "protomaps",
                    "source-layer": "landuse",
                    filter: ["any", 
                        ["==", ["get", "pmap:kind"], "forest"],
                        ["==", ["get", "pmap:kind"], "wood"],
                        ["==", ["get", "pmap:kind"], "nature_reserve"],
                        ["==", ["get", "pmap:kind"], "national_park"],
                        ["==", ["get", "pmap:kind"], "park"]
                    ],
                    paint: {
                        "fill-color": "#1a4d3a", // Dark green for vegetation
                        "fill-opacity": 0.8
                    }
                },
                {
                    id: "grass-dark-override", 
                    type: "fill",
                    source: "protomaps",
                    "source-layer": "landuse",
                    filter: ["any",
                        ["==", ["get", "pmap:kind"], "grass"],
                        ["==", ["get", "pmap:kind"], "meadow"],
                        ["==", ["get", "pmap:kind"], "recreation_ground"]
                    ],
                    paint: {
                        "fill-color": "#2d5a3d", // Slightly lighter dark green for grass
                        "fill-opacity": 0.6
                    }
                },
                {
                    id: "scrub-dark-override",
                    type: "fill", 
                    source: "protomaps",
                    "source-layer": "landuse",
                    filter: ["any",
                        ["==", ["get", "pmap:kind"], "scrub"],
                        ["==", ["get", "pmap:kind"], "heath"]
                    ],
                    paint: {
                        "fill-color": "#1f4435", // Dark green for scrubland
                        "fill-opacity": 0.7
                    }
                }
            ];
            
            // Add the vegetation override layers
            customLayers.push(...vegetationLayers);
        }
        
        return {
            version: 8 as const,
            glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
            sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${mapFlavor}`,
            sources: {
                protomaps: {
                    type: "vector" as const,
                    url: `pmtiles://${import.meta.env.VITE_MAP_SOURCE || `https://${import.meta.env.VITE_MAP_SOURCE || "localhost"}/India.pmtiles`}`,
                    attribution: '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>'
                }
            },
            layers: customLayers
        };
    }, [mapFlavor]);

    // Accepts features as object[], extracts id if present
    const onUpdate = useCallback((e: { features: object[] }) => {
        setFeatures(currFeatures => {
            const newFeatures = { ...currFeatures };
            for (const f of e.features) {
                // Try to extract id from feature
                const id = (f as any).id;
                if (id) {
                    newFeatures[id] = f;
                }
            }
            return newFeatures;
        });
    }, []);

    const onDelete = useCallback((e: { features: object[] }) => {
        setFeatures(currFeatures => {
            const newFeatures = { ...currFeatures };
            for (const f of e.features) {
                const id = (f as any).id;
                if (id) {
                    delete newFeatures[id];
                }
            }
            return newFeatures;
        });
    }, []);


    
    


    
    // Function to handle map clicks, particularly for polygon selection
    const handleMapClick = useCallback((event: maplibregl.MapLayerMouseEvent) => {
        // First, check if this is a click on a saved polygon
        if (event.features && event.features.length > 0 && event.features[0].layer.id === 'saved-polygons-fill') {
            const clickedId = event.features[0].properties?.id;
            if (clickedId !== undefined) {
                // Toggle selection - if already selected, unselect it
                const idToSet = selectedPolygonId === Number(clickedId) ? null : Number(clickedId);
                handlePolygonSelection(idToSet);
                return; // Don't propagate the click if we handled it
            }
        }
        
        // Otherwise, pass the click to the parent component if it provided a handler
        if (onClick) {
            onClick(event);
        }
    }, [onClick, selectedPolygonId]);





    return (
        <div className="relative w-full h-full">
            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-zinc-900 p-4 rounded-md shadow-lg flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                        <span className="text-zinc-200 text-sm">Loading...</span>
                    </div>
                </div>
            )}
            
            <Map
                ref={mapRef}
                id="map"
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                {...viewState}
                onMove={(evt) => setViewState(evt.viewState)}
                onLoad={(evt) => {
                    console.log('🗺️ MapWrapper: Map loaded and ready!', {
                        hasMapRef: !!mapRef.current,
                        hasMap: !!evt.target,
                        timestamp: new Date().toISOString()
                    });
                }}
                maxBounds={maxBounds}
                dragRotate={false}
                scrollZoom={true}
                boxZoom={true}
                doubleClickZoom={true}
                touchZoomRotate={true}
                attributionControl={false}
                mapStyle={mapConfig}
                mapLib={maplibregl}
                interactiveLayerIds={[...interactiveLayerIds, 'saved-polygons-fill']}
                onClick={handleMapClick}
                onMouseMove={onMouseMove}
                onMouseLeave={onMouseLeave}
            >

                {children}
            </Map>
        </div>
    );
});

MapWrapper.displayName = 'MapWrapper';

export default MapWrapper;
