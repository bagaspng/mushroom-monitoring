"""
test_auth.py — Test security and authentication on POST /api/control
"""

import pytest
from unittest.mock import patch


@pytest.mark.asyncio
async def test_control_unauthorized_missing_key(client):
    """Test POST /api/control rejects request with 401 when key is missing."""
    response = await client.post("/api/control", json={"mode": "MANUAL", "pump": True})
    assert response.status_code == 401
    assert "Unauthorized" in response.json()["detail"]


@pytest.mark.asyncio
async def test_control_unauthorized_invalid_key(client):
    """Test POST /api/control rejects request with 401 when key is wrong."""
    response = await client.post(
        "/api/control",
        headers={"X-API-Key": "wrong-invalid-key"},
        json={"mode": "MANUAL", "pump": True},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_control_authorized_via_x_api_key(client):
    """Test POST /api/control succeeds when valid X-API-Key header is provided."""
    with patch("app.api.routes.publish_control_command", return_value=True) as mock_pub:
        response = await client.post(
            "/api/control",
            headers={"X-API-Key": "test-secret-control-key-12345"},
            json={"mode": "MANUAL", "pump": True},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["command"] == {"mode": "MANUAL", "pump": True}
        mock_pub.assert_called_once_with("rumah-jamur-01", {"mode": "MANUAL", "pump": True})


@pytest.mark.asyncio
async def test_control_authorized_via_bearer_token(client):
    """Test POST /api/control succeeds when valid Bearer token is provided."""
    with patch("app.api.routes.publish_control_command", return_value=True) as mock_pub:
        response = await client.post(
            "/api/control",
            headers={"Authorization": "Bearer test-secret-control-key-12345"},
            json={"mode": "AUTO"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["mode"] == "AUTO"
        mock_pub.assert_called_once_with("rumah-jamur-01", {"mode": "AUTO"})
