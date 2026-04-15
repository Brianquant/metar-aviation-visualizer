import { CircleMarker, Tooltip } from 'react-leaflet';
import { FLIGHT_CATEGORY_COLORS } from '../../constants/flightCategories';
import type { MetarData } from '../../types/metar';

interface StationMarkerProps {
  station: MetarData;
  isSelected: boolean;
  onSelect: (icao: string) => void;
}

export function StationMarker({ station, isSelected, onSelect }: StationMarkerProps) {
  const color = FLIGHT_CATEGORY_COLORS[station.fltCat];

  return (
    <CircleMarker
      center={[station.lat, station.lon]}
      radius={isSelected ? 10 : 7}
      pathOptions={{
        color: isSelected ? '#ffffff' : color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: isSelected ? 3 : 1,
      }}
      eventHandlers={{
        click: () => onSelect(station.icaoId),
      }}
    >
      <Tooltip>{station.icaoId}</Tooltip>
    </CircleMarker>
  );
}
