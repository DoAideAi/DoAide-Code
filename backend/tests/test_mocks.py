"""The API response mocker: creating a mock API, serving its endpoints, limits."""

from __future__ import annotations

import pytest

from doaide_code import mocks


def _create(client, endpoints, name="Demo"):
    return client.post("/api/public/mocks", json={"name": name, "endpoints": endpoints})


def test_create_read_and_serve_mock(client):
    resp = _create(
        client,
        [
            {"method": "GET", "path": "/users", "body": '[{"id": 1}]'},
            {"method": "GET", "path": "users/:id", "body": '{"id": "{{id}}"}'},
            {"method": "POST", "path": "/users", "status": 201, "body": '{"ok": true}'},
            {"method": "GET", "path": "/users/me", "body": '{"me": true}'},
        ],
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["url"].endswith(f"/api/mock/{body['id']}")

    base = f"/api/mock/{body['id']}"
    users = client.get(f"{base}/users")
    assert users.status_code == 200 and users.json() == [{"id": 1}]
    assert users.headers["access-control-allow-origin"] == "*"
    assert users.headers["content-type"].startswith("application/json")
    assert client.get(f"{base}/users/42").json() == {"id": "42"}
    assert client.get(f"{base}/users/me").json() == {"me": True}  # literal beats :param
    assert client.post(f"{base}/users").status_code == 201
    assert client.delete(f"{base}/users").status_code == 405
    missing = client.get(f"{base}/nope")
    assert missing.status_code == 404 and "No endpoint" in missing.json()["error"]

    preflight = client.options(f"{base}/users")
    assert preflight.status_code == 204
    assert "POST" in preflight.headers["access-control-allow-methods"]

    stored = client.get(f"/api/public/mocks/{body['id']}").json()
    assert stored["name"] == "Demo"
    assert stored["endpoints"][1]["path"] == "/users/:id"
    assert stored["hits"] == 6  # every served request counts, misses included; preflights do not


def test_any_method_and_root_path(client):
    mock_id = _create(client, [{"method": "ANY", "path": "/", "status": 204}]).json()["id"]
    resp = client.put(f"/api/mock/{mock_id}")
    assert resp.status_code == 204 and resp.content == b""


def test_unknown_mock_is_404(client):
    assert client.get("/api/mock/zzzzzzzz/users").status_code == 404
    assert client.get("/api/public/mocks/zzzzzzzz").status_code == 404


@pytest.mark.parametrize(
    "endpoint, message",
    [
        ({"method": "TRACE", "path": "/a"}, "unknown method"),
        ({"path": "/a b"}, "paths may use"),
        ({"path": "/a", "status": 99}, "status must be"),
        ({"path": "/a", "delay_ms": 9999}, "delay must be"),
        ({"path": "/a", "content_type": "not a type"}, "not a content type"),
        ({"path": "/a", "body": "x" * 50_001}, "the limit is"),
    ],
)
def test_bad_endpoints_are_rejected(client, endpoint, message):
    resp = _create(client, [endpoint])
    assert resp.status_code == 400 and message in resp.json()["detail"]


def test_empty_duplicate_and_too_many_rejected(client):
    assert _create(client, []).status_code == 400
    assert "twice" in _create(client, [{"path": "/a"}, {"path": "a/"}]).json()["detail"]
    assert _create(client, [{"path": f"/e{i}"} for i in range(21)]).status_code == 400


def test_creation_is_rate_limited(client):
    for _ in range(10):
        assert _create(client, [{"path": "/a"}]).status_code == 201
    assert _create(client, [{"path": "/a"}]).status_code == 429


def test_render_body_keeps_unknown_placeholders():
    assert mocks.render_body('{"a": "{{ id }}", "b": "{{other}}"}', {"id": "7"}) == '{"a": "7", "b": "{{other}}"}'
