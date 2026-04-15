import { describe, it, expect } from 'vitest';
import {
  degreesToCompass,
  formatAltimeter,
  formatCloudLayer,
  formatVisibility,
  formatWind,
} from './formatMetar';

describe('degreesToCompass', () => {
  it('returns VRB for variable winds', () => {
    expect(degreesToCompass('VRB')).toBe('VRB');
  });

  it('returns N for 0 degrees', () => {
    expect(degreesToCompass(0)).toBe('N');
  });

  it('returns N for 360 degrees', () => {
    expect(degreesToCompass(360)).toBe('N');
  });

  it('returns E for 90 degrees', () => {
    expect(degreesToCompass(90)).toBe('E');
  });

  it('returns S for 180 degrees', () => {
    expect(degreesToCompass(180)).toBe('S');
  });

  it('returns W for 270 degrees', () => {
    expect(degreesToCompass(270)).toBe('W');
  });

  it('returns N/A for undefined', () => {
    expect(degreesToCompass(undefined)).toBe('N/A');
  });

  it('returns N/A for out-of-range negative', () => {
    expect(degreesToCompass(-1)).toBe('N/A');
  });
});

describe('formatVisibility', () => {
  it('appends SM unit', () => {
    expect(formatVisibility('6+')).toBe('6+ SM');
    expect(formatVisibility('10')).toBe('10 SM');
  });

  it('returns N/A for empty string', () => {
    expect(formatVisibility('')).toBe('N/A');
  });
});

describe('formatAltimeter', () => {
  it('appends hPa unit', () => {
    expect(formatAltimeter(1025)).toBe('1025 hPa');
    expect(formatAltimeter(1013)).toBe('1013 hPa');
  });
});

describe('formatCloudLayer', () => {
  it('formats cover and base altitude', () => {
    expect(formatCloudLayer({ cover: 'BKN', base: 3000 })).toBe('BKN 3,000 ft');
  });

  it('handles SCT layers', () => {
    expect(formatCloudLayer({ cover: 'SCT', base: 1500 })).toBe('SCT 1,500 ft');
  });
});

describe('formatWind', () => {
  it('formats normal wind without gust', () => {
    expect(formatWind(270, 15, undefined)).toBe('W 15 kt');
  });

  it('formats wind with gust', () => {
    expect(formatWind(270, 15, 25)).toBe('W 15 G25 kt');
  });

  it('formats variable wind', () => {
    expect(formatWind('VRB', 3, undefined)).toBe('VRB 3 kt');
  });
});
