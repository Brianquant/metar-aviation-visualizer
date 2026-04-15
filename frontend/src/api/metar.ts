import type { BoundingBox, MetarData } from '../types/metar';
import { isMetarArray } from '../types/metar';

// ---------------------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------------------

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

/**
 * Fetches METAR data for all stations within a bounding box.
 * Throws NetworkError, ApiError, or ParseError on failure.
 * Returns an empty array if the request was intentionally aborted.
 */
export async function fetchMetarByBbox(
  bounds: BoundingBox,
  signal: AbortSignal
): Promise<MetarData[]> {
  const { south, west, north, east } = bounds;
  const url = `/api/metar?bbox=${south},${west},${north},${east}&format=json`;

  let response: Response;

  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return [];
    }
    throw new NetworkError(`Failed to reach weather service: ${String(error)}`);
  }

  if (!response.ok) {
    throw new ApiError(
      `Weather service returned ${response.status}`,
      response.status
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new ParseError('Could not parse response from weather service');
  }

  if (!isMetarArray(raw)) {
    throw new ParseError('Unexpected response format from weather service');
  }

  return raw;
}
