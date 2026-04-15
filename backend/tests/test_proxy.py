import pytest
import httpx
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app, _cache

client = TestClient(app)


def setup_function():
    """Clear in-memory cache before each test."""
    _cache.clear()


def _make_mock_client(status_code: int, json_data=None, side_effect=None):
    """Helper to build a mocked httpx.AsyncClient context manager."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    if json_data is not None:
        mock_response.json.return_value = json_data

    mock_get = AsyncMock(return_value=mock_response, side_effect=side_effect)

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.get = mock_get

    return mock_client, mock_get


def test_health_returns_ok():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_metar_adds_cors_header():
    """Proxy must add Access-Control-Allow-Origin: * to all responses."""
    mock_client, _ = _make_mock_client(200, json_data=[{"icaoId": "EDDB"}])

    with patch("main.httpx.AsyncClient", return_value=mock_client):
        response = client.get("/api/metar?bbox=47,5,55,16&format=json")

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "*"


def test_metar_forwards_query_params():
    """Proxy must forward all query params to upstream."""
    mock_client, mock_get = _make_mock_client(200, json_data=[])

    with patch("main.httpx.AsyncClient", return_value=mock_client):
        client.get("/api/metar?bbox=47,5,55,16&format=json")

    call_kwargs = mock_get.call_args
    assert call_kwargs is not None
    params = call_kwargs.kwargs.get("params") or {}
    assert params.get("format") == "json"


def test_metar_returns_upstream_data():
    """Proxy must return the upstream JSON payload unchanged."""
    payload = [{"icaoId": "EDDB", "fltCat": "VFR"}]
    mock_client, _ = _make_mock_client(200, json_data=payload)

    with patch("main.httpx.AsyncClient", return_value=mock_client):
        response = client.get("/api/metar?bbox=47,5,55,16&format=json")

    assert response.json() == payload


def test_metar_propagates_upstream_error():
    """Proxy must return upstream non-200 status codes."""
    mock_client, _ = _make_mock_client(503, json_data={"error": "unavailable"})

    with patch("main.httpx.AsyncClient", return_value=mock_client):
        response = client.get("/api/metar?bbox=47,5,55,16&format=json")

    assert response.status_code == 503
    assert response.headers.get("access-control-allow-origin") == "*"


def test_metar_handles_timeout():
    """Proxy must return 504 when upstream times out."""
    mock_client, mock_get = _make_mock_client(200)
    mock_get.side_effect = httpx.TimeoutException("timed out")

    with patch("main.httpx.AsyncClient", return_value=mock_client):
        response = client.get("/api/metar?bbox=47,5,55,16&format=json")

    assert response.status_code == 504
    assert response.headers.get("access-control-allow-origin") == "*"


def test_metar_returns_empty_array_on_204():
    """Upstream 204 (no stations in bbox) must return 200 with empty array."""
    mock_client, _ = _make_mock_client(204)

    with patch("main.httpx.AsyncClient", return_value=mock_client):
        response = client.get("/api/metar?bbox=47,5,55,16&format=json")

    assert response.status_code == 200
    assert response.json() == []
    assert response.headers.get("access-control-allow-origin") == "*"


def test_metar_uses_cache_on_second_request():
    """Second identical request must be served from cache (1 upstream call)."""
    mock_client, mock_get = _make_mock_client(200, json_data=[{"icaoId": "EDDB"}])

    with patch("main.httpx.AsyncClient", return_value=mock_client):
        client.get("/api/metar?bbox=47,5,55,16&format=json")
        client.get("/api/metar?bbox=47,5,55,16&format=json")

    assert mock_get.call_count == 1
