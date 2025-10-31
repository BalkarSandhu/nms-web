import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts';

// Data point type definitions
export interface MapDataPoint {
  id: string | number;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  value: number; // For sizing circles or other metrics
  category: 'red' | 'azul' | 'green'; // Color category
  additionalData?: Record<string, any>; // For tooltips or custom data
}

export interface MapViewerProps {
  data: MapDataPoint[];
  centerCoordinates?: [number, number]; // Map center [longitude, latitude]
  zoom?: number; // Initial zoom level
  showLabels?: boolean; // Show point labels
  pointSize?: number; // Base size for points
  enableZoom?: boolean; // Enable zoom controls
  enablePan?: boolean; // Enable panning
  onPointClick?: (point: MapDataPoint) => void;
  className?: string;
}

export const MapViewer = ({
  data = [],
  centerCoordinates = [0, 0],
  zoom = 1,
  showLabels = false,
  pointSize = 10,
  enableZoom = true,
  enablePan = true,
  onPointClick,
  className = '',
}: MapViewerProps) => {
  const [colors, setColors] = useState<{ red: string; azul: string; green: string }>({
    red: '#D52941',
    azul: '#246EB9',
    green: '#4CB944',
  });
  const [mapLoaded, setMapLoaded] = useState(false);

  // Load world map GeoJSON
  useEffect(() => {
    // Try multiple sources for world map
    const loadWorldMap = async () => {
      const sources = [
        'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json',
        'https://unpkg.com/world-atlas@2/countries-110m.json',
        'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'
      ];

      for (const url of sources) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          
          const geoJson = await response.json();
          echarts.registerMap('world', geoJson);
          setMapLoaded(true);
          return;
        } catch (error) {
          console.warn(`Failed to load map from ${url}:`, error);
          continue;
        }
      }

      // If all sources fail, create a minimal fallback
      console.error('Failed to load world map from all sources');
      echarts.registerMap('world', {
        type: 'FeatureCollection',
        features: [],
      });
      setMapLoaded(true);
    };

    loadWorldMap();
  }, []);

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

  // Group data by category
  const groupedData = {
    red: data.filter((point) => point.category === 'red'),
    azul: data.filter((point) => point.category === 'azul'),
    green: data.filter((point) => point.category === 'green'),
  };

  // Create series for each category
  const createSeries = (
    categoryData: MapDataPoint[],
    color: string,
    categoryName: string
  ) => {
    return {
      name: categoryName,
      type: 'scatter' as const,
      coordinateSystem: 'geo' as const,
      data: categoryData.map((point) => ({
        name: point.name,
        value: [...point.coordinates, point.value],
        itemStyle: {
          color: color,
        },
        // Store original point data for click events
        originalData: point,
      })),
      symbolSize: (val: number[]) => {
        // Scale symbol size based on value
        const baseSize = pointSize;
        const valueScale = val[2] || 1;
        return Math.max(baseSize, baseSize * Math.sqrt(valueScale));
      },
      label: {
        show: showLabels,
        formatter: '{b}',
        position: 'right' as const,
        fontSize: 11,
        color: color,
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold' as const,
        },
        itemStyle: {
          shadowBlur: 10,
          shadowColor: color,
          borderColor: color,
          borderWidth: 2,
        },
      },
    };
  };

  // Build ECharts option
  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const data = params.data?.originalData as MapDataPoint | undefined;
        if (!data) return '';
        
        const categoryColor = colors[data.category as keyof typeof colors];
        
        let tooltipContent = `
          <div style="padding: 8px;">
            <strong>${data.name}</strong><br/>
            <span style="color: ${categoryColor}">● ${data.category.toUpperCase()}</span><br/>
            Value: ${data.value}<br/>
            Coordinates: [${data.coordinates[0].toFixed(4)}, ${data.coordinates[1].toFixed(4)}]
        `;
        
        // Add additional data if available
        if (data.additionalData) {
          Object.entries(data.additionalData).forEach(([key, value]) => {
            tooltipContent += `<br/>${key}: ${value}`;
          });
        }
        
        tooltipContent += '</div>';
        return tooltipContent;
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ccc',
      borderWidth: 1,
      textStyle: {
        color: '#333',
      },
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'top',
      data: [
        { name: 'Red', itemStyle: { color: colors.red } },
        { name: 'Azul', itemStyle: { color: colors.azul } },
        { name: 'Green', itemStyle: { color: colors.green } },
      ],
      textStyle: {
        color: getComputedStyle(document.documentElement)
          .getPropertyValue('--foreground')
          .trim() || '#000',
      },
    },
    geo: {
      map: 'world',
      roam: enableZoom || enablePan ? true : false,
      zoom: zoom,
      center: centerCoordinates,
      itemStyle: {
        areaColor: 'rgba(128, 128, 128, 0.1)',
        borderColor: 'rgba(128, 128, 128, 0.3)',
      },
      emphasis: {
        itemStyle: {
          areaColor: 'rgba(128, 128, 128, 0.2)',
        },
      },
      scaleLimit: {
        min: 0.5,
        max: 20,
      },
    },
    series: [
      createSeries(groupedData.red, colors.red, 'Red'),
      createSeries(groupedData.azul, colors.azul, 'Azul'),
      createSeries(groupedData.green, colors.green, 'Green'),
    ],
  };

  // Handle click events
  const onEvents: Record<string, Function> = {};
  
  if (onPointClick) {
    onEvents.click = (params: any) => {
      if (params.componentType === 'series' && params.data?.originalData) {
        onPointClick(params.data.originalData);
      }
    };
  }

  // Show loading state while map is being loaded
  if (!mapLoaded) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-lg">Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <ReactECharts
        option={option}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 'inherit',
          minWidth: 'inherit',
        }}
        notMerge={true}
        lazyUpdate={true}
        onEvents={onEvents}
        opts={{
          renderer: 'canvas',
        }}
      />
    </div>
  );
};

export default MapViewer;
