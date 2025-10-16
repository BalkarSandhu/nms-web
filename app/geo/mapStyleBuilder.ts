// A minimal helper to build custom map styles and tile URLs

export interface TileStyle {
  tiles?: string[];
  maxZoom?: number;
  attribution?: string;
}

export function createTileUrls(
  subdomains: (string | number)[],
  baseUrl: string
): string[] {
  // Replace {s} with each subdomain
  return subdomains.map((s) => baseUrl.replace("{s}", s.toString()));
}

export function styleCustom(options: TileStyle): TileStyle {
  // Just returns the tile style config so you can extend later
  return {
    tiles: options.tiles,
    maxZoom: options.maxZoom,
    attribution: options.attribution,
  };
}
