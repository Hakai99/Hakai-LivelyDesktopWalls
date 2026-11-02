'use strict';

const {
  app, BrowserWindow, ipcMain, dialog,
  screen, nativeImage, Tray, Menu, shell
} = require('electron');
const path = require('path');
const fs   = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

app.setAppUserModelId('com.hakai.wallpaperengine');
// The wallpaper video must not register as a media session or grab the keyboard media keys
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService');

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

// ── Tiny log file (…\HAKAI Wallpaper Engine\hakai.log) to help find problems ───
function log(...a) {
  try {
    fs.appendFileSync(path.join(app.getPath('userData'), 'hakai.log'),
      new Date().toISOString() + '  ' + a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ') + '\n');
  } catch {}
}

// ── Settings ────────────────────────────────────────────────────────────────
const DEFAULTS = {
  v: 2,
  volume: 50, muted: true, dim: 20, activeId: null,
  wallpaperOn: true, startWithWindows: false,
  showClock: true, clockPosition: 'center', clockSize: 'large',
  showBanner: true, bannerName: 'HAKAI',
  showMedia: true, mediaPosition: 'bottom-center',
  theme: 'dark'
};
function loadSettings() {
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch {}
  const merged = { ...DEFAULTS, ...saved };
  // v2 migration: new look — clock on and centred, banner + music widget on
  if (!saved.v || saved.v < 2) {
    merged.v = 2;
    merged.showClock = true;
    merged.clockPosition = 'center';
    merged.clockSize = 'large';
  }
  return merged;
}
function saveSettings(s) {
  try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2)); } catch {}
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
let startHidden = process.argv.includes('--hidden');

function createMainWindow() {
  if (mainWin && !mainWin.isDestroyed()) { showMain(); return; }

  mainWin = new BrowserWindow({
    width: 1140, height: 740,
    minWidth: 980, minHeight: 600,
    title: 'HAKAI Wallpaper Engine',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    frame: false,
    backgroundColor: settings.theme === 'light' ? '#e7e1fb' : '#090818',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWin.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWin.once('ready-to-show', () => {
    if (!startHidden) showMain();
  });

  // Closing the window really closes it (frees ~150 MB of RAM); the tray keeps the wallpaper running.
  mainWin.on('closed', () => { mainWin = null; });
}

function showMain() {
  startHidden = false;
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
  const cx = 7.5, cy = 7.5, r = 7;
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

  syncMedia();
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

// ── Now-playing (Windows media session) ───────────────────────────────────────
let mediaProc = null, mediaState = null, mediaBuf = '', mediaTimer = null;

function pushMedia() {
  sendToWallpaper('media-update', mediaState);
  sendToMain('media-update', mediaState);
}

function handleMediaLine(line) {
  line = line.replace(/^\uFEFF/, '').trim();
  if (!line) return;
  let o;
  try { o = JSON.parse(line); } catch { return; }
  if (o.none || /hakai|electron/i.test(o.app || '') || /wallpaper\.html/i.test(o.t || '')) {
    if (mediaState) { mediaState = null; pushMedia(); }
    return;
  }
  const same = mediaState && mediaState.title === o.t && mediaState.artist === o.a && mediaState.app === o.app;
  let thumb = same ? mediaState.thumb : null;
  if (o.th) thumb = `data:${o.tm || 'image/jpeg'};base64,${o.th}`;
  mediaState = {
    title: o.t || '', artist: o.a || '', album: o.al || '', app: o.app || '',
    status: o.s === 4 ? 'playing' : o.s === 5 ? 'paused' : 'stopped',
    pos: o.p || 0, dur: o.d || 0, thumb
  };
  pushMedia();
}

function startMedia() {
  if (process.platform !== 'win32' || mediaProc) return;
  clearTimeout(mediaTimer);
  let proc;
  try {
    const src  = fs.readFileSync(path.join(__dirname, 'media.ps1'), 'utf8');
    const dest = path.join(app.getPath('userData'), 'media.ps1');
    fs.writeFileSync(dest, '\uFEFF' + src, 'utf8');   // BOM → Windows PowerShell reads it as UTF-8
    proc = spawn('powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', dest],
      { windowsHide: true });
  } catch { return; }
  mediaProc = proc;
  mediaBuf = '';
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', chunk => {
    mediaBuf += chunk;
    let i;
    while ((i = mediaBuf.indexOf('\n')) >= 0) {
      handleMediaLine(mediaBuf.slice(0, i));
      mediaBuf = mediaBuf.slice(i + 1);
    }
  });
  proc.stderr.on('data', () => {});
  proc.on('error', () => { if (mediaProc === proc) mediaProc = null; });
  proc.on('exit', () => {
    if (mediaProc === proc) mediaProc = null;
    if (mediaWanted() && !app.isQuitting) mediaTimer = setTimeout(startMedia, 4000);
  });
}

