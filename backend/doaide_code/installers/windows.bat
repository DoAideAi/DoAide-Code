@echo off
rem DoAide Code laptop setup for Windows. Double-click to run: it installs the agent into
rem %USERPROFILE%\.doaide-code and adds a Startup entry that starts it now and at every login.
rem The PowerShell below the #PS# marker does the work; this file deletes itself when done.
title DoAide Code setup
set "DOAIDE_SETUP=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$m='#'+'PS'+'#'; $t=[IO.File]::ReadAllText($env:DOAIDE_SETUP); & ([ScriptBlock]::Create($t.Substring($t.IndexOf($m)+$m.Length)))"
if errorlevel 1 (
  echo.
  echo Setup did not finish. Nothing is broken: download the installer again to retry.
  pause
  exit /b 1
)
timeout /t 6 >nul
(goto) 2>nul & del "%~f0"
exit /b 0
#PS#
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$BaseUrl = @@BASE_URL@@
$HubUrl = @@HUB_URL@@
$Token = @@HUB_TOKEN@@
$Email = @@OWNER_EMAIL@@
$PkgName = @@PKG_NAME@@
$Dir = Join-Path $env:USERPROFILE '.doaide-code'

function Step($text) { Write-Host ''; Write-Host $text -ForegroundColor White }

