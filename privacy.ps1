# Privacy cleanup for the TV: switches off the tracking / ad / promo apps listed in
# app\src\main\assets\web\privacy-list.js (the same list Glass Home settings shows), or turns them back on.
# Nothing is uninstalled: it uses "pm disable-user" and "pm enable".
#
#   .\privacy.ps1 -Tv 192.168.1.50:5555 -Adb <adb.exe>            # dry run: shows what would change
#   .\privacy.ps1 -Tv ... -Adb ... -Apply                           # switch them off (saves privacy-applied.txt)
#   .\privacy.ps1 -Tv ... -Adb ... -Undo                            # switch back on everything this script switched off
param(
  [Parameter(Mandatory = $true)][string]$Tv,
  [string]$Adb = "adb",
  [switch]$Apply,
  [switch]$Undo
)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$listFile = Join-Path $here "app\src\main\assets\web\privacy-list.js"
$saved = Join-Path $here "privacy-applied.txt"

if ($Undo) {
  if (-not (Test-Path $saved)) { Write-Host "Nothing to undo (no privacy-applied.txt)."; exit 0 }
  Get-Content $saved | Where-Object { $_ } | ForEach-Object {
    $r = & $Adb -s $Tv shell pm enable $_ 2>&1
    Write-Host "on : $_  ($r)"
  }
  Remove-Item $saved
  exit 0
}

$pkgs = [regex]::Matches((Get-Content $listFile -Raw), 'pkg:\s*"([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$installed = (& $Adb -s $Tv shell pm list packages) -replace '^package:', ''
$disabled = (& $Adb -s $Tv shell pm list packages -d) -replace '^package:', ''
$todo = @()
foreach ($p in $pkgs) {
  if ($installed -notcontains $p) { Write-Host "skip (not on this TV): $p"; continue }
  if ($disabled -contains $p) { Write-Host "already off: $p"; continue }
  $todo += $p
}
if (-not $Apply) {
  Write-Host ""; Write-Host "Would switch off ($($todo.Count)):"; $todo | ForEach-Object { Write-Host "  $_" }
  Write-Host "Run again with -Apply to do it. Undo any time with -Undo."
  exit 0
}
foreach ($p in $todo) {
  $r = & $Adb -s $Tv shell pm disable-user --user 0 $p 2>&1
  Write-Host "off: $p  ($r)"
  if ($r -match "disabled") { Add-Content $saved $p }
}
