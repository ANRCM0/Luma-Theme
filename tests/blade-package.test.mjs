import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

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
 assert.match(workflow,/THEME_VERSION: '0\.9\.1'/);
});
