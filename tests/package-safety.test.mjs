import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdirSync,rmSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// P1: The packaging script must validate BEFORE any destructive step.
// A failed run must leave theme-package/ byte-identical.

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const distDir = fileURLToPath(new URL('../dist', import.meta.url));
const distHtmlPath = fileURLToPath(new URL('../dist/index.html', import.meta.url));
const themePackage = new URL('../theme-package/', import.meta.url);

// A dist whose asset paths are NOT under /theme/vv-theme/assets/. The guard
// must reject this before it copies or removes anything.
const BAD_DIST_HTML =
  '<!doctype html><html lang="zh-CN"><head>' +
  '<script type="module" crossorigin src="/assets/index-DEADBEEF.js"></script>' +
  '<link rel="stylesheet" crossorigin href="/assets/index-DEADBEEF.css">' +
  '</head><body><div id="root"></div></body></html>';

test('package-txboard.mjs validates asset paths before any destructive step', () => {
  const source = readFileSync(new URL('../scripts/package-txboard.mjs', import.meta.url), 'utf8');
  const validateIdx = source.indexOf("throw Error('Unexpected Vite asset paths')");
  const rmIdx = source.indexOf('rmSync(out');
  const cpIdx = source.indexOf("cpSync('dist/assets'");
  assert.ok(validateIdx > 0, 'validation guard must exist');
  assert.ok(rmIdx === -1 || validateIdx < rmIdx, 'validation must run before rmSync on output');
  assert.ok(cpIdx === -1 || validateIdx < cpIdx, 'validation must run before cpSync to output');
});

test('package-txboard.mjs uses atomic staging (no direct write to theme-package/)', () => {
  const source = readFileSync(new URL('../scripts/package-txboard.mjs', import.meta.url), 'utf8');
  assert.match(source, /mkdtempSync/, 'must create a staging directory');
  assert.match(source, /renameSync\(staging/, 'must atomically swap staging into place');
  assert.doesNotMatch(source, /writeFileSync\(join\(out,/, 'must not write directly to output dir');
});

// This test must be hermetic: CI runs `npm test` on a clean checkout BEFORE
// `npm run build`, so dist/ does not exist. It synthesises its own bad dist
// instead of depending on a prior build, and restores whatever it found.
test('package-txboard.mjs leaves theme-package/ byte-identical when guard fires', () => {
  // Discover the tracked artifacts from the tree instead of hard-coding
  // content hashes: Vite renames them on any source edit, so a literal list
  // turns a legitimate rebuild into a test failure.
  const assetsDir = fileURLToPath(new URL('../theme-package/assets', import.meta.url));
  const files = [
    'dashboard.blade.php',
    'config.json',
    ...readdirSync(assetsDir).map((name) => 'assets/' + name),
  ];
  assert.ok(files.some((f) => f.endsWith('.js')), 'theme-package must ship a JS bundle');
  assert.ok(files.some((f) => f.endsWith('.css')), 'theme-package must ship a CSS bundle');

  const before = {};
  for (const f of files) {
    before[f] = readFileSync(new URL(f, themePackage), 'utf8');
  }

  const hadDistDir = existsSync(distDir);
  const hadDistHtml = existsSync(distHtmlPath);
  const originalHtml = hadDistHtml ? readFileSync(distHtmlPath, 'utf8') : null;

  try {
    mkdirSync(distDir, {recursive: true});
    writeFileSync(distHtmlPath, BAD_DIST_HTML);

    let threw = false;
    try {
      execFileSync('node', ['scripts/package-txboard.mjs'], {cwd: rootDir, stdio: 'pipe'});
    } catch {
      threw = true;
    }
    assert.ok(threw, 'script must throw on bad dist');

    for (const f of files) {
      const after = readFileSync(new URL(f, themePackage), 'utf8');
      assert.equal(after, before[f], `theme-package/${f} must be byte-identical after failed run`);
    }

    const strays = readdirSync(rootDir).filter(
      (name) => name.startsWith('.staging-') || name.startsWith('.theme-package.backup-'),
    );
    assert.deepEqual(strays, [], 'a failed run must not leave staging/backup directories behind');
  } finally {
    if (originalHtml !== null) {
      writeFileSync(distHtmlPath, originalHtml);
    } else {
      rmSync(distHtmlPath, {force: true});
      if (!hadDistDir) rmSync(distDir, {recursive: true, force: true});
    }
  }
});
