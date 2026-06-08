// sync-public.js
// Watches root .html / .css / .js files and auto-copies them to public/
// Run via: node sync-public.js  (or through npm run sync)

const fs   = require('fs');
const path = require('path');

const ROOT   = __dirname;
const PUBLIC = path.join(__dirname, 'public');

// File types to sync
const WATCH_EXT = new Set(['.html', '.css', '.js']);

// Files that live in the root but should NOT be copied to public/
const EXCLUDE = new Set([
  'worker.js',
  'sync-public.js',
  'mockData.js',   // only needed if you have a public copy already
]);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function shouldSync(filename) {
  if (!filename) return false;
  if (EXCLUDE.has(filename)) return false;
  return WATCH_EXT.has(path.extname(filename));
}

function syncFile(filename) {
  const src  = path.join(ROOT, filename);
  const dest = path.join(PUBLIC, filename);

  try {
    if (!fs.existsSync(src)) return; // might be a delete event
    fs.copyFileSync(src, dest);
    const now = new Date().toLocaleTimeString('ro-RO');
    console.log(`\x1b[36m[sync]\x1b[0m ${now}  ${filename}  →  public/${filename}`);
  } catch (err) {
    console.error(`\x1b[31m[sync] ERROR copying ${filename}:\x1b[0m`, err.message);
  }
}

// ─────────────────────────────────────────────
// Initial full sync on startup
// ─────────────────────────────────────────────
function initialSync() {
  const files = fs.readdirSync(ROOT).filter(shouldSync);
  files.forEach(syncFile);
  console.log(`\x1b[32m[sync]\x1b[0m Initial sync done — ${files.length} file(s) copied to public/`);
}

// ─────────────────────────────────────────────
// Watch loop
// ─────────────────────────────────────────────
initialSync();

fs.watch(ROOT, { persistent: true }, (event, filename) => {
  if (shouldSync(filename)) {
    syncFile(filename);
  }
});

console.log('\x1b[32m[sync]\x1b[0m Watching root for changes (html, css, js)... Press Ctrl+C to stop.\n');
