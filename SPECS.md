# METAR Visualizer – Project Specification v2

## Project Overview

A web application for private pilots to visualize real-time METAR weather data on an interactive map.
Demonstrates real-time geospatial data visualization — comparable to operational situation displays
(Lagebilder) used in defense and aviation contexts.

Built with React, TypeScript, Leaflet.js and a lightweight Python proxy backend.

---

## Motivation & Context

This project serves as a portfolio piece demonstrating:

- Real-time data ingestion from an external source
- Geospatial visualization with flight-category color coding
- Clean, strictly typed frontend architecture
- Viewport-aware data loading that scales with map interaction
- A minimal backend proxy solving a real-world CORS constraint
- Docker-based deployment

---

## Tech Stack

### Frontend

- **Framework:** React 18+ with Vite
- **Language:** TypeScript (strict mode enabled)
- **Map Library:** Leaflet.js via react-leaflet
- **Marker Clustering:** leaflet.markercluster (via react-leaflet-cluster)
- **Styling:** Tailwind CSS
- **HTTP:** Native fetch API with custom wrapper
- **Testing:** Vitest + React Testing Library
- **Linting:** ESLint + Prettier

### Backend (API Proxy)

- **Language:** Python 3.11+
- **Framework:** FastAPI
- **Purpose:** Proxy requests to aviationweather.gov (which does not set CORS headers)
- **Static Files:** FastAPI serves the Vite production build directly

### Infrastructure

- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitLab CI pipeline (build, lint, test, deploy)

---

## Why a Backend Proxy?

The aviationweather.gov API does **not** return `Access-Control-Allow-Origin` headers.
Browser requests from a different origin are blocked by CORS policy. This is a confirmed
limitation — multiple independent sources document the missing CORS headers, and dedicated
CORS proxy projects exist for this API.

The proxy is intentionally minimal: it forwards requests, adds CORS headers, and optionally
caches responses (METARs update roughly every 30 minutes, so short-lived caching is safe).

This is not a workaround — it reflects how production systems handle third-party APIs that
lack browser-friendly headers.

---

## Architecture

```
project-root/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py               # FastAPI app (~50 lines), serves frontend build
│   └── tests/
│       └── test_proxy.py
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── api/
│       │   └── metar.ts              # Fetch wrapper, hits /api/metar
│       ├── components/
│       │   ├── Map/
│       │   │   ├── MapView.tsx       # Root map component
│       │   │   ├── StationMarker.tsx
│       │   │   ├── ClusterGroup.tsx  # Marker clustering layer
│       │   │   └── MapView.test.tsx
│       │   ├── MetarPanel/
│       │   │   ├── MetarPanel.tsx    # Decoded METAR display
│       │   │   └── MetarPanel.test.tsx
│       │   └── FlightCategoryBadge/
│       │       └── FlightCategoryBadge.tsx
│       ├── hooks/
│       │   ├── useMetar.ts           # Viewport-aware data fetching
│       │   ├── useMapBounds.ts       # Tracks current map bounding box
│       │   └── useMetar.test.ts
│       ├── types/
│       │   └── metar.ts              # All TypeScript interfaces
│       ├── utils/
│       │   ├── formatMetar.ts        # Display formatting helpers
│       │   └── formatMetar.test.ts
│       └── constants/
│           └── flightCategories.ts
```

---

## Core Features

### 1. Interactive Map (MapView)

- Display weather stations as color-coded markers on a Leaflet map
- Marker color reflects flight category: VFR (green), MVFR (blue), IFR (red), LIFR (magenta)
- Click on marker opens MetarPanel with decoded METAR data
- Default view centered on Germany/Central Europe (~lat 51, lon 10, zoom 6)
- Tile provider: OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)

### 2. Marker Clustering (ClusterGroup)

- Uses leaflet.markercluster to group dense markers at low zoom levels
- Cluster color reflects the worst flight category within the cluster
- Clusters break apart into individual markers on zoom-in
- Rationale: A bounding box covering Germany returns 200–400+ stations;
  rendering all as individual markers causes performance issues in Leaflet

### 3. Station Markers (StationMarker)

- Color-coded circle markers by flight category
- Tooltip shows ICAO code on hover
- Selected state visually distinct (enlarged, highlighted border)

### 4. METAR Panel (MetarPanel)

