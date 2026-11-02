# HAKAI — reads the Windows "now playing" session (YouTube Music in Chrome/Edge/Firefox,
# Spotify, Apple Music, etc.) and prints one JSON line per second to stdout.
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
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null

function Emit($obj) {
  [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress))
  [Console]::Out.Flush()
}

$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
if ($mgr -eq $null) { Emit @{ none = $true; error = 'no-manager' }; exit 1 }

$lastKey = ''
$thumbTries = 0
$haveThumb = $false

while ($true) {
  try {
    # Pick the session that is playing; skip this app's own wallpaper video (Chromium registers it as media too)
    $cur = $null
    foreach ($s in $mgr.GetSessions()) {
      $sid = [string]$s.SourceAppUserModelId
      if ($sid -match 'hakai|electron') { continue }
      if ([int]$s.GetPlaybackInfo().PlaybackStatus -eq 4) { $cur = $s; break }
      if ($cur -eq $null) { $cur = $s }
    }

    if ($cur -eq $null) {
      Emit @{ none = $true }
    } else {
      $props = Await ($cur.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
      $info  = $cur.GetPlaybackInfo()
      $tl    = $cur.GetTimelineProperties()

      $key = [string]$cur.SourceAppUserModelId + '|' + [string]$props.Title + '|' + [string]$props.Artist
      if ($key -ne $lastKey) { $lastKey = $key; $thumbTries = 0; $haveThumb = $false }

      $thumb = $null; $mime = ''
      if (-not $haveThumb -and $thumbTries -lt 8 -and $props.Thumbnail -ne $null) {
        $thumbTries++
        try {
          $rs = Await ($props.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
          if ($rs -ne $null -and $rs.Size -gt 0) {
            $mime = [string]$rs.ContentType
            $st = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($rs)
            $ms = New-Object System.IO.MemoryStream
            $st.CopyTo($ms)
            $thumb = [Convert]::ToBase64String($ms.ToArray())
            $haveThumb = $true
            $st.Dispose(); $ms.Dispose()
          }
        } catch {}
      }

      $pos = $tl.Position.TotalSeconds - $tl.StartTime.TotalSeconds
      $dur = $tl.EndTime.TotalSeconds - $tl.StartTime.TotalSeconds
      if ($pos -lt 0) { $pos = 0 }
      if ($dur -lt 0) { $dur = 0 }

      # Browsers report the position once; add the time that has passed since that report
      if ([int]$info.PlaybackStatus -eq 4) {
        try {
          $age = ([DateTimeOffset]::UtcNow - $tl.LastUpdatedTime).TotalSeconds
          $rate = 1.0
          if ($info.PlaybackRate -ne $null -and [double]$info.PlaybackRate -gt 0) { $rate = [double]$info.PlaybackRate }
          if ($age -gt 0 -and $age -lt 21600) { $pos += $age * $rate }
        } catch {}
      }
      if ($dur -gt 0 -and $pos -gt $dur) { $pos = $dur }

      Emit ([ordered]@{
        t   = [string]$props.Title
        a   = [string]$props.Artist
        al  = [string]$props.AlbumTitle
        s   = [int]$info.PlaybackStatus
        p   = [math]::Round($pos, 1)
        d   = [math]::Round($dur, 1)
        app = [string]$cur.SourceAppUserModelId
        th  = $thumb
        tm  = $mime
      })
    }
  } catch {}
  Start-Sleep -Milliseconds 1000
}
