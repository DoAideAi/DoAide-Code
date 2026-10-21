"""One-click laptop setup: personalised installers, the agent package, and setup status."""

from __future__ import annotations

import io
import plistlib
import re
import shutil
import subprocess
import tarfile
import zipfile
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from doaide_code.auth import hash_token
from doaide_code.installer import build_installer, render_script
from doaide_code.main import create_app

HTTPS = {"x-forwarded-proto": "https", "host": "code.doaide.com"}


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def hub(settings) -> Iterator[TestClient]:
    settings.mode = "hub"
    with TestClient(create_app(settings)) as c:
        yield c


def baked_token(script: str) -> str:
    match = re.search(r"(?:HUB_TOKEN|\$Token)\s*=\s*'?([A-Za-z0-9_-]+)'?", script)
    assert match, "no token in installer"
    return match.group(1)


def mac_script(resp) -> str:
    archive = zipfile.ZipFile(io.BytesIO(resp.content))
    info = archive.getinfo("DoAide-Code-Setup.command")
    assert (info.external_attr >> 16) & 0o111, "the .command must stay executable after unzipping"
    return archive.read(info).decode()


def test_installer_requires_sign_in(hub):
    assert hub.get("/api/v1/setup/installer?platform=macos").status_code == 401
    assert hub.get("/api/v1/setup/installer?platform=macos", headers=auth("garbage")).status_code == 401


def test_installer_rejects_unknown_platform(hub, token):
    assert hub.get("/api/v1/setup/installer?platform=amiga", headers=auth(token)).status_code == 400


def test_macos_installer_bakes_in_a_new_long_lived_agent_token(hub, token):
    resp = hub.get("/api/v1/setup/installer?platform=macos", headers={**auth(token), **HTTPS})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/zip"
    assert 'filename="DoAide-Code-Setup.zip"' in resp.headers["content-disposition"]
    assert resp.headers["cache-control"] == "no-store"
    script = mac_script(resp)
    assert "HUB_URL=wss://code.doaide.com/agent" in script
    assert "BASE_URL=https://code.doaide.com" in script
    assert "OWNER_EMAIL=owner@example.com" in script
    assert "com.doaide.code-agent" in script and "Library/LaunchAgents" in script
    assert "launchctl bootstrap" in script and "<key>RunAtLoad</key><true/>" in script
    raw = baked_token(script)
    # Not the browser's session token: a never-expiring agent-scope token stored hashed.
    assert raw != token
    row = hub.app.state.store.find_refresh_token(hash_token(raw), "agent")
    assert row is not None and row["user_email"] == "owner@example.com"


def test_each_download_gets_its_own_token(hub, token):
    first = mac_script(hub.get("/api/v1/setup/installer?platform=macos", headers=auth(token)))
    second = mac_script(hub.get("/api/v1/setup/installer?platform=macos", headers=auth(token)))
    assert baked_token(first) != baked_token(second)


def test_windows_installer_is_a_crlf_batch_file_with_a_startup_entry(hub, token):
    resp = hub.get("/api/v1/setup/installer?platform=windows", headers={**auth(token), **HTTPS})
    assert resp.status_code == 200
    assert 'filename="DoAide-Code-Setup.bat"' in resp.headers["content-disposition"]
    text = resp.content.decode()
    assert text.startswith("@echo off\r\n") and "\n" not in text.replace("\r\n", "")
    assert "$HubUrl = 'wss://code.doaide.com/agent'" in text
    assert "GetFolderPath('Startup')" in text
    assert hub.app.state.store.find_refresh_token(hash_token(baked_token(text)), "agent")


def test_linux_installer_creates_a_systemd_user_service(hub, token):
    resp = hub.get("/api/v1/setup/installer?platform=linux", headers={**auth(token), **HTTPS})
    assert resp.status_code == 200
    text = resp.text
    assert text.startswith("#!/bin/bash\n")
    assert "systemctl --user enable" in text and "WantedBy=default.target" in text
    assert "HUB_URL=wss://code.doaide.com/agent" in text


