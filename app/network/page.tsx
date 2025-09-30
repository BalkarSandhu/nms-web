"use client";
import React, { useEffect, useState } from 'react';
import TreeGraph from '@/components/tree-graph';


interface Location {
  location_id: number;
  name: string;
  previous_node: number | null;
}

export default function NetworkPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const response = await fetch('./data.json');
        if (!response.ok) {
          throw new Error('Failed to fetch location data');
        }
        const data = await response.json();
        setLocations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchLocations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading network topology...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      
      <TreeGraph locations={locations} />
    </div>
  );
}