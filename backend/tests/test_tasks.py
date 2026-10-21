"""POST /api/v1/tasks: another agent (Dispatch) runs a task through DoAide's routing pipeline."""

from __future__ import annotations

import json
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from doaide_code.chat import ChatService
from doaide_code.db import Store
from doaide_code.main import create_app
from doaide_code.relay import RelayService, clean_meta
from doaide_code.router import RouterBrain
from doaide_code.sync import MirrorHub, SyncHub
from doaide_code.tasks import run_task
from doaide_code.usage import Usage
from doaide_code.validate import NO_ACCESS_REASON

from .conftest import FakeExecutor

EDIT = "Changed the greeting.\n\napp.py\n<<<<<<< SEARCH\nGREETING = 'hi'\n=======\nGREETING = 'hello'\n>>>>>>> REPLACE\n"


def executor(name: str, tier: int, chunks, tool: str = "claude") -> FakeExecutor:
    ex = FakeExecutor(name, tier, chunks)
    ex.tool = tool
    if tool == "ollama":
        ex.context_mode = "files"
    return ex


@pytest.fixture
def project(tmp_path):
    root = tmp_path / "proj"
    (root / "pkg").mkdir(parents=True)
    (root / "app.py").write_text("GREETING = 'hi'\n")
    return root


def app_with(settings, project, *executors) -> TestClient:
    app = create_app(settings, executors=list(executors))
    app.state.store.add_project("proj", str(project))
    return TestClient(app, client=("127.0.0.1", 50000))


@pytest.fixture
def auth(token) -> dict:
    return {"Authorization": f"Bearer {token}"}


def post(client: TestClient, auth: dict, **body):
    return client.post("/api/v1/tasks", headers=auth, json=body)


def test_a_passing_local_answer_is_returned_free(settings, project, auth):
    ollama = executor("ollama", 0, ["`GREETING` in app.py is the greeting text, 'hi'."], tool="ollama")
    sonnet = executor("claude-sonnet", 2, ["sonnet answer"])
    with app_with(settings, project, ollama, sonnet) as client:
        resp = post(client, auth, prompt="what is GREETING in app.py?", project_path=str(project))
    body = resp.json()
    assert resp.status_code == 200 and body["status"] == "done"
    assert body["executor"] == "ollama" and body["free"] and body["cost_usd"] == 0
    assert body["escalated_from"] is None and "'hi'" in body["answer"]
    assert body["project"] == "proj" and body["root"] == str(project.resolve())
    assert not sonnet.jobs and ollama.jobs[0].cwd == project.resolve()


def test_a_failed_local_answer_escalates_to_sonnet(settings, project, auth):
    refusal = "I'm sorry, but I don't have access to the user's system environment or project configuration files."
    ollama = executor("ollama", 0, [refusal], tool="ollama")
    sonnet = executor("claude-sonnet", 2, ["`GREETING` in app.py is 'hi'.", Usage("sonnet", 5000, 30, 0.011)])
    with app_with(settings, project, ollama, sonnet) as client:
        body = post(client, auth, prompt="what is GREETING in app.py?", project="proj").json()
    assert body["executor"] == "claude-sonnet" and not body["free"]
    assert body["escalated_from"]["executor"] == "ollama"
    assert body["escalated_from"]["reason"] == NO_ACCESS_REASON
    assert body["cost_usd"] == pytest.approx(0.011)


def test_edits_are_written_like_chat_edits(settings, project, auth):
    ollama = executor("ollama", 0, [EDIT, Usage("qwen2.5-coder:7b", 900, 40)], tool="ollama")
    with app_with(settings, project, ollama, executor("claude-sonnet", 2, ["unused"])) as client:
        body = post(client, auth, prompt="change GREETING in app.py to 'hello'", project_path=str(project)).json()
        usage = client.app.state.store._conn.execute("SELECT source FROM usage_log").fetchall()
    assert body["executor"] == "ollama"
    assert (project / "app.py").read_text() == "GREETING = 'hello'\n"
    assert body["changes"]["status"] == "applied" and body["changes"]["id"]
    assert {row[0] for row in usage} == {"dispatch"}


