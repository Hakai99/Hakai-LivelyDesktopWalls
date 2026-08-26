# HAKAI Wallpaper Engine

A Wallpaper Engine-style desktop app — live video, GIF, and image wallpapers for your desktop, built for HAKAI.

## How it works

- **Video wallpapers** play looping in a fullscreen borderless window behind your desktop icons (Windows) or as an always-on-bottom window (macOS)
- **GIF + image wallpapers** display the same way
- **Volume, dim, and mute** are controllable from the app
- **Library** stores your wallpapers locally — right-click to rename or delete
- **Tray icon** keeps the engine running in the background

## Install & Run (5 minutes)

### Requirements
- [Node.js 18+](https://nodejs.org) — just install it, no configuration needed

### Steps

```bash
# 1. Unzip hakai-wallpaper.zip — open a terminal in that folder, then:

# 2. Install dependencies (first run only, takes ~1 minute)
npm install

# 3. Start the app
npm start
```

That's it. The app opens with your wallpaper library.

### To build a standalone .exe or .dmg (optional)

```bash
# Install builder
npm install --save-dev electron-builder

# Windows
npm run build-win

# macOS
npm run build-mac
```

The installer will be in the `dist/` folder.

## Using it

1. Click **+ Import Wallpapers** to add videos (.mp4, .webm, .mov), GIFs (.gif), or images (.png, .jpg)
2. Double-click any wallpaper or click **▶ Apply** to set it as your desktop background
3. Right-click a wallpaper card to rename, reveal in folder, or delete
4. Use the **Volume**, **Mute**, and **Dim** sliders on the right to adjust
5. Close the window — the wallpaper keeps running in the tray
6. Right-click the tray icon to mute/unmute or quit

## Notes

- On **Windows**, the wallpaper window sits at the lowest layer it can reach without native C++ code. Desktop icons remain clickable and visible above it.
- On **macOS**, the window type is set to `desktop` which places it at the desktop level natively.
- Your library and settings are stored in your user app data folder — they survive updates.
- Files you import are **copied** into the app's library folder, so you can safely move or delete the originals.