- Displays structured API fields in a human-readable layout (no raw METAR parsing needed):
  - Station name and ICAO code
  - Wind direction & speed (with gust if present, handle `"VRB"` case)
  - Visibility
  - Sky cover and cloud layers (coverage + altitude)
  - Temperature & dewpoint
  - QNH / altimeter setting
  - Flight category badge
- Shows raw METAR string (`rawOb`) for reference
- Timestamps (`reportTime`) shown in UTC

### 5. Viewport-Aware Data Fetching (useMetar + useMapBounds)

- `useMapBounds` listens to Leaflet `moveend` events and exposes the current bounding box
- `useMetar` fetches METARs for the current bounding box via the proxy
- Debounced: waits 300ms after map movement stops before fetching
- Auto-refresh every 5 minutes — only for the current viewport
- Aborts in-flight requests on unmount or when a new request supersedes (AbortController)
- Handles loading, error and empty states explicitly

**Why viewport-only:** Refreshing all previously loaded stations does not scale and contradicts
how operational systems work. A situation display shows what is currently in view. Stations
outside the viewport are discarded from state when the user pans away.

---

## Backend Proxy Specification

### Endpoints

| Route | Upstream | Description |
|---|---|---|
| `GET /api/metar` | `aviationweather.gov/api/data/metar` | Forwards query params, adds CORS headers |
| `GET /api/health` | — | Returns `{ "status": "ok" }` for monitoring |

### Behavior

- Forwards all query parameters unchanged to upstream
- Adds `Access-Control-Allow-Origin: *` to responses
- Returns upstream status codes transparently
- Optional: Short-lived in-memory cache (TTL 60s) keyed by query string
- Sets a custom `User-Agent` header per aviationweather.gov recommendation
- Timeout: 10s for upstream requests

### Example

```
Frontend request:
  GET /api/metar?bbox=47,5,55,16&format=json

Proxy forwards to:
  GET https://aviationweather.gov/api/data/metar?bbox=47,5,55,16&format=json
  User-Agent: metar-visualizer/1.0

Proxy returns:
  200 OK
  Access-Control-Allow-Origin: *
  Content-Type: application/json
  [METAR data array]
```

---

## Coding Standards

### TypeScript

- `strict: true` in tsconfig — no exceptions
- No `any` types — ever
- All API responses must be typed with interfaces, not inferred
- Use `unknown` for untyped external data, narrow explicitly

```typescript
// WRONG
const data: any = await fetchMetar(icao);

// CORRECT
const data: unknown = await fetchMetar(icao);
if (!isMetarResponse(data)) throw new Error('Invalid METAR response');
```

### Error Handling

- Every fetch call must handle network errors, non-2xx responses and malformed data separately
- Never silently swallow errors
- User-facing error messages must be friendly, log technical details to console

```typescript
async function fetchMetar(bbox: BoundingBox): Promise<MetarData[]> {
  let response: Response;

  try {
    response = await fetch(
      `/api/metar?bbox=${bbox.south},${bbox.west},${bbox.north},${bbox.east}&format=json`,
      { signal }
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return []; // Request was intentionally cancelled
    }
    throw new NetworkError(`Failed to reach weather service: ${String(error)}`);
  }

  if (!response.ok) {
    throw new ApiError(`Weather service returned ${response.status}`);
  }

  const raw: unknown = await response.json();

  if (!isMetarArray(raw)) {
    throw new ParseError('Unexpected response format from weather service');
  }

  return raw;
}
```

### React Components

- Functional components only
- Props must be explicitly typed with an interface, never inline
- No prop drilling beyond 2 levels — use context or composition
- Side effects only inside useEffect or custom hooks
- Components must be pure — no direct DOM manipulation

```typescript
interface StationMarkerProps {
  station: MetarData;
  isSelected: boolean;
  onSelect: (icao: string) => void;
}

export function StationMarker({ station, isSelected, onSelect }: StationMarkerProps) { ... }
```

### Custom Hooks

- Single responsibility — one hook does one thing
- Always return loading, error and data states
- Clean up side effects on unmount

```typescript
interface UseMetarResult {
  data: MetarData[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMetar(bounds: BoundingBox | null): UseMetarResult { ... }
```

### Utility Functions

- Pure functions only — no side effects
- Each function does exactly one thing
- All edge cases documented with JSDoc

```typescript
/**
 * Converts raw wind direction degrees to compass notation.
 * Returns 'VRB' for variable winds (coded as 0 in METAR).
 * Returns 'N/A' if direction is undefined or out of range.
 */
export function degreesToCompass(degrees: number | undefined): string { ... }
```