def test_a_folder_inside_a_project_is_accepted(settings, project, auth):
    ollama = executor("ollama", 0, ["The package folder pkg is empty for now."], tool="ollama")
    with app_with(settings, project, ollama, executor("claude-sonnet", 2, ["x"])) as client:
        body = post(client, auth, prompt="what is in this folder?", project_path=str(project / "pkg")).json()
    assert body["project"] == "proj" and body["root"] == str((project / "pkg").resolve())


@pytest.mark.parametrize(
    ("body", "detail"),
    [
        ({"prompt": "  "}, "prompt is empty"),
        ({"prompt": "hi", "project_path": "/etc"}, "is not in a registered project"),
        ({"prompt": "hi", "project_path": "{project}/../outside"}, "is not in a registered project"),
        ({"prompt": "hi", "project": "nope"}, "No project named 'nope'"),
    ],
)
def test_bad_requests_are_refused_before_any_model_runs(settings, project, auth, body, detail):
    ollama = executor("ollama", 0, ["x"], tool="ollama")
    body = {k: v.format(project=project) for k, v in body.items()}
    with app_with(settings, project, ollama) as client:
        resp = post(client, auth, **body)
    assert resp.status_code == 400 and detail in resp.json()["detail"]
    assert not ollama.jobs


def test_tasks_need_a_signed_in_caller(settings, project):
    with app_with(settings, project, executor("ollama", 0, ["x"], tool="ollama")) as client:
        assert client.post("/api/v1/tasks", json={"prompt": "hi"}).status_code == 401


def test_streaming_sends_deltas_then_the_result(settings, project, auth):
    sonnet = executor("claude-sonnet", 2, ["`GREETING` is ", "'hi' in app.py."])
    with app_with(settings, project, sonnet) as client:
        with client.stream("POST", "/api/v1/tasks", headers=auth, json={"prompt": "what is GREETING in app.py?", "stream": True}) as resp:
            assert resp.headers["content-type"].startswith("text/event-stream")
            events = [
                (block.split("\n")[0].removeprefix("event: "), json.loads(block.split("\n")[1].removeprefix("data: ")))
                for block in resp.read().decode().split("\n\n")
                if block.strip()
            ]
    kinds = [kind for kind, _ in events]
    assert kinds[-1] == "done" and "delta" in kinds
    assert "".join(data["text"] for kind, data in events if kind == "delta") == "`GREETING` is 'hi' in app.py."
    assert events[-1][1]["executor"] == "claude-sonnet" and events[-1][1]["status"] == "done"


def test_a_failed_task_is_a_502_with_the_reason(settings, project, auth):
    broken = FakeExecutor("claude-sonnet", 2, fail="claude CLI not signed in")
    with app_with(settings, project, broken) as client:
        resp = post(client, auth, prompt="what is GREETING in app.py?")
    assert resp.status_code == 502 and resp.json()["status"] == "error"


@pytest.fixture
def hub(settings) -> Iterator[TestClient]:
    settings.mode = "hub"
    with TestClient(create_app(settings), client=("127.0.0.1", 50000)) as c:
        yield c


def test_the_hub_does_not_run_tasks(hub, auth):
    assert post(hub, auth, prompt="hi").status_code == 404


# Tasks show in the user's one conversation: the laptop UI at once, the phone through the hub


