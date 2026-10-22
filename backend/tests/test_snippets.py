"""The public snippet-sharing endpoints: create a short link, read it back, limits."""

from __future__ import annotations


def test_share_and_read_snippet(client):
    resp = client.post(
        "/api/public/snippets",
        json={"code": "print('hi')\n", "language": "python", "title": "Greeting"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert len(body["id"]) == 8 and body["id"].isalnum()
    assert body["url"].endswith(f"/s/{body['id']}")

    read = client.get(f"/api/public/snippets/{body['id']}")
    assert read.status_code == 200
    snippet = read.json()
    assert snippet["code"] == "print('hi')"  # surrounding newlines are trimmed
    assert snippet["language"] == "python"
    assert snippet["title"] == "Greeting"
    assert snippet["views"] == 1

    again = client.get(f"/api/public/snippets/{body['id']}")
    assert again.json()["views"] == 2


def test_unknown_or_malformed_id_is_404(client):
    assert client.get("/api/public/snippets/zzzzzzzz").status_code == 404
    assert client.get("/api/public/snippets/..").status_code == 404
    assert client.get("/api/public/snippets/UPPER-lower!").status_code == 404


def test_empty_code_is_rejected(client):
    resp = client.post("/api/public/snippets", json={"code": "   \n  "})
    assert resp.status_code == 400


def test_oversized_code_is_rejected(client):
    resp = client.post("/api/public/snippets", json={"code": "x" * 20_001})
    assert resp.status_code == 400
    assert "20,000" in resp.json()["detail"]


def test_language_and_title_are_capped(client):
    resp = client.post(
        "/api/public/snippets",
        json={"code": "x = 1", "language": "l" * 100, "title": "t" * 300},
    )
    assert resp.status_code == 201
    snippet = client.get(f"/api/public/snippets/{resp.json()['id']}").json()
    assert len(snippet["language"]) == 30
    assert len(snippet["title"]) == 100


def test_creation_is_rate_limited(client):
    for _ in range(10):
        assert client.post("/api/public/snippets", json={"code": "x = 1"}).status_code == 201
    assert client.post("/api/public/snippets", json={"code": "x = 1"}).status_code == 429
