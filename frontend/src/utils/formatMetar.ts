import type { CloudLayer } from '../types/metar';

const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
] as const;

/**
 * Converts wind direction degrees to a compass label.
 * Returns 'VRB' for variable winds.
 * Returns 'N/A' if degrees is undefined or outside 0–360.
 */
export function degreesToCompass(degrees: number | 'VRB' | undefined): string {
  if (degrees === 'VRB') return 'VRB';
  if (degrees === undefined || degrees < 0 || degrees > 360) return 'N/A';
  // 360 should map to North (same as 0)
  const index = Math.round(degrees / 22.5) % 16;
  return COMPASS_POINTS[index];
}

/**
 * Formats a raw visibility string with a unit suffix.
 * Example: "6+" -> "6+ SM", "10" -> "10 SM"
 */
export function formatVisibility(visib: string): string {
  if (!visib) return 'N/A';
  return `${visib} SM`;
}

/**
 * Formats an altimeter setting in hPa.
 * Example: 1025 -> "1025 hPa"
 */
export function formatAltimeter(altim: number): string {
  return `${altim} hPa`;
}

/**
 * Formats a single cloud layer into a human-readable string.
 * Example: { cover: 'BKN', base: 3000 } -> "BKN 3000 ft"
 * Returns 'CAVOK' if cover indicates clear sky.
 */
export function formatCloudLayer(layer: CloudLayer): string {
  return `${layer.cover} ${layer.base.toLocaleString()} ft`;
}

/**
 * Formats wind as a combined direction + speed string.
 * Includes gust if present.
 * Example: (270, 15, 25) -> "W 15 G25 kt"
 * Example: ('VRB', 3, undefined) -> "VRB 3 kt"
 */
export function formatWind(
  wdir: number | 'VRB',
  wspd: number,
  wgst: number | undefined
): string {
  const dir = degreesToCompass(wdir);
  const gust = wgst !== undefined ? ` G${wgst}` : '';
  return `${dir} ${wspd}${gust} kt`;
}
