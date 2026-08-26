HAKAI Wallpaper Engine
> Live desktop wallpapers — video, animated GIF, and image backgrounds with a built-in clock overlay. Built with Electron.
![HAKAI](assets/icon-256.png)
---
Features
Feature	Description
Video Wallpapers	MP4, WebM, MOV, AVI, MKV
Animated GIFs	Full GIF support
Image Wallpapers	PNG, JPG, WebP
Power Toggle	Pause / resume wallpaper instantly
Clock Overlay	Time, day & date on your desktop
Clock Position	5 positions — centre, corners
Clock Size	Small / Medium / Large / XL
Mute Control	Toggle audio on/off
Dim Slider	Darken wallpaper for readability
Volume Slider	Control wallpaper audio
Library	Import and manage your wallpapers
System Tray	Runs in background, always accessible
Start with Windows	Auto-launch at login
---
Quick Start
Requirements
Windows 10 or 11
Node.js LTS — download from nodejs.org
Build & Run
```bash
# 1. Install dependencies
npm install

# 2. Install packager
npm install --save-dev @electron/packager

# 3. Build the app
npx @electron/packager . "HAKAI Wallpaper Engine" --platform=win32 --arch=x64 --icon=assets/icon.ico --out=dist --overwrite --app-version=1.0.0 --verbose

# 4. Open the output folder
explorer "dist\HAKAI Wallpaper Engine-win32-x64"
```
Double-click `HAKAI Wallpaper Engine.exe` to launch.
> 💡 **Tip:** Open CMD directly in your project folder by clicking the Explorer address bar, typing `cmd`, and pressing Enter.
---
Creating a Desktop Shortcut
Open `dist\HAKAI Wallpaper Engine-win32-x64\`
Right-click `HAKAI Wallpaper Engine.exe`
Click Show more options
Click Send to → Desktop (create shortcut)
---
Settings
Clock Overlay
Toggle the clock ON/OFF from the right panel
Choose from 5 positions — Top Left, Centre, Top Right, Bottom Left, Bottom Right
Choose from 4 sizes — Small, Medium, Large, XL
Display
Setting	Description
Volume	Wallpaper audio level
Muted	Toggle audio completely
Dim	Overlay darkness (0–80%)
System
Setting	Description
Start with Windows	Auto-launch at login silently
Minimize to tray	Closing hides the window, wallpaper keeps running
---
Sharing with Others
Once you have built the app, the other person needs nothing — no Node.js, no commands.
Just zip and send this one folder:
```
dist\HAKAI Wallpaper Engine-win32-x64\
```
They unzip it and double-click the `.exe`. That's it.
---
Windows SmartScreen Warning
The first time you run the app, Windows may show:
> **"Windows protected your PC"**
This is normal for apps without a paid code-signing certificate. Click:
More info → Run anyway
It only appears once and is completely safe.
---
Project Structure
```
hakai-LivelyDeskWalls/
├── src/
│   ├── main.js          # Electron main process
│   └── preload.js       # IPC bridge
├── assets/
│   ├── icon.ico         # App icon (Windows)
│   └── icon-*.png       # Icon sizes
├── index.html           # Library UI
├── wallpaper.html       # Desktop wallpaper renderer
├── package.json
└── HAKAI-INSTALL-GUIDE.txt
```
---
Common Errors
`'node' is not recognized`
→ Restart your computer after installing Node.js
Build finishes but `dist\` is empty
→ Use `@electron/packager` (with the `@`) — not `electron-packager`
App closes immediately on launch
→ Right-click `.exe` → Properties → Compatibility → check Run as administrator
Wallpaper not showing behind desktop icons
→ This is a Windows limitation without native C++ hooks. The wallpaper plays in a bottom-level window — desktop icons remain on top normally.
---
Development
```bash
# Run without building
npm start
```
---
Tech Stack
Electron — Desktop app framework
@electron/packager — App bundler
Vanilla JS / HTML / CSS — No frontend framework needed
---
License
MIT — do whatever you want with it.
---
<div align="center">
  <strong>HAKAI Wallpaper Engine</strong> — Made for the vibe. 
</div>
