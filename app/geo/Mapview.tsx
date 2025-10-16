"use client";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  FREE_MAP_PROVIDERS,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  DEFAULT_MAP_STYLE,
} from "./mapconfig"; // adjust import path if needed

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface Point {
  id: number;
  name: string;
  lat: number;
  lng: number;
  note?: string;
}

const points: Point[] = [
  { id: 1, name: "Ranchi", lat: 23.3441, lng: 85.3096, note: "Jharkhand capital" },
  { id: 2, name: "Jamshedpur", lat: 22.8046, lng: 86.2029 },
  { id: 3, name: "Dhanbad", lat: 23.7957, lng: 86.4304 },
  { id: 4, name: "Bokaro Steel City", lat: 23.6693, lng: 86.151 },
];

// ✅ Main MapView component
export default function MapView() {
  useEffect(() => {
    // Find selected map style
    const selectedProvider = FREE_MAP_PROVIDERS.find(
      (p) => p.id === DEFAULT_MAP_STYLE
    );

    // Initialize map
    const map = L.map("map", {
      center: [DEFAULT_MAP_CENTER[1], DEFAULT_MAP_CENTER[0]], // [lat, lng]
      zoom: DEFAULT_MAP_ZOOM,
      zoomControl: true,
    });

    // Add map layer based on style type
    if (selectedProvider) {
      if (typeof selectedProvider.style === "string") {
        // If provider uses a style URL (e.g. LocationIQ vector map)
        L.tileLayer(selectedProvider.style, {
          maxZoom: 19,
          attribution: "© OpenStreetMap contributors",
        }).addTo(map);
      } else if (selectedProvider.style.tiles) {
        // Custom tile layers like Google/Carto
        L.tileLayer(selectedProvider.style.tiles[0], {
          maxZoom: selectedProvider.style.maxZoom || 19,
          attribution: selectedProvider.style.attribution || "",
        }).addTo(map);
      }
    }

    // Add markers and zoom behavior
    const latLngs: L.LatLngExpression[] = [];

    points.forEach((p) => {
      const marker = L.marker([p.lat, p.lng]).addTo(map);
      marker.bindPopup(
        `<b>${p.name}</b><br/>Lat: ${p.lat.toFixed(5)}<br/>Lng: ${p.lng.toFixed(5)}${
          p.note ? "<br/>" + p.note : ""
        }`
      );
      latLngs.push([p.lat, p.lng]);

      // Zoom on marker click
      marker.on("click", () => {
        const maxZoomLevel = 17;
        map.setView([p.lat, p.lng], maxZoomLevel, { animate: true });
        marker.openPopup();
      });
    });

    // Fit to bounds initially
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Clean up on unmount
    return () => map.remove();
  }, []);

  return <div className="w-full h-[80vh] rounded-lg border shadow-sm" id="map"></div>;
}
