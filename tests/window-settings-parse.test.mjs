import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// The packaged Blade injects window.settings as a JavaScript OBJECT LITERAL.
// A brace imbalance there is a SyntaxError that silently disables every
// config fallback in the browser, while both the PHP lint gate and the
// string-assertion gate still pass. Assert the emitted script is parseable.
function packagedBladeSource() {
  const source = readFileSync(new URL('../scripts/package-txboard.mjs', import.meta.url), 'utf8');
  const blade = source.split("const blade='")[1]?.split("\nwriteFileSync(")[0];
  assert.ok(blade?.length > 1000, 'must find the dashboard Blade template');
  return blade;
}

// Render the template the way Blade does, with every directive collapsed to a
// JavaScript string literal so the surrounding object syntax can be parsed.
function renderSettingsSource(blade) {
  const rendered = blade
    .replace(/\{!![\s\S]*?!!\}/g, '"__blade__"')
    .replace(/\{\{[\s\S]*?\}\}/g, '"__blade__"');
  const start = rendered.indexOf('window.settings=');
  assert.ok(start >= 0, 'window.settings must be present in the packaged Blade');
  const end = rendered.indexOf(';</script>', start);
  assert.ok(end > start, 'window.settings must terminate before </script>');
  return {rendered, objectSource: rendered.slice(start + 'window.settings='.length, end)};
}

test('packaged window.settings is a brace-balanced JavaScript object literal', () => {
  const {objectSource} = renderSettingsSource(packagedBladeSource());
  const open = (objectSource.match(/\{/g) || []).length;
  const close = (objectSource.match(/\}/g) || []).length;
  assert.equal(
    open, close,
    `window.settings object braces are unbalanced (open=${open} close=${close}); ` +
    'an extra closing brace makes the whole inline script a SyntaxError',
  );
});

test('packaged window.settings parses as real JavaScript and exposes every settings group', () => {
  const {rendered, objectSource} = renderSettingsSource(packagedBladeSource());

  // Parse exactly what the browser will parse.
  const context = {window: {}};
  vm.createContext(context);
  assert.doesNotThrow(
    () => vm.runInContext(`window.settings=${objectSource};`, context),
    'window.settings must be valid JavaScript',
  );

  const settings = context.window.settings;
  for (const key of [
    'title', 'assets_path', 'version', 'description', 'logo', 'theme',
    'background_url', 'navigation', 'payment', 'subscriptionCenter',
    'catalog', 'welcome', 'notice', 'atomic',
  ]) {
    assert.ok(key in settings, `window.settings.${key} must be present`);
  }

  // The comma-bearing navigation default is the case the template comments warn
  // about. Collapsing replaces the directive, so assert it against the template
  // source the same way the PHP smoke test does.
  assert.match(
    packagedBladeSource(),
    /items:\{!! json_encode\(\$theme_config\["nav_items"\] \?\? "dashboard,shop,profile,ticket,menu,!orders"/,
    'comma-separated navigation default must be present and intact in the template',
  );

  // The closing tag must come after the object, not inside it.
  assert.ok(
    rendered.indexOf(';</script>', rendered.indexOf('window.settings=')) > 0,
    'window.settings must be closed before </script>',
  );
});

test('packaged Blade keeps the raw custom_html escape hatch out of window.settings', () => {
  const blade = packagedBladeSource();
  // custom_html is rendered after the settings script, never inside it.
  const {rendered} = renderSettingsSource(blade);
  const objectSource = rendered.slice(rendered.indexOf('window.settings='));
  assert.doesNotMatch(
    objectSource.split(';</script>')[0],
    /custom_html/,
    'custom_html is server-only and must not be embedded in window.settings',
  );
});
