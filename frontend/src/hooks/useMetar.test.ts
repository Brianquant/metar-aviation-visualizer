import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMetar } from './useMetar';
import type { BoundingBox } from '../types/metar';
import { ApiError } from '../api/metar';

const BOUNDS: BoundingBox = { north: 55, south: 47, east: 16, west: 5 };

const MOCK_STATION = {
  icaoId: 'EDDB',
  receiptTime: '2026-04-15T08:23:26.210Z',
  obsTime: 1776241200,
  reportTime: '2026-04-15T08:20:00.000Z',
  temp: 12,
  dewp: 6,
  wdir: 'VRB' as const,
  wspd: 2,
  visib: '6+',
  altim: 1025,
  qcField: 18,
  metarType: 'METAR' as const,
  rawOb: 'METAR EDDB 150820Z AUTO VRB02KT CAVOK 12/06 Q1025 NOSIG',
  lat: 52.3807,
  lon: 13.5306,
  elev: 48,
  name: 'Berlin/Brandenburg Intl, BR, DE',
  cover: 'CAVOK',
  clouds: [],
  fltCat: 'VFR' as const,
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useMetar', () => {
  it('starts with isLoading false and no data', () => {
    const { result } = renderHook(() => useMetar(null));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetches data after debounce when bounds are provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([MOCK_STATION]), { status: 200 })
    );

    const { result } = renderHook(() => useMetar(BOUNDS));

    // Advance past the 300ms debounce
    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.isLoading).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/api/metar');
  });

  it('sets error state when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useMetar(BOUNDS));

    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('sets error state on non-2xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 503 })
    );

    const { result } = renderHook(() => useMetar(BOUNDS));

    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('uses backend error envelope for api errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'upstream_timeout',
          message: 'Upstream weather service timed out',
        }),
        {
          status: 504,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const { result } = renderHook(() => useMetar(BOUNDS));
    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(ApiError);
    });

    const err = result.current.error as ApiError;
    expect(err.status).toBe(504);
    expect(err.code).toBe('upstream_timeout');
    expect(err.message).toBe('Upstream weather service timed out');
  });

  it('does not fetch when bounds is null', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderHook(() => useMetar(null));

    await vi.advanceTimersByTimeAsync(1000);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