def test_a_task_shows_in_the_laptop_chat_as_it_runs(settings, project, auth):
    ollama = executor("ollama", 0, ["`GREETING` in app.py is 'hi'."], tool="ollama")
    with app_with(settings, project, ollama) as client:
        token = auth["Authorization"].removeprefix("Bearer ")
        with client.websocket_connect(f"/ws?token={token}") as ws:
            assert ws.receive_json()["type"] == "snapshot"
            body = post(client, auth, prompt="what is GREETING in app.py?", project="proj").json()
            events = []
            while (event := ws.receive_json())["type"] != "done":
                events.append(event)
        snapshot = client.get("/api/session", headers=auth).json()
    instruction, reply = (e["message"] for e in events if e["type"] == "message")
    assert instruction["role"] == "user" and instruction["content"] == "what is GREETING in app.py?"
    assert instruction["meta"] == {"via": "dispatch"}
    assert reply["id"] == body["message_id"] and reply["status"] == "streaming"
    assert event["id"] == body["message_id"] and event["content"] == body["answer"]
    assert event["meta"]["via"] == "dispatch" and event["meta"]["route"]["executor"] == "ollama"
    # A UI opened later loads it from the conversation, with the model and checks.
    instruction, reply = snapshot["messages"][-2:]
    assert instruction["meta"]["via"] == "dispatch" and reply["content"] == body["answer"]
    assert reply["status"] == "done" and reply["meta"]["route"]["executor"] == "ollama"


def test_a_streamed_task_also_shows_in_the_chat(settings, project, auth):
    sonnet = executor("claude-sonnet", 2, ["`GREETING` is ", "'hi' in app.py."])
    with app_with(settings, project, sonnet) as client:
        with client.stream("POST", "/api/v1/tasks", headers=auth, json={"prompt": "what is GREETING?", "stream": True}) as resp:
            resp.read()
        messages = client.get("/api/session", headers=auth).json()["messages"]
    assert [(m["role"], m["content"]) for m in messages[-2:]] == [
        ("user", "what is GREETING?"),
        ("assistant", "`GREETING` is 'hi' in app.py."),
    ]


class Sink:
    def __init__(self) -> None:
        self.events: list[dict] = []

    async def send_json(self, data) -> None:
        self.events.append(data)


@pytest.mark.anyio
async def test_a_task_on_the_laptop_reaches_the_phone_through_the_hub(store, project, tmp_path):

    owner = "owner@example.com"
    # The hub (its own store) with the phone connected, fed by the laptop agent's uplink.
    hub_store, hub, phone = Store(tmp_path / "hub.db"), SyncHub(), Sink()
    await hub.join(owner, phone)
    relay = RelayService(hub_store, hub)
    laptop, laptop_ui = MirrorHub(), Sink()
    await laptop.join(owner, laptop_ui)

    async def uplink(event):
        await relay.on_agent_event(owner, event)

    laptop.uplink = uplink
    ollama = executor("ollama", 0, [EDIT], tool="ollama")
    router = RouterBrain([ollama], offline=True)
    chat = ChatService(store, router, laptop, workspace=str(tmp_path / "ws"))
    body = await run_task(router, store, project, "proj", "change GREETING in app.py to 'hello'", chat=chat, user_email=owner)

    assert [e["type"] for e in laptop_ui.events] == [e["type"] for e in phone.events]
    assert phone.events[-1]["type"] == "done" and phone.events[-1]["meta"]["via"] == "dispatch"
    assert phone.events[-1]["meta"]["changes"]["status"] == "applied"
    instruction, reply = relay.snapshot(owner)["messages"]
    assert instruction["content"] == "change GREETING in app.py to 'hello'" and instruction["meta"] == {"via": "dispatch"}
    assert reply["id"] == body["message_id"] and reply["content"] == body["answer"] and reply["meta"]["via"] == "dispatch"
    hub_store.close()


def test_the_hub_keeps_only_the_dispatch_label_from_the_laptop():
    assert clean_meta({"via": "dispatch", "route": {"executor": "ollama"}}) == {"via": "dispatch", "route": {"executor": "ollama"}}
    # "mcp" marks calls the hub relayed itself; a laptop cannot claim it, or anything else.
    assert clean_meta({"via": "mcp", "tool": "execute_code"}) == {}
    assert clean_meta({"via": "<script>"}) == {}
