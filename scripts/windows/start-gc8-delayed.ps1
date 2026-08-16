param(
  [int]$DelaySeconds = 20
)

$ErrorActionPreference = "SilentlyContinue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..\..")

$ExeCandidates = @(
  Join-Path $ProjectRoot "src-tauri\target\release\gc8-companion.exe",
  Join-Path $ProjectRoot "src-tauri\target\release\GC8 Companion.exe"
)

$Exe = $ExeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

Start-Sleep -Seconds $DelaySeconds

if (!$Exe) {
  exit 1
}

$AlreadyRunning = Get-Process gc8-companion -ErrorAction SilentlyContinue

if ($AlreadyRunning) {
  exit 0
}

Start-Process -FilePath $Exe -WorkingDirectory $ProjectRoot
