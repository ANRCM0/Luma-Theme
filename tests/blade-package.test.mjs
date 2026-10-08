import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

test('packaged Blade has no comma-sensitive @json directives and uses HTML-safe JSON encoding',()=>{
 const source=readFileSync(new URL('../scripts/package-txboard.mjs',import.meta.url),'utf8');
 const blade=source.split("const blade='")[1]?.split("\nwriteFileSync(")[0];
 assert.ok(blade?.length>1000,'must find the dashboard Blade template');
 assert.doesNotMatch(blade,/@json\s*\(/,'@json directive must not appear in packaged inline JS');
 assert.match(blade,/items:\{!! json_encode\(\$theme_config\["nav_items"\] \?\? "dashboard,shop,profile,ticket,menu,!orders", JSON_HEX_TAG \| JSON_HEX_APOS \| JSON_HEX_AMP \| JSON_HEX_QUOT\) !!\}/);
 const encoders=blade.match(/\{!! json_encode\(/g)||[];
 assert.ok(encoders.length>=32,'all existing theme settings must use safe JSON encoding');
 assert.equal((blade.match(/JSON_HEX_TAG \| JSON_HEX_APOS \| JSON_HEX_AMP \| JSON_HEX_QUOT/g)||[]).length,encoders.length);
 assert.match(source,/THEME_VERSION\|\|'0\.9\.1'/);
});

test('GitHub theme package must pass real Laravel Blade compilation before creating ZIP',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/txboard-theme.yml',import.meta.url),'utf8');
 const validate=workflow.indexOf('Compile and render packaged Blade template');
 const zip=workflow.indexOf('Create installable ZIP');
 assert.ok(validate>0 && zip>validate,'Blade validation must run before ZIP and artifact publish');
 assert.match(workflow,/php-version: '8\.2'/);
 assert.match(workflow,/illuminate\/view:\^12\.0/);
});

test('tagged builds publish checked theme ZIP and checksum as a GitHub Release',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/txboard-theme.yml',import.meta.url),'utf8');
 assert.match(workflow,/tags:\s*\n\s+- 'v\*'/);
 assert.doesNotMatch(workflow,/branches:\s*\[main\]/,'release build should be driven by tags rather than every main push');
 assert.match(workflow,/Resolve version from tag/);
 assert.match(workflow,/THEME_VERSION=\$version/);
 assert.match(workflow,/Check packaged version/);
 assert.match(workflow,/contents: write/);
 assert.match(workflow,/npm test/);
 assert.match(workflow,/softprops\/action-gh-release@v2/);
 assert.match(workflow,/github\.event_name == 'push'/);
 assert.match(workflow,/generate_release_notes: true/);
 assert.match(workflow,/luma-theme\.zip\.sha256/);
 assert.ok(workflow.indexOf('Check packaged version')<workflow.indexOf('Publish GitHub Release'));
 assert.ok(workflow.indexOf('Compile and render packaged Blade template')<workflow.indexOf('Publish GitHub Release'));
});

test('GitHub Pages deploy workflow is removed; frontend CI remains',()=>{
 assert.equal(existsSync(new URL('../.github/workflows/pages.yml',import.meta.url)),false);
 assert.equal(existsSync(new URL('../.github/workflows/ci.yml',import.meta.url)),true);
});