### Testing Requirements

- Unit tests for all utility functions (formatMetar helpers, flightCategory logic)
- Unit tests for useMetar hook — mock fetch, test all states
- Component tests for MetarPanel — verify correct rendering per flight category
- Backend: test proxy forwards correctly, returns CORS headers, handles upstream errors
- Aim for meaningful coverage, not 100% line coverage

---

## API Reference (Upstream)

**Base URL (via proxy):** `/api/metar`

| Parameters | Example | Description |
|---|---|---|
| `ids` + `format` | `?ids=EDDK&format=json` | Fetch METAR by ICAO code |
| `bbox` + `format` | `?bbox=47,5,55,16&format=json` | Fetch METARs by bounding box (south,west,north,east) |

**Response fields to type (verified against live API, April 2026):**

| Field | Type | Description |
|---|---|---|
| `icaoId` | string | ICAO station identifier |
| `receiptTime` | string | ISO 8601 timestamp when server received the report |
| `obsTime` | number | Observation timestamp (Unix epoch seconds) |
| `reportTime` | string | ISO 8601 timestamp of the report |
| `temp` | number | Temperature (°C) |
| `dewp` | number | Dewpoint (°C) |
| `wdir` | number \| string | Wind direction (degrees) — **can be `"VRB"` for variable winds** |
| `wspd` | number | Wind speed (knots) |
| `wgst`? | number | Wind gust (knots) — **optional, field absent when no gust** |
| `visib` | string | Visibility (statute miles, e.g. `"6+"`) |
| `altim` | number | Altimeter setting (hPa) |
| `fltCat` | string | Flight category: VFR / MVFR / IFR / LIFR (camelCase!) |
| `rawOb` | string | Raw METAR string |
| `lat` | number | Station latitude |
| `lon` | number | Station longitude |
| `elev` | number | Station elevation (meters) |
| `name` | string | Station name and location |
| `cover` | string | Sky cover summary (e.g. `"CAVOK"`, `"BKN"`) |
| `clouds` | array | Cloud layers — empty array `[]` for CAVOK/CLR |
| `metarType` | string | Report type: `"METAR"` or `"SPECI"` |
| `qcField` | number | Quality control flags (bitmask) |

**Critical typing notes:**
- `wdir` is a **union type** (`number | string`): numeric degrees for normal winds, `"VRB"` for variable
- `wgst` is **optional**: the field is entirely absent (not `null`) when there is no gust
- `fltCat` is **camelCase**, not lowercase — TypeScript interface must match exactly

**Verified sample response (EDDB, April 2026):**
```json
{
  "icaoId": "EDDB",
  "receiptTime": "2026-04-15T08:23:26.210Z",
  "obsTime": 1776241200,
  "reportTime": "2026-04-15T08:20:00.000Z",
  "temp": 12,
  "dewp": 6,
  "wdir": "VRB",
  "wspd": 2,
  "visib": "6+",
  "altim": 1025,
  "qcField": 18,
  "metarType": "METAR",
  "rawOb": "METAR EDDB 150820Z AUTO VRB02KT CAVOK 12/06 Q1025 NOSIG",
  "lat": 52.3807,
  "lon": 13.5306,
  "elev": 48,
  "name": "Berlin/Brandenburg Intl, BR, DE",
  "cover": "CAVOK",
  "clouds": [],
  "fltCat": "VFR"
}
```

---

## Deployment (Docker Compose)

```yaml
services:
  app:
    build: .
    ports:
      - "8080:8000"
    environment:
      - UPSTREAM_BASE_URL=https://aviationweather.gov/api/data
      - CACHE_TTL_SECONDS=60
```

In production, a single container runs FastAPI which handles both API proxy routes (`/api/*`)
and serves the Vite production build as static files. During development, Vite's dev server
proxies `/api` requests to FastAPI via `vite.config.ts`:

```typescript
// vite.config.ts (dev only)
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
});
```

---

## What This Project Demonstrates

- **Geospatial real-time visualization** — color-coded situation display on an interactive map
- **Strict TypeScript** with explicit type narrowing and custom error classes
- **Viewport-aware data strategy** — load what you see, discard what you don't
- **Performance-conscious rendering** — marker clustering for high-density areas
- **Full-stack capability** — React frontend + Python API backend
- **Containerized deployment** — Docker Compose, single-container production build
- **Tested logic** — utility functions, hooks, components and backend proxy
- **Real-world API integration** — including solving the CORS constraint cleanly