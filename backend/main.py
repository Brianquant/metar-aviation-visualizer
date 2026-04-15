import os
import time
from typing import Any

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

UPSTREAM_BASE_URL = os.getenv(
    "UPSTREAM_BASE_URL", "https://aviationweather.gov/api/data"
)
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "60"))
REQUEST_TIMEOUT = 10.0
USER_AGENT = "metar-visualizer/1.0"
ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
}

app = FastAPI(title="METAR Proxy")

# Simple in-memory cache: { query_string -> (timestamp, data) }
_cache: dict[str, tuple[float, Any]] = {}


def _cors_headers(request: Request) -> dict[str, str]:
    origin = request.headers.get("origin")
    if origin and origin in ALLOWED_ORIGINS:
        return {
            "Access-Control-Allow-Origin": origin,
            "Vary": "Origin",
        }
    return {}


def _error_response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"code": code, "message": message},
        headers=_cors_headers(request),
    )


def _is_valid_bbox(bbox: str) -> bool:
    parts = [part.strip() for part in bbox.split(",")]
    if len(parts) != 4:
        return False

    try:
        south, west, north, east = (float(value) for value in parts)
    except ValueError:
        return False

    if not (-90 <= south <= 90 and -90 <= north <= 90):
        return False
    if not (-180 <= west <= 180 and -180 <= east <= 180):
        return False
    if south >= north or west >= east:
        return False
    return True


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/metar")
async def metar(request: Request) -> Response:
    bbox = request.query_params.get("bbox")
    if bbox is None or not _is_valid_bbox(bbox):
        return _error_response(
            request=request,
            status_code=400,
            code="invalid_bbox",
            message=(
                "bbox must contain south,west,north,east with valid latitude/"
                "longitude ranges"
            ),
        )

    qs = str(request.query_params)

    # Check cache
    if qs in _cache:
        cached_at, cached_data = _cache[qs]
        if time.time() - cached_at < CACHE_TTL_SECONDS:
            return JSONResponse(
                content=cached_data,
                headers=_cors_headers(request),
            )

    upstream_url = f"{UPSTREAM_BASE_URL}/metar"

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        try:
            upstream_response = await client.get(
                upstream_url,
                params=dict(request.query_params),
                headers={"User-Agent": USER_AGENT},
            )
        except httpx.TimeoutException:
            return _error_response(
                request=request,
                status_code=504,
                code="upstream_timeout",
                message="Upstream weather service timed out",
            )
        except httpx.RequestError as exc:
            return _error_response(
                request=request,
                status_code=502,
                code="upstream_unreachable",
                message=f"Could not reach upstream: {exc}",
            )

    # 204 No Content = no stations in this bounding box, treat as empty result
    if upstream_response.status_code == 204:
        return JSONResponse(
            content=[],
            headers=_cors_headers(request),
        )

    if upstream_response.status_code != 200:
        return _error_response(
            request=request,
            status_code=upstream_response.status_code,
            code="upstream_error",
            message="Upstream weather service error",
        )

    data = upstream_response.json()
    _cache[qs] = (time.time(), data)

    return JSONResponse(
        content=data,
        headers=_cors_headers(request),
    )


# Serve Vite production build (only present in Docker / prod)
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
