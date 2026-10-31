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

## 4. Make it a real app (.exe) inside this folder

`npm run pack` can fail silently, so build the app folder by hand. Run these one at a time in this folder.

**4.1 Copy Electron into a new folder called `HAKAI`**

```powershell
Copy-Item -Recurse node_modules\electron\dist .\HAKAI
```

**4.2 Put the app inside it**

```powershell
New-Item -ItemType Directory .\HAKAI\resources\app
Copy-Item -Recurse src,assets,index.html,wallpaper.html,package.json .\HAKAI\resources\app
```

**4.3 Rename the exe**

```powershell
Rename-Item .\HAKAI\electron.exe "HAKAI Wallpaper Engine.exe"
```

**4.4 Run it**

```powershell
explorer .\HAKAI
```

Double-click **HAKAI Wallpaper Engine.exe**.

> Keep the `HAKAI` folder where it is. Do not move or delete it, or the shortcut will break.

---

## 5. Show it in Windows search / Start menu

Change the paths below if your project is not in `D:\Hakai-LivelyDesktopWalls`.

```powershell
$s = (New-Object -ComObject WScript.Shell).CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\HAKAI Wallpaper Engine.lnk")
$s.TargetPath = "D:\Hakai-LivelyDesktopWalls\HAKAI\HAKAI Wallpaper Engine.exe"
$s.WorkingDirectory = "D:\Hakai-LivelyDesktopWalls\HAKAI"
$s.IconLocation = "D:\Hakai-LivelyDesktopWalls\HAKAI\resources\app\assets\icon.ico"
$s.Save()
```

Wait about 10 seconds, then search **HAKAI Wallpaper** in the Start menu. Right-click it to **Pin to Start** or **Pin to taskbar**.

To launch at login, turn on **Start with Windows** in the app.

---

## 6. Updating the app later

After changing any file (`index.html`, `wallpaper.html`, `src\...`), copy it into the built app:

```powershell
Copy-Item -Recurse -Force src,assets,index.html,wallpaper.html,package.json .\HAKAI\resources\app
```

Quit the app from the tray menu first, then start it again.

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
