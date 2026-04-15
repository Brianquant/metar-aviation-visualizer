import MarkerClusterGroup from 'react-leaflet-cluster';
import type { ReactNode } from 'react';
import L from 'leaflet';
import { FLIGHT_CATEGORY_COLORS, worstCategory } from '../../constants/flightCategories';
import type { FlightCategory, MetarData } from '../../types/metar';

interface ClusterGroupProps {
  stations: MetarData[];
  children: ReactNode;
}

function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const markers = cluster.getAllChildMarkers();

  // Extract flight categories stored on each marker's options
  const categories: FlightCategory[] = markers
    .map((m) => (m.options as { flightCategory?: FlightCategory }).flightCategory)
    .filter((c): c is FlightCategory => c !== undefined);

  const category = worstCategory(categories);
  const color = FLIGHT_CATEGORY_COLORS[category];
  const count = cluster.getChildCount();

  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 13px;
      border: 2px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    ">${count}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export function ClusterGroup({ children }: ClusterGroupProps) {
  return (
    <MarkerClusterGroup iconCreateFunction={createClusterIcon} chunkedLoading>
      {children}
    </MarkerClusterGroup>
  );
}
