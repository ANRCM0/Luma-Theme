import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveThemeAppearance,safeThemeBackground} from '../src/live/theme-config.js';

test('new TXBoard public theme_config overrides legacy Blade appearance',()=>{
 const theme=resolveThemeAppearance(
  {frontend_theme:'vv-theme',theme_config:{theme_color:'blue',background_url:'/images/welcome.webp'}},
  {theme:{color:'default'},background_url:'https://old.test/login.png'},
  'https://panel.example.test'
 );
 assert.deepEqual(theme,{color:'blue',backgroundUrl:'https://panel.example.test/images/welcome.webp'});
});

test('new theme_config intentionally clears stale values rather than restoring the old theme',()=>{
 const theme=resolveThemeAppearance(
  {frontend_theme:'vv-theme',theme_config:{theme_color:'default',background_url:''}},
  {theme:{color:'blue'},background_url:'https://old.test/login.png'},
  'https://panel.example.test'
 );
 assert.deepEqual(theme,{color:'default',backgroundUrl:''});
});

test('previous TXBoard versions retain Blade-provided colors and login background',()=>{
 const theme=resolveThemeAppearance({app_name:'Legacy'},{theme:{color:'darkblue'},background_url:'https://cdn.example.test/login.webp'},'https://panel.example.test');
 assert.deepEqual(theme,{color:'darkblue',backgroundUrl:'https://cdn.example.test/login.webp'});
});

test('a different active theme cannot inject its theme settings into vv-theme',()=>{
 const theme=resolveThemeAppearance(
  {frontend_theme:'TXBoard',theme_config:{theme_color:'black',background_url:'https://unrelated.test/image'}},
  {theme:{color:'default'},background_url:''},'https://panel.example.test'
 );
 assert.deepEqual(theme,{color:'default',backgroundUrl:''});
});

test('unsupported theme colors and non-web background schemes are rejected',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,hello','file:///etc/passwd','http://[','']){
  assert.equal(safeThemeBackground(url,'https://panel.example.test'),'');
 }
 const theme=resolveThemeAppearance({frontend_theme:'vv-theme',theme_config:{theme_color:'url(javascript:1)',background_url:'javascript:alert(1)'}},{},'https://panel.example.test');
 assert.deepEqual(theme,{color:'default',backgroundUrl:''});
});

test('custom HTML is non-public in the theme package and package version advances',()=>{
 const src=readFileSync(new URL('../scripts/package-txboard.mjs',import.meta.url),'utf8');
 assert.match(src,/field_name:'custom_html',field_type:'textarea',public:false/);
 assert.match(src,/THEME_VERSION\|\|'0\.5\.0'/);
});
