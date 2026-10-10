import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

// P2: Every config key referenced by the theme's own code must exist in
// theme-package/config.json. This prevents the "phantom field" class of drift
// where code reads a key the manifest never declares, so the value silently
// falls through to a hard-coded default and the admin switch does nothing.
//
// The canonical instance was `shop_show_savings`, read by src/live/catalog.js
// while config.json only ever declared `shop_year_savings_visible`.
//
// The guard only inspects STATIC references. Keys assembled at runtime
// (e.g. flag('page_'+page+'_visible') or
// pick('subscription_client_icon_'+id)) cannot be checked here; their
// fragments are covered by the sibling tests that enumerate the concrete
// page and client identifiers.

function listSourceFiles(dir) {
  const dirPath = typeof dir === 'string' ? dir : fileURLToPath(dir);
  const results = [];
  for (const entry of readdirSync(dirPath)) {
    const full = join(dirPath, entry);
    if (statSync(full).isDirectory()) {
      results.push(...listSourceFiles(full));
    } else if (['.js', '.jsx', '.mjs', '.ts', '.tsx'].includes(extname(full))) {
      results.push(full);
    }
  }
  return results;
}

// Returns [key, file] for every STATIC snake_case config key referenced.
function extractReferencedKeys(source) {
  const keys = [];
  // snake_case only: at least one underscore, so camelCase JS aliases such as
  // showSavings or defaultPeriod are not treated as manifest field names.
  const snake = '[a-z][a-z0-9_]*_[a-z0-9_]*';
  const record = (key, index) => {
    // Skip keys that are the PREFIX of a runtime-concatenated expression such
    // as flag('page_'+page+'_visible') or
    // pick('subscription_client_icon_'+id.replaceAll('-','_')). The literal
    // ends immediately after the captured key, so the next characters are the
    // closing quote followed by '+'. Those concrete keys are covered by the
    // enumeration tests for pages and client icons.
    const after = source.slice(index + key.length, index + key.length + 3);
    if (/^['"]\s*\+/.test(after)) return;
    keys.push([key, index]);
  };
  // Capture-group offsets: m.index is the start of the WHOLE match, so locate
  // the captured key inside it to get the index right after the key itself.
  const captureIndex = (m) => m.index + m[0].indexOf(m[1]);
  // 1. source.<key>   — direct property access on a config object
  for (const m of source.matchAll(new RegExp('\\bsource\\.(' + snake + ')(?![+\\w])', 'gi'))) record(m[1], captureIndex(m));
  // 2. source['<key>'] / source["<key>"]
  for (const m of source.matchAll(new RegExp("\\bsource\\['(" + snake + ")'\\]", 'gi'))) record(m[1], captureIndex(m));
  for (const m of source.matchAll(new RegExp('\\bsource\\["(' + snake + ')"\\]', 'gi'))) record(m[1], captureIndex(m));
  // 3. $theme_config["<key>"] — the packaged Blade template
  for (const m of source.matchAll(new RegExp('\\$theme_config\\[["\'](' + snake + ')["\']\\]', 'gi'))) record(m[1], captureIndex(m));
  // 4. pick('<key>',...) / flag('<key>',...) — the atomic-config resolvers
  for (const m of source.matchAll(new RegExp('\\b(?:pick|flag)\\([\'"](' + snake + ')[\'"]', 'gi'))) record(m[1], captureIndex(m));
  return keys;
}

// Keys whose references are already fixed in a sibling worktree but not yet
// merged here. Each entry is a TEMPORARY exemption: the entry self-invalidates
// (and the test fails demanding cleanup) once the upstream fix lands.
// Coordination note for the catalog.js owner: ws-b already reads
// `shop_year_savings_visible`; when that change merges, delete the entry below.
const PENDING_SIBLING_FIXES = new Map([
  ['shop_show_savings', 'src/live/catalog.js — fixed in ws-b, pending merge'],
]);

function collectReferences() {
  const srcDir = new URL('../src/', import.meta.url);
  const scriptsDir = new URL('../scripts/', import.meta.url);
  const files = [...listSourceFiles(srcDir), ...listSourceFiles(scriptsDir)];
  const referenced = new Map(); // key -> Set<file>
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const [key] of extractReferencedKeys(source)) {
      if (!referenced.has(key)) referenced.set(key, new Set());
      referenced.get(key).add(file);
    }
  }
  return referenced;
}

test('every config key referenced by theme code exists in config.json', () => {
  const config = JSON.parse(readFileSync(new URL('../theme-package/config.json', import.meta.url), 'utf8'));
  const declared = new Set(config.configs.map(c => c.field_name));

  const referenced = collectReferences();
  assert.ok(referenced.size > 30, `expected a substantial referenced-key set, got ${referenced.size}`);

  const missing = [];
  for (const [key, files] of referenced) {
    if (declared.has(key)) continue;
    if (PENDING_SIBLING_FIXES.has(key)) continue;
    missing.push(`${key} (referenced in: ${[...files].map(f => f.split('/').slice(-2).join('/')).join(', ')})`);
  }

  assert.deepEqual(missing, [],
    `Config keys referenced by theme code but NOT declared in config.json:\n  ${missing.join('\n  ')}`);
});

test('pending sibling-fix exemptions are still needed', () => {
  // Once the sibling fix merges, the key stops being referenced and this test
  // fails, forcing the exemption above to be deleted. The guard never silently
  // rots into a permanent allowlist.
  const referenced = collectReferences();
  for (const [key, note] of PENDING_SIBLING_FIXES) {
    assert.equal(referenced.has(key), true,
      `Exemption for "${key}" is no longer needed (${note}); delete it from PENDING_SIBLING_FIXES.`);
  }
});

test('the packaged Blade reads the declared savings switch, not the phantom one', () => {
  // Regression lock for the specific phantom field. config.json declares
  // shop_year_savings_visible; the packaged Blade must read that same key so
  // the admin switch actually reaches the shop.
  const config = JSON.parse(readFileSync(new URL('../theme-package/config.json', import.meta.url), 'utf8'));
  const declared = new Set(config.configs.map(c => c.field_name));

  assert.equal(declared.has('shop_year_savings_visible'), true,
    'config.json must declare shop_year_savings_visible');
  assert.equal(declared.has('shop_show_savings'), false,
    'shop_show_savings must not be declared in config.json (it is a phantom field)');

  const blade = readFileSync(new URL('../scripts/package-txboard.mjs', import.meta.url), 'utf8');
  const savingsRead = blade.match(/showSavings:\{!! json_encode\(\$theme_config\["([a-z_]+)"\]/);
  assert.ok(savingsRead, 'packaged Blade must expose a showSavings value from theme_config');
  assert.equal(savingsRead[1], 'shop_year_savings_visible',
    `packaged Blade must read the declared key shop_year_savings_visible, got ${savingsRead[1]}`);
});
