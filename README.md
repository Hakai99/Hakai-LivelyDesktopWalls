# HAKAI Wallpaper Engine

Live desktop wallpapers — video, animated GIF, and image backgrounds with a built-in clock overlay. Built with Electron.
![HAKAI preview](https://github.com/Hakai99/Hakai-BrowserTAB/blob/main/HAKAI-BrowserTabExtension/icons/icon-128.png)

---

## Features

| Feature | Description |
|---|---|
| Video Wallpapers | MP4, WebM, MOV, AVI, MKV |
| Animated GIFs | Full GIF support |
| Image Wallpapers | PNG, JPG, WebP |
| Power Toggle | Pause and resume wallpaper instantly |
| Clock Overlay | Time, day and date displayed on your desktop |
| Clock Position | 5 positions — centre, corners |
| Clock Size | Small, Medium, Large, XL |
| Mute Control | Toggle audio on and off |
| Dim Slider | Darken wallpaper for readability |
| Volume Slider | Control wallpaper audio level |
| Library | Import and manage your wallpapers |
| System Tray | Runs in background, always accessible |
| Start with Windows | Auto-launch silently at login |

---

## Requirements

- Windows 10 or 11
- Node.js LTS — https://nodejs.org

---

## Build and Run

Open Command Prompt inside your project folder and run these commands in order.

**Install dependencies**
```
npm install
```

**Install packager**
```
npm install --save-dev @electron/packager
```

**Build the app**
```
npx @electron/packager . "HAKAI Wallpaper Engine" --platform=win32 --arch=x64 --icon=assets/icon.ico --out=dist --overwrite --app-version=1.0.0 --verbose
```

**Open the output folder**
```
explorer "dist\HAKAI Wallpaper Engine-win32-x64"
```

Double-click `HAKAI Wallpaper Engine.exe` to launch.

Tip: Open CMD directly in your project folder by clicking the Explorer address bar, typing `cmd`, and pressing Enter.

---

## Creating a Desktop Shortcut

1. Open `dist\HAKAI Wallpaper Engine-win32-x64\`
2. Right-click `HAKAI Wallpaper Engine.exe`
3. Click **Show more options**
4. Click **Send to** then **Desktop (create shortcut)**

---

## Settings

### Clock Overlay

Toggle the clock on and off from the right panel. Choose from 5 positions and 4 sizes.

| Option | Values |
|---|---|
| Position | Top Left, Centre, Top Right, Bottom Left, Bottom Right |
| Size | Small, Medium, Large, XL |

### Display

| Setting | Description |
|---|---|
| Volume | Wallpaper audio level |
| Muted | Toggle audio completely |
| Dim | Overlay darkness from 0 to 80 percent |

### System

| Setting | Description |
|---|---|
| Start with Windows | Auto-launch at login |
| Minimize to tray | Closing hides the window, wallpaper keeps running |

---

## Sharing with Others

Once you have built the app, the other person needs nothing — no Node.js, no commands, no setup.

Zip and send this one folder:
```
dist\HAKAI Wallpaper Engine-win32-x64\
```

They unzip it and double-click the `.exe`. That is it.

---

## Windows SmartScreen Warning

The first time you run the app, Windows may show a warning saying "Windows protected your PC". This happens because the app does not have a paid code-signing certificate. Click **More info** then **Run anyway**. It only appears once.

---

## Project Structure

```
hakai-LivelyDeskWalls/
├── src/
│   ├── main.js            Electron main process
│   └── preload.js         IPC bridge
├── assets/
│   ├── icon.ico           App icon for Windows
│   └── icon-*.png         Icon in multiple sizes
├── index.html             Library UI
├── wallpaper.html         Desktop wallpaper renderer
├── package.json
└── HAKAI-INSTALL-GUIDE.txt
```

---

## Common Errors

**'node' is not recognized**
Restart your computer after installing Node.js.

**Build finishes but dist folder is empty**
Make sure you used `@electron/packager` with the `@` — not `electron-packager`.

**App closes immediately on launch**
Right-click the `.exe` then Properties then Compatibility then check Run as administrator.

---

## Development

Run without building:
```
npm start
```

---

## Tech Stack

- Electron — Desktop app framework
- @electron/packager — App bundler
- Vanilla JavaScript, HTML, CSS

---

## License

MIT

---

HAKAI Wallpaper Engine — Made for the vibe.
