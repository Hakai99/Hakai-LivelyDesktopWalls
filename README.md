# HAKAI Wallpaper Engine - Setup commands (Windows)

Run every command in PowerShell, inside the project folder (the one with package.json).
Run them one at a time.

## 1. Install Node 22 (once)
```
winget install OpenJS.NodeJS.LTS --version 22.12.0
```
Close PowerShell, open a new one, then check:
```
node -v
```
It must say v22.x. Do NOT use Node 26 (it breaks Electron).

## 2. Install the project
```
npm install
```

## 3. If Electron did not install (npm start says "Electron failed to install correctly")
```
Invoke-WebRequest -Uri "https://github.com/electron/electron/releases/download/v31.7.7/electron-v31.7.7-win32-x64.zip" -OutFile "$env:TEMP\electron.zip"
Remove-Item -Recurse -Force node_modules\electron\dist -ErrorAction SilentlyContinue
Expand-Archive -Path "$env:TEMP\electron.zip" -DestinationPath node_modules\electron\dist
Set-Content -Path node_modules\electron\path.txt -Value "electron.exe" -NoNewline
dir node_modules\electron\dist\electron.exe
```
The last command must list electron.exe. If antivirus deletes it, add the project folder
to the Windows Security exclusions and repeat.

## 4. Test it
```
npm start
```

## 5. Build the standalone app
```
node build-app.js
```
Result:
- `release\HAKAI Wallpaper Engine\HAKAI Wallpaper Engine.exe`  (the app)
- `release\HAKAI-Wallpaper-Engine.zip`  (send this to friends; they unzip and double-click, nothing to install)

## 6. Use the app
1. Quit the running copy from the tray icon.
2. Copy the whole `HAKAI Wallpaper Engine` folder somewhere permanent, e.g. `D:\Apps\`.
   Keep all files together; the exe needs the files next to it.
3. Double-click `HAKAI Wallpaper Engine.exe`.
4. Optional: right-click the exe > Send to > Desktop (shortcut), or put a shortcut in
   `C:\ProgramData\Microsoft\Windows\Start Menu\Programs` so Windows search finds it.

## 7. Delete node_modules and Electron (only after step 6 works)
```
Remove-Item -Recurse -Force node_modules
```
Keep the project folder and source files. To change the app later:
`npm install`, edit, `node build-app.js`.

## Where your data lives
`%APPDATA%\HAKAI Wallpaper Engine` (library, settings, hakai.log). Deleting node_modules does not touch it.

## Troubleshooting
| Problem | Fix |
|---|---|
| Electron failed to install correctly | Use Node 22, then section 3 |
| Wallpaper not playing | Open `%APPDATA%\HAKAI Wallpaper Engine\hakai.log` and send it |
| Build fails | Run `npm install` first, then `node build-app.js` again |
