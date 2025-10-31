import { MapViewer, MapDataPoint } from './Map-Viewer';

/**
 * Example usage of the MapViewer component
 * 
 * This demonstrates how to use the map viewer with sample data
 */
export const MapViewerExample = () => {
  // Sample data with three categories
  const sampleData: MapDataPoint[] = [
    // Red category points
    {
      id: 1,
      name: 'New York',
      coordinates: [-74.006, 40.7128],
      value: 100,
      category: 'red',
      additionalData: {
        population: '8.4M',
        status: 'Critical',
      },
    },
    {
      id: 2,
      name: 'Los Angeles',
      coordinates: [-118.2437, 34.0522],
      value: 80,
      category: 'red',
      additionalData: {
        population: '4M',
        status: 'Alert',
      },
    },
    
    // Azul (Blue) category points
    {
      id: 3,
      name: 'London',
      coordinates: [-0.1278, 51.5074],
      value: 90,
      category: 'azul',
      additionalData: {
        population: '9M',
        status: 'Normal',
      },
    },
    {
      id: 4,
      name: 'Paris',
      coordinates: [2.3522, 48.8566],
      value: 70,
      category: 'azul',
      additionalData: {
        population: '2.2M',
        status: 'Normal',
      },
    },
    {
      id: 5,
      name: 'Berlin',
      coordinates: [13.405, 52.52],
      value: 65,
      category: 'azul',
      additionalData: {
        population: '3.7M',
        status: 'Normal',
      },
    },
    
    // Green category points
    {
      id: 6,
      name: 'Tokyo',
      coordinates: [139.6917, 35.6895],
      value: 120,
      category: 'green',
      additionalData: {
        population: '14M',
        status: 'Optimal',
      },
    },
    {
      id: 7,
      name: 'Sydney',
      coordinates: [151.2093, -33.8688],
      value: 60,
      category: 'green',
      additionalData: {
        population: '5.3M',
        status: 'Good',
      },
    },
    {
      id: 8,
      name: 'Singapore',
      coordinates: [103.8198, 1.3521],
      value: 75,
      category: 'green',
      additionalData: {
        population: '5.7M',
        status: 'Excellent',
      },
    },
  ];

  // Handle point clicks
  const handlePointClick = (point: MapDataPoint) => {
    console.log('Clicked point:', point);
    alert(`You clicked on ${point.name} (${point.category})`);
  };

  return (
    <div className="w-full h-full">
      <MapViewer
        data={sampleData}
        centerCoordinates={[0, 30]} // Center the map
        zoom={1.2}
        showLabels={false} // Set to true to always show labels
        pointSize={12}
        enableZoom={true}
        enablePan={true}
        onPointClick={handlePointClick}
        className="rounded-lg"
      />
    </div>
  );
};

export default MapViewerExample;
