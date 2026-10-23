"""The API response mocker: validate a list of mock endpoints and match a request against them.

A mock is a list of endpoints, each a method, a path pattern (``/users/:id``), a status code,
a body and an optional delay. ``:name`` segments capture that part of the request path, and
``{{name}}`` in the body is replaced with the captured value.
"""

from __future__ import annotations

import re
from typing import Any

METHODS = ("ANY", "GET", "POST", "PUT", "PATCH", "DELETE")
MAX_ENDPOINTS = 20
MAX_BODY_CHARS = 50_000
MAX_DELAY_MS = 5_000

_segment_ok = re.compile(r"(:[A-Za-z_][A-Za-z0-9_]*|[A-Za-z0-9._~!$&'()*+,;=@-]+)").fullmatch
_content_type_ok = re.compile(r"[a-z]+/[a-z0-9.+-]+(; ?charset=[A-Za-z0-9-]+)?").fullmatch


class MockError(ValueError):
    """A mock definition the mocker can't serve; the message is shown to the user."""


def _segments(path: str) -> list[str]:
    return [s for s in path.strip().split("/") if s]


def clean_endpoints(endpoints: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """The endpoints normalised for storage, or MockError naming the first problem."""
    if not endpoints:
        raise MockError("Add at least one endpoint.")
    if len(endpoints) > MAX_ENDPOINTS:
        raise MockError(f"That's {len(endpoints)} endpoints; the limit is {MAX_ENDPOINTS}.")
    cleaned, seen = [], set()
    for n, ep in enumerate(endpoints, 1):
        method = str(ep.get("method", "GET")).upper()
        if method not in METHODS:
            raise MockError(f"Endpoint {n}: unknown method {method}.")
        segments = _segments(str(ep.get("path", "")))
        if not all(_segment_ok(s) for s in segments):
            raise MockError(f"Endpoint {n}: paths may use letters, digits, - _ . and :params only.")
        path = "/" + "/".join(segments)
        if (method, path) in seen:
            raise MockError(f"Endpoint {n}: {method} {path} is defined twice.")
        seen.add((method, path))
        try:
            code = int(ep.get("status", 200))
        except (TypeError, ValueError):
            code = 0
        if not 100 <= code <= 599:
            raise MockError(f"Endpoint {n}: status must be between 100 and 599.")
        body = str(ep.get("body", ""))
        if len(body) > MAX_BODY_CHARS:
            raise MockError(f"Endpoint {n}: the body is {len(body):,} characters; the limit is {MAX_BODY_CHARS:,}.")
        content_type = str(ep.get("content_type") or "application/json").strip().lower()
        if not _content_type_ok(content_type):
            raise MockError(f"Endpoint {n}: {content_type!r} is not a content type.")
        try:
            delay = int(ep.get("delay_ms", 0))
        except (TypeError, ValueError):
            delay = -1
        if not 0 <= delay <= MAX_DELAY_MS:
            raise MockError(f"Endpoint {n}: delay must be 0–{MAX_DELAY_MS} ms.")
        cleaned.append(
            {"method": method, "path": path, "status": code, "body": body, "content_type": content_type, "delay_ms": delay}
        )
    return cleaned


def _match_path(pattern: str, segments: list[str]) -> dict[str, str] | None:
    wanted = _segments(pattern)
    if len(wanted) != len(segments):
        return None
    params = {}
    for want, got in zip(wanted, segments):
        if want.startswith(":"):
            params[want[1:]] = got
        elif want != got:
            return None
    return params


def match(endpoints: list[dict[str, Any]], method: str, path: str) -> tuple[dict[str, Any] | None, dict[str, str], bool]:
    """(endpoint, params, path_known) for a request. Literal paths beat :param ones, and an exact
    method beats ANY; path_known says whether some endpoint had the path but not the method."""
    segments = _segments(path)
    best, best_params, best_rank, path_known = None, {}, None, False
    for ep in endpoints:
        params = _match_path(ep["path"], segments)
        if params is None:
            continue
        path_known = True
        if ep["method"] not in (method, "ANY") and not (method == "HEAD" and ep["method"] == "GET"):
            continue
        rank = (len(params), ep["method"] == "ANY")
        if best_rank is None or rank < best_rank:
            best, best_params, best_rank = ep, params, rank
    return best, best_params, path_known


def render_body(body: str, params: dict[str, str]) -> str:
    """The body with each {{name}} replaced by the captured path parameter; unknown names stay."""
    return re.sub(r"\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}", lambda m: params.get(m.group(1), m.group(0)), body)
