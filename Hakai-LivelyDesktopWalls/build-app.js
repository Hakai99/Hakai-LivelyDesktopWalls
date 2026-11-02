'use strict';
/**
 * Builds a ready-to-share portable app:
 *   release/HAKAI Wallpaper Engine/HAKAI Wallpaper Engine.exe   (+ release/HAKAI-Wallpaper-Engine.zip)
 * Other people only unzip and double-click the exe — no Node, no npm, no install.
 */
const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const NAME = 'HAKAI Wallpaper Engine';
const ELECTRON_DIST = path.join(ROOT, 'node_modules', 'electron', 'dist');
const RELEASE = path.join(ROOT, 'release');
const OUT     = path.join(RELEASE, NAME);
const EXE     = path.join(OUT, NAME + '.exe');
const ZIP     = path.join(RELEASE, 'HAKAI-Wallpaper-Engine.zip');

const step = m => console.log('\n>> ' + m);
const fail = m => { console.error('\nERROR: ' + m); process.exit(1); };

(async () => {
  if (!fs.existsSync(path.join(ELECTRON_DIST, 'electron.exe')))
    fail('node_modules\\electron\\dist\\electron.exe not found.\nFollow "If Electron fails to install" in README.md first.');

  step('Cleaning old build');
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.rmSync(ZIP, { force: true });
  fs.mkdirSync(RELEASE, { recursive: true });

  step('Copying Electron runtime');
  fs.cpSync(ELECTRON_DIST, OUT, { recursive: true });

  step('Copying the app');
  const appDir = path.join(OUT, 'resources', 'app');
  fs.mkdirSync(appDir, { recursive: true });
  for (const item of ['src', 'assets', 'index.html', 'wallpaper.html'])
    fs.cpSync(path.join(ROOT, item), path.join(appDir, item), { recursive: true });

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({
    name: pkg.name, productName: NAME, version: pkg.version, description: pkg.description,
    main: pkg.main, author: pkg.author, license: pkg.license
  }, null, 2));
  fs.rmSync(path.join(OUT, 'resources', 'default_app.asar'), { force: true });

  step('Trimming languages (keeps English + Hindi)');
  const loc = path.join(OUT, 'locales');
  if (fs.existsSync(loc))
    for (const f of fs.readdirSync(loc))
      if (!['en-US.pak', 'en-GB.pak', 'hi.pak'].includes(f)) fs.rmSync(path.join(loc, f), { force: true });
  fs.rmSync(path.join(OUT, 'LICENSE'), { force: true });

  step('Naming the exe');
  fs.renameSync(path.join(OUT, 'electron.exe'), EXE);

  step('Setting app name + icon inside the exe (so Task Manager says "' + NAME + '", not "Electron")');
  try {
    const mod = require('rcedit');
    const rcedit = typeof mod === 'function' ? mod : (mod.rcedit || mod.default);
    await rcedit(EXE, {
      icon: path.join(ROOT, 'assets', 'icon.ico'),
      'file-version': pkg.version,
      'product-version': pkg.version,
      'version-string': {
        ProductName: NAME,
        FileDescription: NAME,
        CompanyName: 'HAKAI',
        OriginalFilename: NAME + '.exe',
        InternalName: NAME,
        LegalCopyright: 'HAKAI'
      }
    });
    console.log('   done');
  } catch (e) {
    console.warn('   WARNING: could not rename inside the exe (' + (e && e.message || e) + ').');
    console.warn('   The app still works, but Task Manager may show "Electron".');
  }

  fs.writeFileSync(path.join(OUT, 'READ ME FIRST.txt'),
`HAKAI Wallpaper Engine
======================
1. Unzip this folder anywhere (for example Documents or D:\\).
2. Double-click  "${NAME}.exe".
3. That's it - no install needed. It adds itself to the Start menu
   (search "HAKAI") and to the tray icon near the clock.

If Windows says "Windows protected your PC":
   click "More info"  ->  "Run anyway".   (The app is not code-signed.)

Tips
- Closing the window keeps the wallpaper running in the tray.
  Quit fully from the tray icon -> Quit.
- Turn on "Start with Windows" inside the app to launch at login.
- Keep this whole folder together. If you move it, just run the exe once again.
`);

  step('Creating the zip');
  let ok = false;
  const t = spawnSync('tar', ['-a', '-c', '-f', ZIP, '-C', RELEASE, NAME], { stdio: 'inherit' });
  ok = t.status === 0 && fs.existsSync(ZIP);
  if (!ok) {
    const ps = spawnSync('powershell.exe', ['-NoProfile', '-Command',
      `Compress-Archive -Path '${OUT.replace(/'/g, "''")}' -DestinationPath '${ZIP.replace(/'/g, "''")}' -Force`], { stdio: 'inherit' });
    ok = ps.status === 0 && fs.existsSync(ZIP);
  }

  console.log('\n==========================================================');
  console.log(' DONE');
  console.log(' App folder : ' + OUT);
  console.log(' Run it     : ' + EXE);
  console.log(ok ? ' Send this  : ' + ZIP : ' (zip failed — right-click the app folder -> Send to -> Compressed folder)');
  console.log('==========================================================');
})().catch(e => fail(e && e.stack || String(e)));
