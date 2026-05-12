"""Regression tests for FastAPI platform endpoints routed via public BASE_URL."""

import uuid

import pytest
import requests
from dotenv import dotenv_values


@pytest.fixture(scope="session")
def base_url() -> str:
    """Load public app URL from frontend/.env and append /api."""
    env = dotenv_values("/app/frontend/.env")
    raw = env.get("REACT_APP_BACKEND_URL")
    if not raw:
        pytest.fail("REACT_APP_BACKEND_URL missing in /app/frontend/.env")
    return f"{str(raw).rstrip('/')}/api"


@pytest.fixture(scope="session")
def api_client() -> requests.Session:
    """Shared HTTP client for API calls."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# Core health/root endpoint checks
def test_api_root_returns_message(api_client: requests.Session, base_url: str):
    response = api_client.get(f"{base_url}/", timeout=25)
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Hello World"


# Status create/list persistence checks
def test_create_status_and_verify_persistence(api_client: requests.Session, base_url: str):
    marker = f"TEST_platform_{uuid.uuid4().hex[:8]}"
    create_response = api_client.post(
        f"{base_url}/status",
        json={"client_name": marker},
        timeout=25,
    )
    assert create_response.status_code == 200
    created = create_response.json()
    assert isinstance(created["id"], str)
    assert created["client_name"] == marker
    assert isinstance(created["timestamp"], str)

    list_response = api_client.get(f"{base_url}/status", timeout=25)
    assert list_response.status_code == 200
    rows = list_response.json()
    assert isinstance(rows, list)

    matching = [row for row in rows if row.get("id") == created["id"]]
    assert matching, "Created status row was not found in follow-up GET /status"
    assert matching[0]["client_name"] == marker
