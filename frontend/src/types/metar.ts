export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';

export interface CloudLayer {
  cover: string;
  base: number;
}

export interface MetarData {
  icaoId: string;
  receiptTime: string;
  obsTime: number;
  reportTime: string;
  temp: number;
  dewp: number;
  /** Numeric degrees, or "VRB" for variable winds */
  wdir: number | 'VRB';
  wspd: number;
  /** Absent from the response entirely when there is no gust */
  wgst?: number;
  visib: string;
  altim: number;
  fltCat: FlightCategory;
  rawOb: string;
  lat: number;
  lon: number;
  elev: number;
  name: string;
  cover: string;
  clouds: CloudLayer[];
  metarType: 'METAR' | 'SPECI';
  qcField: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

// ---------------------------------------------------------------------------
// Runtime type guards
// ---------------------------------------------------------------------------

function isCloudLayer(value: unknown): value is CloudLayer {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.cover === 'string' && typeof v.base === 'number';
}

function isMetarData(value: unknown): value is MetarData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.icaoId === 'string' &&
    typeof v.lat === 'number' &&
    typeof v.lon === 'number' &&
    (typeof v.wdir === 'number' || v.wdir === 'VRB') &&
    typeof v.wspd === 'number' &&
    typeof v.fltCat === 'string' &&
    Array.isArray(v.clouds) &&
    (v.clouds as unknown[]).every(isCloudLayer)
  );
}

export function isMetarArray(value: unknown): value is MetarData[] {
  return Array.isArray(value) && value.every(isMetarData);
}
