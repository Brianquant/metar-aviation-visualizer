import { FLIGHT_CATEGORY_COLORS } from '../../constants/flightCategories';
import type { FlightCategory } from '../../types/metar';

interface FlightCategoryBadgeProps {
  category: FlightCategory;
}

export function FlightCategoryBadge({ category }: FlightCategoryBadgeProps) {
  const color = FLIGHT_CATEGORY_COLORS[category];
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {category}
    </span>
  );
}
