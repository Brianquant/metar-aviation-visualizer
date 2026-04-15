import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import type { BoundingBox } from '../types/metar';

function toBoundingBox(map: ReturnType<typeof useMap>): BoundingBox {
  const b = map.getBounds();
  return {
    north: b.getNorth(),
    south: b.getSouth(),
    east: b.getEast(),
    west: b.getWest(),
  };
}

/**
 * Listens to the parent Leaflet map's `moveend` event and returns the
 * current bounding box. Must be rendered inside a <MapContainer>.
 */
export function useMapBounds(): BoundingBox | null {
  const map = useMap();
  const [bounds, setBounds] = useState<BoundingBox | null>(() =>
    map.getContainer() ? toBoundingBox(map) : null
  );

  useEffect(() => {
    const onMoveEnd = () => setBounds(toBoundingBox(map));
    map.on('moveend', onMoveEnd);
    // Capture initial bounds when component mounts
    setBounds(toBoundingBox(map));
    return () => {
      map.off('moveend', onMoveEnd);
    };
  }, [map]);

  return bounds;
}
