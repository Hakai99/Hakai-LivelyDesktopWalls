'use strict';

const {
  app, BrowserWindow, ipcMain, dialog,
  screen, nativeImage, Tray, Menu, shell
} = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Hide the dock icon on macOS (tray-only app) ─────────────────────────────
if (process.platform === 'darwin') app.dock?.hide();

// ── Single instance ─────────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }
app.on('second-instance', () => showMain());

// ── Paths ───────────────────────────────────────────────────────────────────
const DATA_DIR      = path.join(app.getPath('userData'), 'library');
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Settings ────────────────────────────────────────────────────────────────
function loadSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); }
  catch {
    return { volume: 50, muted: true, dim: 20, activeId: null,
             wallpaperOn: true, startWithWindows: false,
             showClock: false, clockPosition: 'top-left', clockSize: 'medium' };
  }
}
function saveSettings(s) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
}
let settings = loadSettings();
if (settings.wallpaperOn === undefined) settings.wallpaperOn = true;

function applyLoginItem() {
  if (process.platform !== 'win32' && process.platform !== 'darwin') return;
  try {
    app.setLoginItemSettings({
      openAtLogin: settings.startWithWindows === true,
      name: 'HAKAI Wallpaper Engine',
      args: settings.startWithWindows ? ['--hidden'] : []
    });
  } catch {}
}
applyLoginItem();

// ── Library ─────────────────────────────────────────────────────────────────
const LIB_FILE = path.join(DATA_DIR, 'library.json');
function loadLibrary() {
  try { return JSON.parse(fs.readFileSync(LIB_FILE, 'utf8')); }
  catch { return []; }
}
function saveLibrary(lib) { fs.writeFileSync(LIB_FILE, JSON.stringify(lib, null, 2)); }

// ── Windows ──────────────────────────────────────────────────────────────────
let mainWin      = null;
let wallpaperWin = null;
let tray         = null;

