import { MapViewer } from './Map-Viewer';
import type { MapDataPoint, MapConnection } from './Map-Viewer';

/**
 * Example usage of MapViewer with sample Indian cities data
 * 
 * This is a simple component that demonstrates how to use MapViewer
 * by passing data and connections as props.
 */
export const MapViewerExample = () => {
  // Sample data with three categories - Indian cities
  const sampleData: MapDataPoint[] = [
    // Red category points (High intensity)
    {
      id: 1,
      name: 'Mumbai',
      coordinates: [72.8777, 19.0760],
      value: 100,
      category: 'red',
      additionalData: {
        population: '20M',
        status: 'Critical',
      },
    },
    {
      id: 2,
      name: 'Delhi',
      coordinates: [77.1025, 28.7041],
      value: 95,
      category: 'red',
      additionalData: {
        population: '16.8M',
        status: 'Alert',
      },
    },
    {
      id: 3,
      name: 'Kolkata',
      coordinates: [88.3639, 22.5726],
      value: 85,
      category: 'red',
      additionalData: {
        population: '14.8M',
        status: 'Critical',
      },
    },
    
    // Azul (Blue) category points (Medium intensity)
    {
      id: 4,
      name: 'Chennai',
      coordinates: [80.2707, 13.0827],
      value: 70,
      category: 'azul',
      additionalData: {
        population: '7.1M',
        status: 'Normal',
      },
    },
    {
      id: 5,
      name: 'Bangalore',
      coordinates: [77.5946, 12.9716],
      value: 75,
      category: 'azul',
      additionalData: {
        population: '8.4M',
        status: 'Normal',
      },
    },
    {
      id: 6,
      name: 'Hyderabad',
      coordinates: [78.4867, 17.3850],
      value: 68,
      category: 'azul',
      additionalData: {
        population: '6.9M',
        status: 'Monitored',
      },
    },
    {
      id: 7,
      name: 'Pune',
      coordinates: [73.8567, 18.5204],
      value: 65,
      category: 'azul',
      additionalData: {
        population: '3.1M',
        status: 'Normal',
      },
    },
    
    // Green category points (Low intensity)
    {
      id: 8,
      name: 'Ahmedabad',
      coordinates: [72.5714, 23.0225],
      value: 55,
      category: 'green',
      additionalData: {
        population: '5.6M',
        status: 'Optimal',
      },
    },
    {
      id: 9,
      name: 'Jaipur',
      coordinates: [75.7873, 26.9124],
      value: 50,
      category: 'green',
      additionalData: {
        population: '3.1M',
        status: 'Good',
      },
    },
    {
      id: 10,
      name: 'Lucknow',
      coordinates: [80.9462, 26.8467],
      value: 48,
      category: 'green',
      additionalData: {
        population: '2.8M',
        status: 'Excellent',
      },
    },
    {
      id: 11,
      name: 'Kochi',
      coordinates: [76.2711, 9.9312],
      value: 45,
      category: 'green',
      additionalData: {
        population: '2.1M',
        status: 'Good',
      },
    },
    {
      id: 12,
      name: 'Chandigarh',
      coordinates: [76.7794, 30.7333],
      value: 42,
      category: 'green',
      additionalData: {
        population: '1.0M',
        status: 'Optimal',
      },
    },
  ];

  // Sample connections between cities
  const sampleConnections: MapConnection[] = [
    // Red network connections (Critical infrastructure)
    { id: 'conn1', from: 1, to: 2, color: '#D52941', width: 3, label: 'Primary Link' }, // Mumbai to Delhi
    { id: 'conn2', from: 2, to: 3, color: '#D52941', width: 3 }, // Delhi to Kolkata
    { id: 'conn3', from: 1, to: 4, color: '#D52941', width: 2.5 }, // Mumbai to Chennai
    
    // Azul network connections (Secondary infrastructure)
    { id: 'conn4', from: 4, to: 5, color: '#246EB9', width: 2.5, label: 'South Link' }, // Chennai to Bangalore
    { id: 'conn5', from: 5, to: 6, color: '#246EB9', width: 2 }, // Bangalore to Hyderabad
    { id: 'conn6', from: 6, to: 2, color: '#246EB9', width: 2 }, // Hyderabad to Delhi
    { id: 'conn7', from: 1, to: 7, color: '#246EB9', width: 2 }, // Mumbai to Pune
    
    // Green network connections (Tertiary infrastructure)
    { id: 'conn8', from: 8, to: 1, color: '#4CB944', width: 1.5 }, // Ahmedabad to Mumbai
    { id: 'conn9', from: 9, to: 2, color: '#4CB944', width: 1.5 }, // Jaipur to Delhi
    { id: 'conn10', from: 10, to: 3, color: '#4CB944', width: 1.5 }, // Lucknow to Kolkata
    { id: 'conn11', from: 11, to: 4, color: '#4CB944', width: 1.5 }, // Kochi to Chennai
    { id: 'conn12', from: 12, to: 2, color: '#4CB944', width: 1.5 }, // Chandigarh to Delhi
    
    // Cross-category connections (showing interconnectivity)
    { id: 'conn13', from: 5, to: 1, color: '#FFB84D', width: 2, label: 'Cross Link' }, // Bangalore to Mumbai (orange)
    { id: 'conn14', from: 8, to: 9, color: '#9D4DFF', width: 1.5 }, // Ahmedabad to Jaipur (purple)
  ];

  const handlePointClick = (point: MapDataPoint) => {
    console.log('Clicked point:', point);
    alert(`You clicked on ${point.name} (${point.category})`);
  };

  return (
    <div className="w-full h-full">
      <MapViewer
        data={sampleData}
        connections={sampleConnections}
        centerCoordinates={[78.9629, 20.5937]} // Center of India
        zoom={4}
        showLabels={false}
        pointSize={12}
        enableZoom={true}
        enablePan={true}
        onPointClick={handlePointClick}
        className="rounded-lg"
        bounds={{
          minLongitude: 68.1766,
          maxLongitude: 97.4025,
          minLatitude: 8.4,
          maxLatitude: 37.6
        }}
        heatmapZoomThreshold={6}
        pointsZoomThreshold={6}
        mapFlavor="dark"
      />
    </div>
  );
};

export default MapViewerExample;

