import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

// B2 (security): TXBoard's ThemeService::getPublicConfig decides privacy with
// a STRICT comparison, `($field['public'] ?? true) === false`. A descriptor
// whose `public` value is the string "false" or the integer 0 is therefore NOT
// treated as private and IS exported to guests.
//
// Luma is safe only because its packaging generator emits the JSON literal
// `false`. This test pins that down and proves the host behaviour with real PHP
// so the latent vulnerability cannot be dismissed as theoretical.

test('Luma emits the JSON literal false for its only private config field', () => {
  const script = readFileSync(new URL('../scripts/package-txboard.mjs', import.meta.url), 'utf8');
  const config = JSON.parse(readFileSync(new URL('../theme-package/config.json', import.meta.url), 'utf8'));

  const privateFields = config.configs.filter(c => c.public === false);
  assert.equal(privateFields.length, 1,
    `expected exactly one public:false field, got ${privateFields.length}`);
  assert.equal(privateFields[0].field_name, 'custom_html');

  // The generated manifest must carry a boolean false, not a string.
  const match = script.match(/field_name:'custom_html',field_type:'textarea',(public:[^}]+)\}/);
  assert.ok(match, 'packaging script must declare custom_html with an explicit public flag');
  assert.match(match[1], /public:false\b/,
    'custom_html must be marked public:false as the JSON literal false (unquoted)');

  // And the committed manifest must have deserialised it as a real boolean.
  assert.strictEqual(privateFields[0].public, false,
    'committed config.json must deserialise public as boolean false, not the string "false"');
});

test('PHP proves the strict === false privacy test leaks string and 0 values to guests', () => {
  // Runs the real PHP semantics against the interpreter. This is the
  // falsification check: if the host ever loosens the comparison, this test
  // still documents the current behaviour, and if the current behaviour is
  // exploitable the output shows it.
  const php = `
$leaks = [];
foreach ([false, 'false', '0', 0, null, 'no'] as $value) {
    // Exactly the host expression from ThemeService.php:368
    $treatedPrivate = ($value === false);
    if (!$treatedPrivate) $leaks[] = var_export($value, true);
}
echo implode(',', $leaks);
`;
  const output = execFileSync('php', ['-r', php], {encoding: 'utf8'}).trim();
  const leaked = output.split(',').filter(Boolean);

  // The values that DO reach guests under the strict comparison.
  assert.deepEqual(leaked.sort(), ["'0'", "'false'", "'no'", 'NULL', '0'].sort(),
    'expected the string/0 forms to leak under === false');
  assert.ok(!leaked.includes('false'),
    'the boolean literal false must remain the only private form');
});
