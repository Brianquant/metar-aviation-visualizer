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

app = FastAPI(title="METAR Proxy")

# Simple in-memory cache: { query_string -> (timestamp, data) }
_cache: dict[str, tuple[float, Any]] = {}


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/metar")
async def metar(request: Request) -> Response:
    qs = str(request.query_params)

    # Check cache
    if qs in _cache:
        cached_at, cached_data = _cache[qs]
        if time.time() - cached_at < CACHE_TTL_SECONDS:
            return JSONResponse(
                content=cached_data,
                headers={"Access-Control-Allow-Origin": "*"},
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
            return JSONResponse(
                status_code=504,
                content={"detail": "Upstream weather service timed out"},
                headers={"Access-Control-Allow-Origin": "*"},
            )
        except httpx.RequestError as exc:
            return JSONResponse(
                status_code=502,
                content={"detail": f"Could not reach upstream: {exc}"},
                headers={"Access-Control-Allow-Origin": "*"},
            )

    # 204 No Content = no stations in this bounding box, treat as empty result
    if upstream_response.status_code == 204:
        return JSONResponse(
            content=[],
            headers={"Access-Control-Allow-Origin": "*"},
        )

    if upstream_response.status_code != 200:
        return JSONResponse(
            status_code=upstream_response.status_code,
            content={"detail": "Upstream weather service error"},
            headers={"Access-Control-Allow-Origin": "*"},
        )

    data = upstream_response.json()
    _cache[qs] = (time.time(), data)

    return JSONResponse(
        content=data,
        headers={"Access-Control-Allow-Origin": "*"},
    )


# Serve Vite production build (only present in Docker / prod)
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
