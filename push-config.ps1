# Copies config.json (and optional wallpapers/ and logos/ folders) from this folder to the TV.
# Usage:  .\push-config.ps1 -Tv 192.168.1.50:5555 -Adb <path to adb.exe>
param(
  [Parameter(Mandatory = $true)][string]$Tv,
  [string]$Adb = "adb"
)
$dest = "/sdcard/Android/data/app.glasshome.launcher/files"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

& $Adb -s $Tv shell mkdir -p "$dest/wallpapers" "$dest/logos"
if (Test-Path "$here\config.json") { & $Adb -s $Tv push "$here\config.json" "$dest/config.json" } else { Write-Host "No config.json here (copy config.example.json to config.json first)" }
if (Test-Path "$here\wallpapers") { & $Adb -s $Tv push "$here\wallpapers\." "$dest/wallpapers/" }
if (Test-Path "$here\logos") { & $Adb -s $Tv push "$here\logos\." "$dest/logos/" }
# Restart the launcher so it re-reads its config
& $Adb -s $Tv shell am force-stop app.glasshome.launcher
& $Adb -s $Tv shell monkey -p app.glasshome.launcher -c android.intent.category.LEANBACK_LAUNCHER 1 | Out-Null
