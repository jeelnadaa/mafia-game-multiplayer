#!/usr/bin/env node
/**
 * run-next.js — exFAT-safe Next.js launcher.
 *
 * On exFAT (common on Windows D: drives), failed builds can leave "phantom"
 * directories inside .next/ that reject all I/O with EPERM. This script:
 *
 *  For `build` / `dev`:
 *    Probes .next → .next2 → .next3 … for a writable directory.
 *
 *  For `start`:
 *    Probes .next → .next2 → .next3 … for a directory that contains BUILD_ID.
 *
 * The chosen directory is exported as NEXT_DIST_DIR, which next.config.mjs
 * reads to set distDir.
 */
require('./patch-exfat.js');

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const root = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const command = args[0]; // 'dev', 'build', 'start', 'lint', etc.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Can we create files inside dir/types/? (The exact path Next.js writes to.) */
function isWritable(dir) {
  try { fs.statSync(dir); } catch (e) {
    return e.code === 'ENOENT'; // doesn't exist yet → fine, Next will create it
  }

  const typesDir = path.join(dir, 'types');
  const routesFile = path.join(typesDir, 'routes.d.ts');

  // Probe specifically for exFAT phantom locked routes.d.ts (must be openable with 'w')
  try {
    fs.mkdirSync(typesDir, { recursive: true });
    const openFn = fs.rawOpenSync || fs.openSync;
    const fd = openFn(routesFile, 'w');
    fs.closeSync(fd);
    try { fs.unlinkSync(routesFile); } catch (__) {}
  } catch (_) {
    return false;
  }

  const probeFile = path.join(typesDir, '__probe_' + Date.now() + '.tmp');
  try {
    fs.mkdirSync(typesDir, { recursive: true });
    fs.writeFileSync(probeFile, 'ok');
    fs.unlinkSync(probeFile);
    return true;
  } catch (_) {
    // Try nuking via cmd.exe (sometimes works when Node can't on exFAT)
    if (process.platform === 'win32') {
      try {
        execSync(`cmd /c rd /s /q "${dir}"`, { stdio: 'ignore', timeout: 5000 });
      } catch (__) { /* ignore */ }
      try { fs.statSync(dir); return false; } catch (e2) {
        return e2.code === 'ENOENT';
      }
    }
    return false;
  }
}

/** Does dir contain a valid production build (BUILD_ID file)? */
function hasBuild(dir) {
  try {
    fs.accessSync(path.join(dir, 'BUILD_ID'), fs.constants.R_OK);
    return true;
  } catch (_) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Choose the right distDir
// ---------------------------------------------------------------------------

function findDistDir() {
  const candidates = ['.next'];
  for (let i = 2; i <= 20; i++) candidates.push(`.next${i}`);

  if (command === 'start') {
    // For `start`, find an existing build.
    for (const name of candidates) {
      const dir = path.join(root, name);
      if (hasBuild(dir)) return name;
    }
    // No build found anywhere — fall through to '.next' so Next prints its
    // standard "no production build" error message.
    return '.next';
  }

  // For `build`, `dev`, `lint` — find a writable directory.
  for (const name of candidates) {
    const dir = path.join(root, name);
    if (isWritable(dir)) return name;
  }

  // Last resort
  return '.nextbuild';
}

const distDir = findDistDir();

if (distDir !== '.next') {
  const action = command === 'start' ? 'Found build in' : 'Using';
  console.warn(
    `\x1b[33m⚠  .next/ is corrupted (exFAT phantom dir). ${action} ${distDir}/\x1b[0m\n` +
    `   To reclaim space, reboot and delete the .next/ folder manually.\n`
  );
}

process.env.NEXT_DIST_DIR = distDir;
require('next/dist/bin/next');
