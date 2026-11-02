# HAKAI — sends play/pause, next or previous to the song that is playing in Windows.
param([string]$Cmd = 'toggle')
$ErrorActionPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false) } catch {}

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$genericName = 'IAsyncOperation' + [char]96 + '1'
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq $genericName
})[0]

function Await($op, [Type]$type) {
  $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
  $null = $task.Wait(-1)
  return $task.Result
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
if ($mgr -eq $null) { Write-Output 'fail no-manager'; exit 0 }

# the playing session, never this app's own wallpaper video
$cur = $null
foreach ($s in $mgr.GetSessions()) {
  $sid = [string]$s.SourceAppUserModelId
  if ($sid -match 'hakai|electron') { continue }
  if ([int]$s.GetPlaybackInfo().PlaybackStatus -eq 4) { $cur = $s; break }
  if ($cur -eq $null) { $cur = $s }
}
if ($cur -eq $null) { Write-Output 'none'; exit 0 }

$r = $false
switch ($Cmd) {
  'toggle' { $r = Await ($cur.TryTogglePlayPauseAsync()) ([bool]) }
  'next'   { $r = Await ($cur.TrySkipNextAsync()) ([bool]) }
  'prev'   { $r = Await ($cur.TrySkipPreviousAsync()) ([bool]) }
}
Write-Output ('ok ' + $Cmd + ' ' + $r)
