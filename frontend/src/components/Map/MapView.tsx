import { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { ClusterGroup } from './ClusterGroup';
import { StationMarker } from './StationMarker';
import { MetarPanel } from '../MetarPanel/MetarPanel';
import { useMapBounds } from '../../hooks/useMapBounds';
import { useMetar } from '../../hooks/useMetar';
import type { MetarData } from '../../types/metar';
import { ApiError, NetworkError, ParseError } from '../../api/metar';

const DEFAULT_CENTER: [number, number] = [51, 10];
const DEFAULT_ZOOM = 6;

function getMapErrorMessage(error: Error): string {
  if (error instanceof ApiError) {
    if (error.code === 'invalid_bbox') {
      return 'Invalid map viewport request';
    }
    if (error.status >= 500) {
      return `Weather service unavailable (${error.status})`;
    }
    return error.message;
  }

  if (error instanceof NetworkError) {
    return 'Network issue while loading weather data';
  }

  if (error instanceof ParseError) {
    return 'Received unexpected weather data format';
  }

  return 'Failed to load weather data';
}

// Inner component rendered inside MapContainer so hooks can access the map context
function MapInner() {
  const bounds = useMapBounds();
  const { data: stations, isLoading, error } = useMetar(bounds);
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);

  const selectedStation: MetarData | undefined = stations?.find(
    (s) => s.icaoId === selectedIcao
  );

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {stations && (
        <ClusterGroup stations={stations}>
          {stations.map((station) => (
            <StationMarker
              key={station.icaoId}
              station={station}
              isSelected={station.icaoId === selectedIcao}
              onSelect={setSelectedIcao}
            />
          ))}
        </ClusterGroup>
      )}

      {/* Status indicators */}
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-gray-900/80 text-white text-sm px-3 py-1 rounded-full">
          Loading weather data…
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-900/80 text-white text-sm px-3 py-1 rounded-full">
          {getMapErrorMessage(error)}
        </div>
      )}

      {selectedStation && (
        <MetarPanel
          station={selectedStation}
          onClose={() => setSelectedIcao(null)}
        />
      )}
    </>
  );
}

export function MapView() {
  return (
    <div className="h-screen w-screen relative">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
      >
        <MapInner />
      </MapContainer>
    </div>
  );
}
