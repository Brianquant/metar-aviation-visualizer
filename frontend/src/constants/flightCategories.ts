import type { FlightCategory } from '../types/metar';

export const FLIGHT_CATEGORY_COLORS: Record<FlightCategory, string> = {
  VFR: '#22c55e',
  MVFR: '#3b82f6',
  IFR: '#ef4444',
  LIFR: '#d946ef',
};

/** Ordered from most restrictive to least restrictive */
export const FLIGHT_CATEGORY_ORDER: FlightCategory[] = ['LIFR', 'IFR', 'MVFR', 'VFR'];

/**
 * Returns the most restrictive (worst) flight category from an array.
 * Falls back to 'VFR' if the array is empty.
 */
export function worstCategory(categories: FlightCategory[]): FlightCategory {
  for (const cat of FLIGHT_CATEGORY_ORDER) {
    if (categories.includes(cat)) return cat;
  }
  return 'VFR';
}
