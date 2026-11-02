'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('HAKAI', {
  minimize:  ()    => ipcRenderer.send('win-minimize'),
  maximize:  ()    => ipcRenderer.send('win-maximize'),
  close:     ()    => ipcRenderer.send('win-close'),

  libraryLoad:   ()         => ipcRenderer.invoke('library-load'),
  libraryImport: ()         => ipcRenderer.invoke('library-import'),
  libraryDelete: (id)       => ipcRenderer.invoke('library-delete', id),
  libraryRename: (id, name) => ipcRenderer.invoke('library-rename', { id, name }),

  activate:        (id)  => ipcRenderer.invoke('activate-wallpaper', id),
  clear:           ()    => ipcRenderer.invoke('clear-wallpaper'),
  toggleWallpaper: (on)  => ipcRenderer.invoke('toggle-wallpaper', on),

  settingsGet:    ()      => ipcRenderer.invoke('settings-get'),
  settingsUpdate: (patch) => ipcRenderer.invoke('settings-update', patch),

  fileReadB64: (p) => ipcRenderer.invoke('file-read-b64', p),
  fileUrl:     (p) => ipcRenderer.invoke('file-url', p),
  mediaGet:    ()  => ipcRenderer.invoke('media-get'),
  mediaControl: (cmd) => ipcRenderer.invoke('media-control', cmd),
  wallpaperInteractive: (on) => ipcRenderer.send('wp-interactive', on),
  wallpaperReady: () => ipcRenderer.send('wallpaper-ready'),
  revealFile:  (p) => ipcRenderer.send('reveal-file', p),

  on: (channel, fn) => {
    const allowed = ['active-changed','load-wallpaper','clear-wallpaper',
                     'settings-update','settings-changed','media-update'];
    if (allowed.includes(channel)) ipcRenderer.on(channel, (_, d) => fn(d));
  }
});
