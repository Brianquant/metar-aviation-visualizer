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
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

interface BackendErrorEnvelope {
  code?: string;
  message?: string;
}

function isBackendErrorEnvelope(value: unknown): value is BackendErrorEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (typeof v.code === 'string' || v.code === undefined) &&
    (typeof v.message === 'string' || v.message === undefined)
  );
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
    let backendMessage: string | undefined;
    let backendCode: string | undefined;

    try {
      const errorBody: unknown = await response.json();
      if (isBackendErrorEnvelope(errorBody)) {
        backendMessage = errorBody.message;
        backendCode = errorBody.code;
      }
    } catch {
      // Keep fallback error message if body is not JSON.
    }

    throw new ApiError(
      backendMessage ?? `Weather service returned ${response.status}`,
      response.status,
      backendCode
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
