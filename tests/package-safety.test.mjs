import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

// P1: The packaging script must validate BEFORE any destructive step.
// A failed run must leave theme-package/ byte-identical.

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

test('package-txboard.mjs leaves theme-package/ byte-identical when guard fires', async () => {
  const distPath = new URL('../dist/index.html', import.meta.url);
  const originalHtml = readFileSync(distPath, 'utf8');
  const badHtml = originalHtml.replace(/\/theme\/vv-theme\/assets\//g, '/assets/');

  const files = ['dashboard.blade.php', 'config.json', 'assets/index-CwYnklBj.js', 'assets/index-CzLWBJgw.css'];
  const before = {};
  for (const f of files) {
    before[f] = readFileSync(new URL('../theme-package/' + f, import.meta.url), 'utf8');
  }

  try {
    writeFileSync(distPath, badHtml);
    let threw = false;
    try {
      execFileSync('node', ['scripts/package-txboard.mjs'], {cwd: new URL('..', import.meta.url), stdio: 'pipe'});
    } catch {
      threw = true;
    }
    assert.ok(threw, 'script must throw on bad dist');

    for (const f of files) {
      const after = readFileSync(new URL('../theme-package/' + f, import.meta.url), 'utf8');
      assert.equal(after, before[f], `theme-package/${f} must be byte-identical after failed run`);
    }
  } finally {
    writeFileSync(distPath, originalHtml);
  }
});