@pytest.mark.parametrize("platform", ["macos", "linux"])
def test_shell_installers_parse(platform):
    if shutil.which("bash") is None:
        pytest.skip("bash not installed")
    script = render_script(
        platform, base_url="https://code.doaide.com", hub_url="wss://code.doaide.com/agent", token="t0k", email="a@b.c"
    )
    subprocess.run(["bash", "-n"], input=script, text=True, check=True)


def test_installer_values_cannot_break_out_of_quoting():
    with pytest.raises(ValueError):
        build_installer("macos", base_url="https://x", hub_url="wss://x/agent", token="t", email="a@b.c'; rm -rf ~")


def test_launch_agent_plist_is_valid(tmp_path):
    """Run the plist part of the macOS script and check that macOS-style parsing accepts it."""
    script = render_script(
        "macos", base_url="https://code.doaide.com", hub_url="wss://code.doaide.com/agent", token="tok", email="a@b.c"
    )
    start = script.index('cat >"$PLIST" <<PLIST')
    end = script.index("\nPLIST\n", start) + len("\nPLIST\n")
    xml_fn = next(line for line in script.splitlines() if line.startswith("xml()"))
    snippet = "\n".join(
        [
            "set -eu",
            xml_fn,
            "LABEL=com.doaide.code-agent HUB_URL=wss://code.doaide.com/agent HUB_TOKEN=tok OWNER_EMAIL=a@b.c",
            f"DIR={tmp_path} AGENT={tmp_path}/venv/bin/doaide-code AGENT_PATH='/usr/bin:/a&b' PLIST={tmp_path}/a.plist",
            script[start:end],
        ]
    )
    subprocess.run(["bash", "-c", snippet], check=True)
    plist = plistlib.loads((tmp_path / "a.plist").read_bytes())
    assert plist["Label"] == "com.doaide.code-agent"
    assert plist["ProgramArguments"] == [f"{tmp_path}/venv/bin/doaide-code", "agent"]
    assert plist["EnvironmentVariables"]["DOAIDE_HUB_TOKEN"] == "tok"
    assert plist["EnvironmentVariables"]["PATH"] == "/usr/bin:/a&b"
    assert plist["RunAtLoad"] is True and plist["KeepAlive"] is True


def test_agent_package_needs_an_agent_token(hub):
    assert hub.get("/api/v1/setup/agent-package").status_code == 401
    store = hub.app.state.store
    store.add_refresh_token(hash_token("agent-raw"), "owner@example.com", "agent")
    resp = hub.get("/api/v1/setup/agent-package", headers=auth("agent-raw"))
    assert resp.status_code == 200
    names = tarfile.open(fileobj=io.BytesIO(resp.content)).getnames()
    root = names[0].split("/")[0]
    assert re.fullmatch(r"doaide_code-[\w.]+", root)
    assert f"{root}/pyproject.toml" in names
    assert f"{root}/doaide_code/agent.py" in names
    assert f"{root}/doaide_code/installers/macos.command" in names
    assert not any("__pycache__" in n for n in names)
    pyproject = tarfile.open(fileobj=io.BytesIO(resp.content)).extractfile(f"{root}/pyproject.toml").read().decode()
    assert 'doaide-code = "doaide_code.main:run"' in pyproject and '"websockets' in pyproject
    assert "pytest" not in pyproject
    # Fetching the package is not a connection; it must not count as the laptop having connected.
    assert store.agent_ever_connected("owner@example.com") is False


