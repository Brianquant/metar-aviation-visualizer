import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMetarByBbox } from '../api/metar';
import type { BoundingBox, MetarData } from '../types/metar';

const DEBOUNCE_MS = 300;
const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

export interface UseMetarResult {
  data: MetarData[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetches METAR data for the given bounding box.
 * - Debounces 300ms after bounds change before fetching.
 * - Auto-refreshes every 5 minutes.
 * - Cancels in-flight requests when bounds change or component unmounts.
 */
export function useMetar(bounds: BoundingBox | null): UseMetarResult {
  const [data, setData] = useState<MetarData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Stable ref to the current AbortController so we can cancel on re-fetch
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    (currentBounds: BoundingBox) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      fetchMetarByBbox(currentBounds, controller.signal)
        .then((stations) => {
          if (!controller.signal.aborted) {
            setData(stations);
            setIsLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (!controller.signal.aborted) {
            setError(err instanceof Error ? err : new Error(String(err)));
            setIsLoading(false);
          }
        });
    },
    []
  );

  // Debounce on bounds changes
  useEffect(() => {
    if (!bounds) return;

    const timer = setTimeout(() => fetchData(bounds), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [bounds, fetchData]);

  // Auto-refresh every 5 minutes using the latest bounds
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  useEffect(() => {
    const interval = setInterval(() => {
      if (boundsRef.current) {
        fetchData(boundsRef.current);
      }
    }, AUTO_REFRESH_MS);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const refetch = useCallback(() => {
    if (boundsRef.current) fetchData(boundsRef.current);
  }, [fetchData]);

  return { data, isLoading, error, refetch };
}
