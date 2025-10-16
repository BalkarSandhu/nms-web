import { MapStyle } from "@/types/mapTypes";
import { styleCustom, createTileUrls } from "./mapStyleBuilder";

const LOCATIONIQ_KEY = "pk.0f147952a41c555a5b70614039fd148b";

export const FREE_MAP_PROVIDERS: MapStyle[] = [
  {
    id: "locationIqStreets",
    title: "Streets",
    style: `https://tiles.locationiq.com/v3/streets/vector.json?key=${LOCATIONIQ_KEY}`,
    available: true,
  },
  {
    id: "locationIqDark",
    title: "Dark",
    style: `https://tiles.locationiq.com/v3/dark/vector.json?key=${LOCATIONIQ_KEY}`,
    available: true,
  },
  {
    id: "googleSatellite",
    title: "Satellite",
    style: styleCustom({
      tiles: createTileUrls(
        [0, 1, 2, 3],
        "https://mt{s}.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}&s=Ga"
      ),
      maxZoom: 20,
      attribution: "© Google",
    }),
    available: true,
  },
  {
    id: "googleHybrid",
    title: "Hybrid",
    style: styleCustom({
      tiles: createTileUrls(
        [0, 1, 2, 3],
        "https://mt{s}.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}&s=Ga"
      ),
      maxZoom: 20,
      attribution: "© Google",
    }),
    available: true,
  },
];

export const DEFAULT_MAP_CENTER: [number, number] = [85.497912, 23.741831];
export const DEFAULT_MAP_ZOOM = 8;
export const DEFAULT_MAP_STYLE = "googleHybrid";