def test_setup_status_tracks_the_laptop(hub, token):
    assert hub.get("/api/v1/setup/status").status_code == 401
    assert hub.get("/api/v1/setup/status", headers=auth(token)).json() == {
        "agent_online": False,
        "ever_connected": False,
    }
    hub.app.state.store.add_refresh_token(hash_token("agent-raw"), "owner@example.com", "agent")
    with hub.websocket_connect("/agent?token=agent-raw") as laptop:
        laptop.send_json({"type": "hello", "project": None, "executors": []})
        laptop.send_json({"type": "ping"})
        assert laptop.receive_json() == {"type": "pong"}
        # The installer polls with its own agent token while it waits for the connection.
        assert hub.get("/api/v1/setup/status", headers=auth("agent-raw")).json() == {
            "agent_online": True,
            "ever_connected": True,
        }
    status = hub.get("/api/v1/setup/status", headers=auth(token)).json()
    assert status == {"agent_online": False, "ever_connected": True}


def test_setup_endpoints_exist_only_on_the_hub(client, token):
    assert client.get("/api/v1/setup/installer?platform=macos", headers=auth(token)).status_code == 404
    assert client.get("/api/v1/setup/status", headers=auth(token)).status_code == 404


# Ollama step (4/5): installs Ollama when it is missing and pulls the small coder model.

OLLAMA_STUB = """#!/bin/bash
echo "ollama $*" >>"$CALLS"
[ "$1" = list ] && cat "$STUBS/models" 2>/dev/null
exit 0
"""
# curl: the local server answers; Ollama's install.sh "installs" the stub; downloads fail if asked to.
CURL_STUB = """#!/bin/bash
echo "curl $*" >>"$CALLS"
case "$*" in
  *11434/api/version*) exit 0 ;;
  *ollama.com/install.sh*) echo 'cp "$STUBS/ollama" "$BIN/ollama" && chmod +x "$BIN/ollama"' ;;
  *Ollama-darwin.zip*) [ -n "${ZIP:-}" ] && cp "$ZIP" "${@: -1}" || exit 22 ;;
  *) exit "${CURL_FAILS:-0}" ;;
esac
"""
BREW_STUB = """#!/bin/bash
echo "brew $*" >>"$CALLS"
cp "$STUBS/ollama" "$BIN/ollama" && chmod +x "$BIN/ollama"
"""


def ollama_step(platform: str) -> str:
    script = render_script(
        platform, base_url="https://code.doaide.com", hub_url="wss://code.doaide.com/agent", token="t0k", email="a@b.c"
    )
    # Look for (and install) Ollama.app in a test folder, not this machine's /Applications.
    return script[script.index('step "4/5') : script.index('step "5/5')].replace("/Applications", "$APPS_ROOT")


