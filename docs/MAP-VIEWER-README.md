# Map Viewer Component Documentation

## Overview

The `MapViewer` component is a powerful, flexible ECharts-based map visualization component built with React and TypeScript. It displays geographic data points with customizable colors, sizes, and interactions.

## Features

- ✅ **Dynamic Sizing**: Automatically adapts to container size without min/max restrictions
- ✅ **Color Categories**: Supports three color categories (red, azul, green) using CSS custom properties
- ✅ **Data Grouping**: Automatically groups data by category with separate series
- ✅ **Interactive**: Zoom, pan, hover tooltips, and click events
- ✅ **Customizable**: Configure point sizes, labels, zoom levels, and more
- ✅ **Type-Safe**: Full TypeScript support with comprehensive type definitions
- ✅ **Responsive**: Works seamlessly across different screen sizes

## Installation

The component uses the following packages (already installed):
- `echarts-for-react` - React wrapper for ECharts
- `echarts` - Core charting library

The world map GeoJSON data is loaded dynamically from a CDN when the component mounts, so no additional packages are needed.

## Usage

### Basic Example

```tsx
import { MapViewer, MapDataPoint } from './local-components/Map-Viewer';

const MyComponent = () => {
  const data: MapDataPoint[] = [
    {
      id: 1,
      name: 'New York',
      coordinates: [-74.006, 40.7128], // [longitude, latitude]
      value: 100,
      category: 'red',
    },
    {
      id: 2,
      name: 'London',
      coordinates: [-0.1278, 51.5074],
      value: 90,
      category: 'azul',
    },
    {
      id: 3,
      name: 'Tokyo',
      coordinates: [139.6917, 35.6895],
      value: 120,
      category: 'green',
    },
  ];

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <MapViewer data={data} />
    </div>
  );
};
```

### Advanced Example with All Props

```tsx
const AdvancedMapViewer = () => {
  const data: MapDataPoint[] = [
    {
      id: 1,
      name: 'Server A',
      coordinates: [-74.006, 40.7128],
      value: 150, // Used for point sizing
      category: 'red', // Color category
      additionalData: {
        status: 'Critical',
        load: '95%',
        uptime: '98.5%',
      },
    },
    // ... more data points
  ];

  const handlePointClick = (point: MapDataPoint) => {
    console.log('Clicked:', point);
    // Handle the click event (e.g., show modal, navigate, etc.)
  };

  return (
    <div className="w-full h-screen">
      <MapViewer
        data={data}
        centerCoordinates={[-40, 35]} // Center on Atlantic
        zoom={1.5}
        showLabels={true}
        pointSize={15}
        enableZoom={true}
        enablePan={true}
        onPointClick={handlePointClick}
        className="shadow-lg"
      />
    </div>
  );
};
```

## API Reference

### MapDataPoint Interface

```typescript
interface MapDataPoint {
  id: string | number;              // Unique identifier
  name: string;                      // Display name
  coordinates: [number, number];     // [longitude, latitude]
  value: number;                     // Metric value (affects size)
  category: 'red' | 'azul' | 'green'; // Color category
  additionalData?: Record<string, any>; // Custom data for tooltips
}
```

### MapViewerProps Interface

```typescript
interface MapViewerProps {
  data: MapDataPoint[];              // Required: Array of data points
  centerCoordinates?: [number, number]; // Default: [0, 0]
  zoom?: number;                     // Default: 1
  showLabels?: boolean;              // Default: false
  pointSize?: number;                // Default: 10 (base size)
  enableZoom?: boolean;              // Default: true
  enablePan?: boolean;               // Default: true
  onPointClick?: (point: MapDataPoint) => void; // Click handler
  className?: string;                // CSS classes
}
```

### Props Details

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `MapDataPoint[]` | **Required** | Array of data points to display on the map |
| `centerCoordinates` | `[number, number]` | `[0, 0]` | Initial map center as [longitude, latitude] |
| `zoom` | `number` | `1` | Initial zoom level (0.5 - 20) |
| `showLabels` | `boolean` | `false` | Always show point labels (true) or only on hover (false) |
| `pointSize` | `number` | `10` | Base size for points (actual size scales with value) |
| `enableZoom` | `boolean` | `true` | Enable mouse wheel zoom |
| `enablePan` | `boolean` | `true` | Enable click-and-drag panning |
| `onPointClick` | `function` | `undefined` | Callback when a point is clicked |
| `className` | `string` | `''` | Additional CSS classes for the container |

