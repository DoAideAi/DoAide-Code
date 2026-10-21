"""One-click laptop setup: personalised installer scripts and the agent package they install.

The hub hands a signed-in user a script for their OS with a fresh agent token baked in.
Run once, it installs Python (via uv) and this package into ~/.doaide-code, then registers
the agent to start now and at every login: a LaunchAgent on macOS, a Startup entry on
Windows, a systemd user service on Linux. No model runs on the hub; it only serves files.
"""

from __future__ import annotations

import io
import json
import re
import shlex
import tarfile
import time
import zipfile
from dataclasses import dataclass
from importlib import metadata
from pathlib import Path

PACKAGE = "doaide-code"
PACKAGE_DIR = Path(__file__).resolve().parent
TEMPLATES = PACKAGE_DIR / "installers"
PLATFORMS = ("macos", "windows", "linux")
# Anything else could break out of the quoting in the generated scripts.
SAFE_VALUE = re.compile(r"^[A-Za-z0-9._~:/@+=%-]+$")


@dataclass(frozen=True)
class Installer:
    filename: str
    content: bytes
    media_type: str


def package_version() -> str:
    try:
        return metadata.version(PACKAGE)
    except metadata.PackageNotFoundError:
        return "0.0.0"


def package_filename() -> str:
    # uv and pip read the project name and version from an sdist's file name.
    return f"doaide_code-{package_version()}.tar.gz"


def _quote(value: str, platform: str) -> str:
    if not SAFE_VALUE.match(value):
        raise ValueError(f"unsafe installer value: {value!r}")
    return f"'{value}'" if platform == "windows" else shlex.quote(value)


def render_script(platform: str, *, base_url: str, hub_url: str, token: str, email: str) -> str:
    """The installer script for one platform with the user's values filled in."""
    if platform not in PLATFORMS:
        raise ValueError(f"unknown platform {platform!r}")
    template = {"macos": "macos.command", "windows": "windows.bat", "linux": "linux.sh"}[platform]
    text = (TEMPLATES / template).read_text()
    values = {
        "BASE_URL": base_url.rstrip("/"),
        "HUB_URL": hub_url,
        "HUB_TOKEN": token,
        "OWNER_EMAIL": email,
        "PKG_NAME": package_filename(),
    }
    for key, value in values.items():
        text = text.replace(f"@@{key}@@", _quote(value, platform))
    # cmd.exe needs CRLF line endings to parse a batch file reliably.
    return text.replace("\r\n", "\n").replace("\n", "\r\n") if platform == "windows" else text


def build_installer(platform: str, **values: str) -> Installer:
    script = render_script(platform, **values)
    if platform == "windows":
        return Installer("DoAide-Code-Setup.bat", script.encode(), "application/octet-stream")
    if platform == "linux":
        return Installer("doaide-code-setup.sh", script.encode(), "application/x-sh")
    # Browsers drop the executable bit on downloads, so the .command ships in a zip that
    # keeps it; Finder unzips on double-click and the script then opens in Terminal.
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        info = zipfile.ZipInfo("DoAide-Code-Setup.command", date_time=time.localtime()[:6])
        info.external_attr = (0o100755 << 16)
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, script)
    return Installer("DoAide-Code-Setup.zip", buffer.getvalue(), "application/zip")


def _pyproject() -> str:
    """pyproject.toml for the agent sdist, from this installation's own metadata."""
    try:
        requires = [r for r in metadata.requires(PACKAGE) or [] if "extra ==" not in r]
        python = metadata.metadata(PACKAGE).get("Requires-Python") or ">=3.11"
    except metadata.PackageNotFoundError:
        requires, python = [], ">=3.11"
    deps = "".join(f"    {json.dumps(r)},\n" for r in requires)
    return (
        "[project]\n"
        f'name = "{PACKAGE}"\n'
        f'version = "{package_version()}"\n'
        f'requires-python = "{python}"\n'
        f"dependencies = [\n{deps}]\n\n"
        "[project.scripts]\n"
        'doaide-code = "doaide_code.main:run"\n\n'
        "[build-system]\n"
        'requires = ["setuptools>=69"]\n'
        'build-backend = "setuptools.build_meta"\n\n'
        "[tool.setuptools.packages.find]\n"
        'include = ["doaide_code*"]\n\n'
        "[tool.setuptools.package-data]\n"
        'doaide_code = ["installers/*"]\n'
    )


def agent_package() -> bytes:
    """An sdist of the running code, so the laptop always installs what the hub serves."""
    root = package_filename().removesuffix(".tar.gz")
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        data = _pyproject().encode()
        info = tarfile.TarInfo(f"{root}/pyproject.toml")
        info.size, info.mtime, info.mode = len(data), int(time.time()), 0o644
        archive.addfile(info, io.BytesIO(data))
        for path in sorted(PACKAGE_DIR.rglob("*")):
            rel = path.relative_to(PACKAGE_DIR)
            skip = "__pycache__" in rel.parts or path.suffix in {".pyc", ".pyo"} or path.name.startswith(".")
            if not path.is_file() or skip:
                continue
            archive.add(path, arcname=f"{root}/doaide_code/{rel.as_posix()}", recursive=False)
    return buffer.getvalue()