def run_ollama_step(tmp_path, platform: str, *, installed: bool, models: str = "", brew: bool = False, **env) -> tuple[str, list[str]]:
    """The installer's Ollama step against stub commands; returns its output and the commands it ran."""
    if shutil.which("bash") is None:
        pytest.skip("bash not installed")
    stubs, bin_dir, home = tmp_path / "stubs", tmp_path / "bin", tmp_path / "home"
    for d in (stubs, bin_dir, home / ".doaide-code" / "logs", tmp_path / "Applications"):
        d.mkdir(parents=True)
    (stubs / "ollama").write_text(OLLAMA_STUB)
    (stubs / "models").write_text("NAME  ID  SIZE  MODIFIED\n" + models)
    stubs_for = {"curl": CURL_STUB, **({"brew": BREW_STUB} if brew else {}), **({"ollama": OLLAMA_STUB} if installed else {})}
    for name, body in stubs_for.items():
        (bin_dir / name).write_text(body)
        (bin_dir / name).chmod(0o755)
    calls = tmp_path / "calls"
    prelude = 'set -euo pipefail\nstep() { echo "$*"; }\nDIR="$HOME/.doaide-code"\n'
    result = subprocess.run(
        ["bash", "-c", prelude + ollama_step(platform) + 'echo "end OLLAMA_DIR=${OLLAMA_DIR:-}"'],
        check=False,
        capture_output=True,
        text=True,
        env={
            "PATH": f"{bin_dir}:/usr/bin:/bin",
            "HOME": str(home),
            "BIN": str(bin_dir),
            "STUBS": str(stubs),
            "CALLS": str(calls),
            "APPS_ROOT": str(tmp_path / "Applications"),
            **env,
        },
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    return result.stdout, calls.read_text().splitlines() if calls.exists() else []


def test_every_installer_gets_ollama_before_it_starts_the_agent():
    for platform in ("macos", "linux", "windows"):
        script = render_script(
            platform, base_url="https://code.doaide.com", hub_url="wss://code.doaide.com/agent", token="t", email="a@b.c"
        )
        steps = re.findall(r"""[Ss]tep ['"](\d)/(\d) """, script)
        assert steps == [(str(n), "5") for n in range(1, 6)], platform
        ollama, agent = script.index("4/5  Getting Ollama"), script.index("5/5  Starting the agent")
        assert ollama < agent and "pull" in script[ollama:agent] and "qwen2.5-coder:7b" in script[ollama:agent]


def test_windows_installs_ollama_silently_from_the_github_release():
    script = render_script(
        "windows", base_url="https://code.doaide.com", hub_url="wss://code.doaide.com/agent", token="t", email="a@b.c"
    )
    assert "releases/latest/download/OllamaSetup.exe" in script and "'/VERYSILENT'" in script
    assert "& $ollama pull $model" in script


def test_linux_installs_ollama_with_its_script_then_pulls_the_coder_model(tmp_path):
    out, calls = run_ollama_step(tmp_path, "linux", installed=False)
    assert any("ollama.com/install.sh" in c for c in calls)
    assert "ollama pull qwen2.5-coder:7b" in calls
    assert "Could not set up Ollama" not in out


def test_an_existing_ollama_with_models_is_left_alone(tmp_path):
    for platform in ("linux", "macos"):
        _, calls = run_ollama_step(tmp_path / platform, platform, installed=True, models="qwen2.5-coder:32b  x  19 GB  now\n")
        assert not any("install.sh" in c or c.startswith("brew") or "pull" in c for c in calls), platform


def test_an_existing_ollama_without_models_gets_the_coder_model(tmp_path):
    _, calls = run_ollama_step(tmp_path, "linux", installed=True)
    assert "ollama pull qwen2.5-coder:7b" in calls


def test_macos_installs_ollama_with_homebrew_when_it_has_it(tmp_path):
    out, calls = run_ollama_step(tmp_path, "macos", installed=False, brew=True)
    assert "brew install --cask ollama" in calls
    assert "ollama pull qwen2.5-coder:7b" in calls
    assert f"end OLLAMA_DIR={tmp_path / 'bin'}" in out


def test_macos_without_homebrew_downloads_ollama_app_from_the_release(tmp_path):
    # The stub download fails, so this also checks that a failed Ollama step only warns.
    out, calls = run_ollama_step(tmp_path, "macos", installed=False)
    assert any("releases/latest/download/Ollama-darwin.zip" in c for c in calls)
    assert "Could not set up Ollama" in out and "end OLLAMA_DIR=\n" in out + "\n"


def test_macos_without_homebrew_unzips_ollama_app_and_uses_its_command(tmp_path):
    if shutil.which("ditto") is None:
        pytest.skip("ditto is macOS only")
    archive = tmp_path / "Ollama-darwin.zip"
    with zipfile.ZipFile(archive, "w") as z:
        info = zipfile.ZipInfo("Ollama.app/Contents/Resources/ollama")
        info.create_system, info.external_attr = 3, 0o100755 << 16  # a unix file, executable
        z.writestr(info, OLLAMA_STUB)
    out, calls = run_ollama_step(tmp_path / "run", "macos", installed=False, ZIP=str(archive))
    resources = tmp_path / "run" / "Applications" / "Ollama.app" / "Contents" / "Resources"
    assert (resources / "ollama").is_file()
    assert "ollama pull qwen2.5-coder:7b" in calls
    # The zip puts no command on PATH, so the agent is given the app's own.
    assert f"end OLLAMA_DIR={resources}" in out