function stopMedia() {
  clearTimeout(mediaTimer);
  const p = mediaProc;
  mediaProc = null;
  if (p) { try { p.kill(); } catch {} }
  if (mediaState) { mediaState = null; pushMedia(); }
}

function mediaWanted() { return settings.showMedia !== false && settings.wallpaperOn !== false; }
function syncMedia() { mediaWanted() ? startMedia() : stopMedia(); }

// ── Start-menu shortcut (so the app shows up in Windows search by itself) ──────
function ensureStartMenuShortcut() {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  try {
    const lnk = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'HAKAI Wallpaper Engine.lnk');
    let op = 'create';
    if (fs.existsSync(lnk)) {
      let cur = null;
      try { cur = shell.readShortcutLink(lnk); } catch {}
      if (cur && cur.target && path.resolve(cur.target).toLowerCase() === path.resolve(process.execPath).toLowerCase()) return;
      op = 'replace';
    }
    const ico = path.join(__dirname, '..', 'assets', 'icon.ico');
    shell.writeShortcutLink(lnk, op, {
      target: process.execPath,
      cwd: path.dirname(process.execPath),
      description: 'HAKAI Wallpaper Engine',
      icon: ico.includes('.asar') ? process.execPath : ico,
      iconIndex: 0,
      appUserModelId: 'com.hakai.wallpaperengine'
    });
  } catch {}
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createTray();
  if (!startHidden) createMainWindow();
  ensureStartMenuShortcut();
  syncMedia();

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

app.on('before-quit', () => { app.isQuitting = true; stopMedia(); });
app.on('window-all-closed', () => { /* stay alive in tray */ });
app.on('activate', () => showMain());

// ── IPC handlers ──────────────────────────────────────────────────────────────

// Window chrome
ipcMain.on('win-minimize', () => mainWin?.minimize());
ipcMain.on('win-maximize', () => {
  if (!mainWin) return;
  mainWin.isMaximized() ? mainWin.unmaximize() : mainWin.maximize();
});
ipcMain.on('win-close', () => mainWin?.close());

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
  if ('showMedia' in patch) syncMedia();
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

ipcMain.handle('file-url', (_, p) => { try { return pathToFileURL(p).href; } catch { return null; } });
ipcMain.handle('media-get', () => mediaState);

// The wallpaper window lets clicks pass through, except while the pointer is over the song card
ipcMain.on('wp-interactive', (_, on) => {
  if (wallpaperWin && !wallpaperWin.isDestroyed()) wallpaperWin.setIgnoreMouseEvents(!on, { forward: true });
});

// Play / pause / next / previous for whatever song is playing in Windows
ipcMain.handle('media-control', (_, cmd) => new Promise(resolve => {
  if (process.platform !== 'win32' || !['toggle', 'next', 'prev'].includes(cmd)) return resolve(false);
  try {
    const src  = fs.readFileSync(path.join(__dirname, 'mediactl.ps1'), 'utf8');
    const dest = path.join(app.getPath('userData'), 'mediactl.ps1');
    fs.writeFileSync(dest, '\uFEFF' + src, 'utf8');
    const p = spawn('powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', dest, '-Cmd', cmd],
      { windowsHide: true });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.on('error', () => resolve(false));
    p.on('close', () => { log('media-control', cmd, out.trim()); resolve(/^ok/m.test(out)); });
  } catch { resolve(false); }
}));
// The wallpaper page tells us when it is ready, so the wallpaper always loads (no timing guesses)
ipcMain.on('wallpaper-ready', () => {
  log('wallpaper page ready');
  if (settings.wallpaperOn === false) return;
  const entry = settings.activeId ? loadLibrary().find(w => w.id === settings.activeId) : null;
  if (entry) sendToWallpaper('load-wallpaper', { entry, settings });
});

ipcMain.on('reveal-file', (_, p) => shell.showItemInFolder(p));
