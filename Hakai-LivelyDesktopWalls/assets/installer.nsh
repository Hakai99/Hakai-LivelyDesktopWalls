; HAKAI Wallpaper — Custom NSIS installer hooks
; Adds a "Launch HAKAI Wallpaper" checkbox on the finish page

!macro customInstall
  ; Nothing extra needed — electron-builder handles shortcuts/registry
!macroend

!macro customUnInstall
  ; Clean up startup registry entry if it was set
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "HAKAI Wallpaper"
!macroend
