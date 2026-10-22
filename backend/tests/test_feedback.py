from __future__ import annotations

from fastapi.testclient import TestClient

from doaide_code.main import create_app


def test_feedback_is_stored_rate_limited_and_validated(settings, executors):
    with TestClient(create_app(settings, executors=executors)) as c:
        ok = c.post("/api/public/feedback", json={"tool": "code-review", "helpful": True, "comment": "nice"})
        assert ok.status_code == 201 and ok.json() == {"ok": True}
        # Comments are trimmed and capped; the tool slug must look like one.
        assert c.post("/api/public/feedback", json={"tool": "diff-checker", "helpful": False, "comment": " x" * 600}).status_code == 201
        assert c.post("/api/public/feedback", json={"tool": "No Such Tool!", "helpful": True}).status_code == 400
        assert c.post("/api/public/feedback", json={"tool": "../etc", "helpful": True}).status_code == 400
        codes = [
            c.post(
                "/api/public/feedback",
                json={"tool": "explain-code", "helpful": True},
                headers={"X-Forwarded-For": "9.9.9.9"},
            ).status_code
            for _ in range(6)
        ]
        assert codes[:5] == [201] * 5 and codes[5] == 429


def test_feedback_lands_in_the_store(settings, executors):
    app = create_app(settings, executors=executors)
    with TestClient(app) as c:
        c.post("/api/public/feedback", json={"tool": "regex-tester", "helpful": False, "comment": "missed a case"})
        rows = app.state.store.list_tool_feedback()
        assert rows and rows[0]["tool"] == "regex-tester" and rows[0]["helpful"] == 0
        assert rows[0]["comment"] == "missed a case"
