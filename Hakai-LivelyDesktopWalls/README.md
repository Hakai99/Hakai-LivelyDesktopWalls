# HAKAI Wallpaper Engine

Live desktop wallpapers for Windows 10/11 — video, GIF and image — with a neon clock, a name banner and a now-playing music widget. Built with Electron.

---

## Features

| Feature | What it does |
|---|---|
| Video / GIF / Image wallpapers | MP4, WebM, MOV, AVI, MKV, GIF, PNG, JPG, WebP |
| Clay (neumorphic) UI | Purple-blue gradient, with a **Dark / Light** switch |
| LED toggle switches | Every on/off option uses the same LED toggle |
| Clock overlay | Centered by default; also 4 corners; Small / Medium / Large / XL |
| Hakai Neo font | Custom font used for the weekday, clock time, date and name banner |
| Name banner | Your name at the top of the wallpaper, on/off toggle |
| Music widget | Song, artist, cover art and progress bar, on/off toggle |
| Volume / Mute / Dim | Control audio and darken the wallpaper |
| Tray icon | Runs in the background |
| Start with Windows | Launch silently at login |

### Music widget

Reads what Windows is currently playing, so it works with YouTube Music (even in a background browser tab), Spotify and most players. Windows 10/11 only. Turn it off in the app under **Music Widget**.

### Clean look

For wallpapers with detailed art, turn **Name Banner** off, **Music Widget** off, and set the clock to **Bottom Left**.

---

## 1. Requirements

- Windows 10 or 11
- **Node.js 22 (LTS)** — **do not use Node 26**, it breaks Electron's installer.

Install Node 22 from PowerShell:

```powershell
winget uninstall OpenJS.NodeJS.LTS
winget install OpenJS.NodeJS.LTS --version 22.12.0
```

Close PowerShell and open a new one, then check:

```powershell
node -v
```

It must show `v22.x.x`. (Manual installer: https://nodejs.org/dist/v22.12.0/node-v22.12.0-x64.msi)

---

## 2. Install and run (test mode)

Open PowerShell in this folder (click the File Explorer address bar, type `powershell`, press Enter).

```powershell
npm install
npm start
```

Do **not** run `npm audit fix --force`.

---

## 3. If Electron fails to install (manual install)

Symptom: `npm start` says **"Electron failed to install correctly"**, or `node_modules\electron\dist` only contains a `locales` folder.

Install Electron by hand. Run these one at a time in this folder.

**3.1 Download Electron 31.7.7**

```powershell
Invoke-WebRequest -Uri "https://github.com/electron/electron/releases/download/v31.7.7/electron-v31.7.7-win32-x64.zip" -OutFile "$env:TEMP\electron.zip"
```

**3.2 Remove the broken folder and unpack the zip**

```powershell
Remove-Item -Recurse -Force node_modules\electron\dist -ErrorAction SilentlyContinue
Expand-Archive -Path "$env:TEMP\electron.zip" -DestinationPath node_modules\electron\dist
```

**3.3 Tell Electron where its program is**

```powershell
Set-Content -Path node_modules\electron\path.txt -Value "electron.exe" -NoNewline
```

**3.4 Check it**

```powershell
dir node_modules\electron\dist\electron.exe
```

**3.5 Start**

```powershell
npm start
```

If Windows Security deletes `electron.exe`, add this project folder as an exclusion (Windows Security → Virus & threat protection → Manage settings → Exclusions) and repeat 3.2.

---

## 4. Build the real app (one command)

After `npm start` works (and Electron is installed — section 3 if not), run:

```powershell
node build-app.js
```

(or double-click `build-app.bat`)

It creates:

```
release\HAKAI Wallpaper Engine\HAKAI Wallpaper Engine.exe    <- the app
release\HAKAI-Wallpaper-Engine.zip                          <- send this to other people
```

- The exe is named and branded **HAKAI Wallpaper Engine** (Task Manager no longer says "Electron").
- Other people just **unzip and double-click the exe**. No Node, no npm, no install.
- On first run the app adds itself to the Start menu (search "HAKAI") — no manual shortcut needed.
- Windows may show "Windows protected your PC" (the app is not code-signed): **More info -> Run anyway**.

When you're happy with the app you can delete `node_modules` and keep only the `release` folder.

---

## 5. Log file (for troubleshooting)

The app writes a small log you can open if something goes wrong:

```powershell
notepad "$env:APPDATA\HAKAI Wallpaper Engine\hakai.log"
```

---

## 6. Updating the app later (re-build)

Quit the app from the tray menu, then run `node build-app.js` again.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Electron failed to install correctly` | Use Node 22, then follow **section 3** |
| `dist` only has `locales` | Follow **section 3** |
| App not in Windows search | Run the **section 5** command and wait ~10 seconds |
| Music widget shows nothing | Make sure a song is actually playing; check the status line in the app under **Music Widget** |
| High RAM | Use images or short 1080p videos; turn the music widget off; click **Stop Wallpaper** while gaming |

---

## Project layout

```
src/main.js        Electron main process (windows, tray, settings, music reader)
src/preload.js     Bridge between main process and pages
src/media.ps1      Reads the Windows now-playing session
index.html         The app window
wallpaper.html     The wallpaper layer (clock, banner, music widget)
assets/fonts/      Hakai Neo font
```

MIT License