// ── Wallpaper window ─────────────────────────────────────────────────────────
function createWallpaperWindow() {
  if (wallpaperWin && !wallpaperWin.isDestroyed()) return;
  const { bounds } = screen.getPrimaryDisplay();

  wallpaperWin = new BrowserWindow({
    x: bounds.x, y: bounds.y,
    width: bounds.width, height: bounds.height,
    frame: false, transparent: true,
    resizable: false, movable: false,
    focusable: false, skipTaskbar: true,
    alwaysOnTop: false,
    type: process.platform === 'darwin' ? 'desktop' : 'normal',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  wallpaperWin.loadFile(path.join(__dirname, '..', 'wallpaper.html'));
  wallpaperWin.setIgnoreMouseEvents(true, { forward: true });
  if (process.platform === 'win32') {
    wallpaperWin.once('ready-to-show', () => {
      wallpaperWin.setAlwaysOnTop(false);
      wallpaperWin.showInactive();
    });
  }
  wallpaperWin.on('closed', () => { wallpaperWin = null; });
}

function destroyWallpaperWindow() {
  if (wallpaperWin && !wallpaperWin.isDestroyed()) {
    wallpaperWin.close();
    wallpaperWin = null;
  }
}

// ── Main window ───────────────────────────────────────────────────────────────
function createMainWindow() {
  if (mainWin && !mainWin.isDestroyed()) { showMain(); return; }

  mainWin = new BrowserWindow({
    width: 1140, height: 740,
    minWidth: 820, minHeight: 560,
    frame: false,
    backgroundColor: '#08090f',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWin.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWin.once('ready-to-show', () => {
    if (!process.argv.includes('--hidden')) showMain();
  });

  mainWin.on('close', e => {
    if (!app.isQuitting) { e.preventDefault(); mainWin.hide(); }
  });
  mainWin.on('closed', () => { mainWin = null; });
}

function showMain() {
  if (!mainWin || mainWin.isDestroyed()) { createMainWindow(); return; }
  mainWin.show();
  mainWin.focus();
  if (mainWin.isMinimized()) mainWin.restore();
}

// ── Tray ──────────────────────────────────────────────────────────────────────
function makeTrayIcon() {
  // 16x16 purple circle as fallback inline tray icon
  const size = 16;
  const buf  = Buffer.alloc(size * size * 4);
  const cx = cy = 7.5, r = 7;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
      if (d <= r) {
        const t = y / size;
        buf[i]   = Math.min(255, 80  + t*40);   // R
        buf[i+1] = Math.min(255, 40  + (1-d/r)*80); // G
        buf[i+2] = Math.min(255, 190 + t*65);   // B
        buf[i+3] = 255;
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function rebuildTrayMenu() {
  const on = settings.wallpaperOn !== false;
  const menu = Menu.buildFromTemplate([
    {
      label: '🎨  HAKAI Wallpaper Engine',
      enabled: false
    },
    { type: 'separator' },
    {
      label: on ? '⏸  Pause Wallpaper' : '▶  Resume Wallpaper',
      click: () => toggleWallpaper(!on)
    },
    { type: 'separator' },
    {
      label: settings.muted ? '🔊  Unmute' : '🔇  Mute',
      click: () => {
        settings.muted = !settings.muted;
        saveSettings(settings);
        sendToWallpaper('settings-update', settings);
        sendToMain('settings-changed', settings);
        rebuildTrayMenu();
      }
    },
    {
      label: settings.startWithWindows
        ? '✓  Start with Windows (ON)'
        : '   Start with Windows (OFF)',
      click: () => {
        settings.startWithWindows = !settings.startWithWindows;
        saveSettings(settings);
        applyLoginItem();
        sendToMain('settings-changed', settings);
        rebuildTrayMenu();
      }
    },
    { type: 'separator' },
    {
      label: '🖥  Open Library',
      click: () => showMain()
    },
    { type: 'separator' },
    {
      label: '✕  Quit',
      click: () => { app.isQuitting = true; app.quit(); }
    }
  ]);
  if (tray) tray.setContextMenu(menu);
  if (tray) tray.setToolTip(on
    ? 'HAKAI Wallpaper Engine — Running'
    : 'HAKAI Wallpaper Engine — Paused');
}

function createTray() {
  let icon;
  // Try to use the real .ico file first
  const icoPath = path.join(__dirname, '..', 'assets', 'icon.ico');
  if (fs.existsSync(icoPath)) {
    try { icon = nativeImage.createFromPath(icoPath).resize({ width: 16, height: 16 }); }
    catch { icon = makeTrayIcon(); }
  } else {
    icon = makeTrayIcon();
  }

  tray = new Tray(icon);
  rebuildTrayMenu();

  // Left-click opens library
  tray.on('click', () => showMain());
  // Right-click handled automatically by context menu
}

// ── Wallpaper on/off toggle ───────────────────────────────────────────────────
function toggleWallpaper(on) {
  settings.wallpaperOn = on;
  saveSettings(settings);

  if (on) {
    // Resume — recreate window if needed, reload active wallpaper
    if (!wallpaperWin || wallpaperWin.isDestroyed()) createWallpaperWindow();
    if (settings.activeId) {
      const entry = loadLibrary().find(w => w.id === settings.activeId);
      if (entry) {
        setTimeout(() => sendToWallpaper('load-wallpaper', { entry, settings }), 400);
      }
    }
  } else {
    // Pause — destroy the wallpaper window completely (desktop goes back to normal)
    destroyWallpaperWindow();
  }

  sendToMain('settings-changed', settings);
  rebuildTrayMenu();
}

// ── IPC helpers ───────────────────────────────────────────────────────────────
function sendToWallpaper(ch, data) {
  if (wallpaperWin && !wallpaperWin.isDestroyed())
    wallpaperWin.webContents.send(ch, data);
}
function sendToMain(ch, data) {
  if (mainWin && !mainWin.isDestroyed())
    mainWin.webContents.send(ch, data);
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createTray();
  createMainWindow();

  if (settings.wallpaperOn !== false) {
    createWallpaperWindow();
    if (settings.activeId) {
      const entry = loadLibrary().find(w => w.id === settings.activeId);
      if (entry) {
        await new Promise(r => setTimeout(r, 600));
        sendToWallpaper('load-wallpaper', { entry, settings });
      }
    }
  }
});

app.on('before-quit', () => { app.isQuitting = true; });
app.on('window-all-closed', () => { /* stay alive in tray */ });
app.on('activate', () => showMain());

// ── IPC handlers ──────────────────────────────────────────────────────────────

// Window chrome
ipcMain.on('win-minimize', () => mainWin?.minimize());
ipcMain.on('win-maximize', () => {
  if (!mainWin) return;
  mainWin.isMaximized() ? mainWin.unmaximize() : mainWin.maximize();
});
ipcMain.on('win-close', () => mainWin?.hide());

// Library
ipcMain.handle('library-load', () => loadLibrary());

ipcMain.handle('library-import', async () => {
  const result = await dialog.showOpenDialog(mainWin, {
    title: 'Import Wallpapers',
    filters: [{ name: 'Media', extensions: ['mp4','webm','mov','avi','mkv','gif','png','jpg','jpeg','webp'] }],
    properties: ['openFile', 'multiSelections']
  });
  if (result.canceled || !result.filePaths.length) return null;

  const lib = loadLibrary(), added = [];
  for (const src of result.filePaths) {
    const ext  = path.extname(src).toLowerCase().slice(1);
    const type = ['mp4','webm','mov','avi','mkv'].includes(ext) ? 'video'
               : ext === 'gif' ? 'gif' : 'image';
    const id   = `wp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const dest = path.join(DATA_DIR, id + path.extname(src));
    fs.copyFileSync(src, dest);
    const entry = { id, type, name: path.basename(src, path.extname(src)), file: dest, ext, added: Date.now() };
    lib.push(entry);
    added.push(entry);
  }
  saveLibrary(lib);
  return added;
});

ipcMain.handle('library-delete', async (_, id) => {
  const lib = loadLibrary();
  const idx = lib.findIndex(w => w.id === id);
  if (idx === -1) return false;
  try { if (fs.existsSync(lib[idx].file)) fs.unlinkSync(lib[idx].file); } catch {}
  lib.splice(idx, 1);
  saveLibrary(lib);
  if (settings.activeId === id) {
    settings.activeId = null;
    saveSettings(settings);
    sendToWallpaper('clear-wallpaper', {});
  }
  return true;
});

ipcMain.handle('library-rename', (_, { id, name }) => {
  const lib = loadLibrary(), entry = lib.find(w => w.id === id);
  if (!entry) return false;
  entry.name = name.trim() || entry.name;
  saveLibrary(lib);
  return true;
});

// Wallpaper control
ipcMain.handle('activate-wallpaper', async (_, id) => {
  const entry = loadLibrary().find(w => w.id === id);
  if (!entry) return false;

  // If wallpaper is paused, turn it back on when user picks one
  if (settings.wallpaperOn === false) {
    settings.wallpaperOn = true;
  }

  if (!wallpaperWin || wallpaperWin.isDestroyed()) {
    createWallpaperWindow();
    await new Promise(r => setTimeout(r, 450));
  }
  settings.activeId = id;
  saveSettings(settings);
  sendToWallpaper('load-wallpaper', { entry, settings });
  sendToMain('active-changed', id);
  sendToMain('settings-changed', settings);
  rebuildTrayMenu();
  return true;
});

ipcMain.handle('clear-wallpaper', async () => {
  settings.activeId = null;
  saveSettings(settings);
  sendToWallpaper('clear-wallpaper', {});
  sendToMain('active-changed', null);
  return true;
});

// Toggle on/off from renderer
ipcMain.handle('toggle-wallpaper', (_, on) => {
  toggleWallpaper(on);
  return settings;
});

// Settings
ipcMain.handle('settings-get', () => settings);
ipcMain.handle('settings-update', (_, patch) => {
  settings = { ...settings, ...patch };
  saveSettings(settings);
  if ('startWithWindows' in patch) applyLoginItem();
  sendToWallpaper('settings-update', settings);
  rebuildTrayMenu();
  return settings;
});

// File read
ipcMain.handle('file-read-b64', async (_, filePath) => {
  try {
    const buf  = fs.readFileSync(filePath);
    const ext  = path.extname(filePath).toLowerCase().slice(1);
    const mime = { mp4:'video/mp4', webm:'video/webm', mov:'video/quicktime',
                   gif:'image/gif', webp:'image/webp', png:'image/png' }[ext] || 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch { return null; }
});

ipcMain.on('reveal-file', (_, p) => shell.showItemInFolder(p));
