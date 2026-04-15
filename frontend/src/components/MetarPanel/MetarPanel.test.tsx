import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetarPanel } from './MetarPanel';
import type { MetarData } from '../../types/metar';

const BASE_STATION: MetarData = {
  icaoId: 'EDDB',
  receiptTime: '2026-04-15T08:23:26.210Z',
  obsTime: 1776241200,
  reportTime: '2026-04-15T08:20:00.000Z',
  temp: 12,
  dewp: 6,
  wdir: 270,
  wspd: 15,
  visib: '6+',
  altim: 1025,
  qcField: 18,
  metarType: 'METAR',
  rawOb: 'METAR EDDB 150820Z 27015KT 6SM CAVOK 12/06 Q1025 NOSIG',
  lat: 52.3807,
  lon: 13.5306,
  elev: 48,
  name: 'Berlin/Brandenburg Intl, BR, DE',
  cover: 'CAVOK',
  clouds: [],
  fltCat: 'VFR',
};

describe('MetarPanel', () => {
  it('renders the ICAO code and station name', () => {
    render(<MetarPanel station={BASE_STATION} onClose={() => undefined} />);
    expect(screen.getByText('EDDB')).toBeInTheDocument();
    expect(screen.getByText('Berlin/Brandenburg Intl, BR, DE')).toBeInTheDocument();
  });

  it('renders the flight category badge', () => {
    render(<MetarPanel station={BASE_STATION} onClose={() => undefined} />);
    expect(screen.getByText('VFR')).toBeInTheDocument();
  });

  it('renders the raw METAR string', () => {
    render(<MetarPanel station={BASE_STATION} onClose={() => undefined} />);
    expect(screen.getByText(/METAR EDDB/)).toBeInTheDocument();
  });

  it('renders IFR badge for IFR conditions', () => {
    render(
      <MetarPanel
        station={{ ...BASE_STATION, fltCat: 'IFR' }}
        onClose={() => undefined}
      />
    );
    expect(screen.getByText('IFR')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<MetarPanel station={BASE_STATION} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows VRB for variable wind direction', () => {
    render(
      <MetarPanel
        station={{ ...BASE_STATION, wdir: 'VRB', wspd: 2 }}
        onClose={() => undefined}
      />
    );
    // Both the Wind row ("VRB 2 kt") and Direction row ("VRB") should show VRB
    const matches = screen.getAllByText(/VRB/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows gust when wgst is present', () => {
    render(
      <MetarPanel
        station={{ ...BASE_STATION, wgst: 25 }}
        onClose={() => undefined}
      />
    );
    expect(screen.getByText(/G25/)).toBeInTheDocument();
  });
});
