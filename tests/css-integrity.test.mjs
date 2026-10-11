import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// A dangling selector at the end of components.css made the Vite CSS
// minifier report "Unexpected @media" in the next imported stylesheet.
test('stylesheet sources end with a complete rule', () => {
  for (const name of ['tokens', 'base', 'components', 'responsive']) {
    const css = readFileSync(new URL(`../src/${name}.css`, import.meta.url), 'utf8').trimEnd();
    assert.ok(css.endsWith('}'), `${name}.css ends with an unfinished CSS rule`);
  }
});