## Color Categories

The component uses three color categories defined by CSS custom properties:

- **Red** (`--red`): Default `#D52941`
- **Azul** (`--azul`): Default `#246EB9`
- **Green** (`--green`): Default `#4CB944`

These colors are automatically extracted from your CSS variables and will update if you change them.

## Dynamic Sizing

The component is designed to fill its container completely:

```tsx
// Full viewport
<div style={{ width: '100vw', height: '100vh' }}>
  <MapViewer data={data} />
</div>

// Flexible container with Tailwind
<div className="w-full h-full">
  <MapViewer data={data} />
</div>

// Fixed size container
<div style={{ width: '800px', height: '600px' }}>
  <MapViewer data={data} />
</div>
```

The map will automatically resize when the container size changes - no manual handling needed!

## Point Sizing

Point sizes are calculated based on the `value` property:

```typescript
actualSize = Math.max(baseSize, baseSize * √value)
```

- Higher values = larger points
- Minimum size = `pointSize` prop
- Scales smoothly with square root for better visual distribution

## Tooltips

Tooltips automatically display:
- Point name
- Category (with color indicator)
- Value
- Coordinates
- Any additional data from `additionalData` object

## Examples

### Network Monitoring

```tsx
const networkData: MapDataPoint[] = servers.map(server => ({
  id: server.id,
  name: server.hostname,
  coordinates: server.location,
  value: server.responseTime,
  category: server.status === 'down' ? 'red' : 
            server.status === 'warning' ? 'azul' : 'green',
  additionalData: {
    uptime: server.uptime,
    load: server.load,
    lastCheck: server.lastCheckTime,
  },
}));

<MapViewer data={networkData} pointSize={12} />
```

### Geographic Data Visualization

```tsx
const geoData: MapDataPoint[] = cities.map(city => ({
  id: city.id,
  name: city.name,
  coordinates: [city.lng, city.lat],
  value: city.population / 1000000, // Scale population
  category: city.population > 5000000 ? 'red' :
            city.population > 1000000 ? 'azul' : 'green',
  additionalData: {
    country: city.country,
    population: city.population.toLocaleString(),
    area: `${city.area} km²`,
  },
}));

<MapViewer 
  data={geoData} 
  showLabels={true}
  pointSize={8}
  zoom={1.2}
/>
```

## Troubleshooting

### Map doesn't display
- Ensure the parent container has explicit width and height
- Check that `data` array is not empty
- Verify coordinates are in [longitude, latitude] format
- Wait for the map to load (shows "Loading map..." while fetching GeoJSON data)

### Map shows "Loading map..." indefinitely
- Check your internet connection (map data is fetched from CDN)
- Verify no firewall/proxy is blocking the request to `geo.datav.aliyun.com`
- Check browser console for network errors

### Points are too small/large
- Adjust the `pointSize` prop (base size)
- Check that `value` properties are reasonable numbers
- Remember: size scales with square root of value

### Colors don't match theme
- The component reads colors from CSS custom properties
- Ensure `--red`, `--azul`, and `--green` are defined in your CSS
- Colors update automatically when CSS variables change

## Performance Tips

1. **Large datasets**: For 1000+ points, consider:
   - Data aggregation/clustering
   - Lazy loading visible regions
   - Reducing `pointSize` for better rendering

2. **Frequent updates**: Use `React.memo` if parent re-renders often:
   ```tsx
   const MemoizedMapViewer = React.memo(MapViewer);
   ```

3. **Mobile devices**: Consider disabling labels on small screens:
   ```tsx
   const isMobile = window.innerWidth < 768;
   <MapViewer showLabels={!isMobile} />
   ```

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

Requires support for:
- ES6+ JavaScript
- CSS Custom Properties
- Canvas/SVG rendering

## License

Part of the NMS Web application.
