import { FlightCategoryBadge } from '../FlightCategoryBadge/FlightCategoryBadge';
import {
  degreesToCompass,
  formatAltimeter,
  formatCloudLayer,
  formatVisibility,
  formatWind,
} from '../../utils/formatMetar';
import type { MetarData } from '../../types/metar';

interface MetarPanelProps {
  station: MetarData;
  onClose: () => void;
}

interface RowProps {
  label: string;
  value: string | React.ReactNode;
}

function Row({ label, value }: RowProps) {
  return (
    <div className="flex justify-between gap-4 py-1 border-b border-gray-700 last:border-0">
      <span className="text-gray-400 text-sm shrink-0">{label}</span>
      <span className="text-white text-sm text-right">{value}</span>
    </div>
  );
}

export function MetarPanel({ station, onClose }: MetarPanelProps) {
  const cloudDisplay =
    station.clouds.length > 0
      ? station.clouds.map((l) => formatCloudLayer(l)).join(', ')
      : station.cover || 'CAVOK';

  return (
    <div className="absolute top-4 right-4 z-[1000] w-80 bg-gray-900 rounded-lg shadow-xl p-4 text-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold">{station.icaoId}</h2>
          <p className="text-gray-400 text-xs">{station.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <FlightCategoryBadge category={station.fltCat} />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
      </div>

      {/* Weather fields */}
      <div className="space-y-0">
        <Row label="Wind" value={formatWind(station.wdir, station.wspd, station.wgst)} />
        <Row label="Direction" value={degreesToCompass(station.wdir)} />
        <Row label="Visibility" value={formatVisibility(station.visib)} />
        <Row label="Sky" value={cloudDisplay} />
        <Row label="Temperature" value={`${station.temp}°C / ${station.dewp}°C dp`} />
        <Row label="Altimeter" value={formatAltimeter(station.altim)} />
        <Row label="Type" value={station.metarType} />
        <Row
          label="Observed"
          value={new Date(station.reportTime).toUTCString()}
        />
      </div>

      {/* Raw METAR */}
      <div className="mt-3 p-2 bg-gray-800 rounded text-xs text-gray-300 font-mono break-all">
        {station.rawOb}
      </div>
    </div>
  );
}