try {
  Write-Host "DoAide Code: setting up this PC for $Email"
  New-Item -ItemType Directory -Force -Path $Dir, "$Dir\bin", "$Dir\logs" | Out-Null

  Step '1/5  Getting the Python installer (uv)...'
  $uv = (Get-Command uv -ErrorAction SilentlyContinue).Source
  if (-not $uv) {
    $uv = Join-Path $Dir 'bin\uv.exe'
    if (-not (Test-Path $uv)) {
      $env:UV_INSTALL_DIR = "$Dir\bin"; $env:UV_NO_MODIFY_PATH = '1'; $env:INSTALLER_NO_MODIFY_PATH = '1'
      Invoke-RestMethod https://astral.sh/uv/install.ps1 | Invoke-Expression | Out-Null
    }
  }

  Step '2/5  Downloading the DoAide Code agent...'
  $pkg = Join-Path $Dir $PkgName
  $auth = @{ Authorization = "Bearer $Token" }
  Invoke-WebRequest -UseBasicParsing -Headers $auth -Uri "$BaseUrl/api/v1/setup/agent-package" -OutFile $pkg

  Step '3/5  Installing (the first time this can take a minute)...'
  $python = "$Dir\venv\Scripts\python.exe"
  if (-not (Test-Path $python)) {
    & $uv venv --quiet --python 3.12 "$Dir\venv"
    if ($LASTEXITCODE) { throw 'could not create the Python environment' }
  }
  & $uv pip install --quiet --python $python --reinstall-package doaide-code $pkg
  if ($LASTEXITCODE) { throw 'could not install the agent' }
  $agent = "$Dir\venv\Scripts\doaide-code.exe"

  Step '4/5  Getting Ollama, for free local answers...'
  # Optional: Claude Code or Codex can answer without it, so a failure here only warns.
  $model = 'qwen2.5-coder:7b'
  $up = { try { Invoke-RestMethod -TimeoutSec 2 http://127.0.0.1:11434/api/version | Out-Null; $true } catch { $false } }
  try {
    $ollamaDir = Join-Path $env:LOCALAPPDATA 'Programs\Ollama'
    $ollama = (Get-Command ollama -ErrorAction SilentlyContinue).Source
    if (-not $ollama -and (Test-Path "$ollamaDir\ollama.exe")) { $ollama = "$ollamaDir\ollama.exe" }
    $fresh = -not $ollama
    if ($fresh) {
      $setup = Join-Path $Dir 'OllamaSetup.exe'
      Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/ollama/ollama/releases/latest/download/OllamaSetup.exe' -OutFile $setup
      # An Inno Setup installer: /VERYSILENT is its silent mode (it ignores /S).
      Start-Process -Wait -FilePath $setup -ArgumentList '/VERYSILENT', '/NORESTART', '/SUPPRESSMSGBOXES'
      Remove-Item -Force $setup -ErrorAction SilentlyContinue
      $ollama = "$ollamaDir\ollama.exe"
      if (-not (Test-Path $ollama)) { throw 'the Ollama installer did not finish' }
    }
    # The agent started below inherits this PATH; the installer's change reaches new logins only.
    $env:Path = "$env:Path;$(Split-Path $ollama)"
    if (-not (& $up)) {
      $tray = Join-Path (Split-Path $ollama) 'ollama app.exe'
      if (Test-Path $tray) { Start-Process $tray } else { Start-Process -WindowStyle Hidden $ollama -ArgumentList 'serve' }
      for ($i = 0; $i -lt 30 -and -not (& $up); $i++) { Start-Sleep -Seconds 1 }
      if (-not (& $up)) { throw 'Ollama did not start' }
    }
    # A new install, or one with no models yet, gets the small coder model (about 5 GB).
    $models = @(& $ollama list 2>$null | Select-Object -Skip 1)
    if ($fresh -or $models.Count -eq 0) {
      Write-Host "Downloading $model (about 5 GB; the first time this takes a while)..."
      & $ollama pull $model
      if ($LASTEXITCODE) { throw "could not download $model" }
    }
  } catch {
    Write-Host "Could not set up Ollama ($($_.Exception.Message)); DoAide Code will use Claude Code or Codex. Install it from https://ollama.com later." -ForegroundColor Yellow
  }

  Step '5/5  Starting the agent and turning on start-at-login...'
  # Stop an agent from an earlier install before starting the new one.
  Get-CimInstance Win32_Process -Filter "Name='doaide-code.exe' OR Name='wscript.exe'" |
    Where-Object { $_.Name -eq 'doaide-code.exe' -or $_.CommandLine -like '*DoAide Code Agent.vbs*' } |
    ForEach-Object { Invoke-CimMethod -InputObject $_ -MethodName Terminate | Out-Null }
  $log = "$Dir\logs\agent.log"
  $run = 'cmd /c ""' + $agent + '" agent >> "' + $log + '" 2>&1"'
  $q = { param($s) '"' + $s.Replace('"', '""') + '"' }
  $vbs = @(
    "' DoAide Code laptop agent: runs hidden and restarts if it stops."
    'Set sh = CreateObject("WScript.Shell")'
    'Set env = sh.Environment("Process")'
    'env("DOAIDE_HUB_URL") = ' + (& $q $HubUrl)
    'env("DOAIDE_HUB_TOKEN") = ' + (& $q $Token)
    'env("DOAIDE_OWNER_EMAIL") = ' + (& $q $Email)
    'env("PYTHONUNBUFFERED") = "1"'
    'Do'
    '  sh.Run ' + (& $q $run) + ', 0, True'
    '  WScript.Sleep 10000'
    'Loop'
  )
  $startup = Join-Path ([Environment]::GetFolderPath('Startup')) 'DoAide Code Agent.vbs'
  Set-Content -Path $startup -Value $vbs -Encoding Unicode
  Start-Process wscript.exe -ArgumentList ('"' + $startup + '"')

  Write-Host -NoNewline 'Waiting for your PC to connect'
  $online = $false
  for ($i = 0; $i -lt 30 -and -not $online; $i++) {
    try {
      $status = Invoke-RestMethod -Headers $auth -Uri "$BaseUrl/api/v1/setup/status"
      $online = [bool]$status.agent_online
    } catch {}
    if (-not $online) { Write-Host -NoNewline '.'; Start-Sleep -Seconds 1 }
  }
  Write-Host ''
  if ($online) {
    Write-Host ''
    Write-Host 'All set! Your PC is connected to DoAide Code.' -ForegroundColor Green
    Write-Host 'It starts by itself whenever you sign in to Windows.'
  } else {
    Write-Host ''
    Write-Host 'Installed. The agent is starting and will connect in a moment.' -ForegroundColor Yellow
    Write-Host "If it does not, the log is at $log"
  }
  Start-Process $BaseUrl
} catch {
  Write-Host ''
  Write-Host "Setup did not finish: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
