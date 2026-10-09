import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveImportClients,parseClientCatalog,makeCustomImport,PRESET_CLIENT_IDS} from '../src/live/client-catalog.js';
import {resolveAtomicConfig} from '../src/live/atomic-config.js';
import {readFileSync} from 'node:fs';

const source='https://panel.example.test/api/v1/client/subscribe?token=ABC%2B123';
const origin='https://panel.example.test';
const config=fields=>resolveAtomicConfig({frontend_theme:'vv-theme',theme_config:fields}).subscription;
const list=(fields,platform='windows',url=source)=>resolveImportClients({
 subscriptionUrl:url,title:'Luma',platform,origin,config:config(fields)
});

test('all built-in clients keep their existing verified import protocols by default',()=>{
 const win=list({});
 assert.deepEqual(win.map(c=>c.name),['Clash','Hiddify']);
 assert.ok(win[0].href.startsWith('clash://install-config?url='));
 assert.deepEqual(PRESET_CLIENT_IDS.length,9);
 assert.equal(list({},'ios').some(c=>c.name==='Shadowrocket'),true);
 assert.equal(list({},'android').some(c=>c.name==='Clash'),true);
 assert.equal(list({},'windows','bad://no-url').length,0);
});

test('nine independent icon URLs are validated and safe icons retain a letter fallback',()=>{
 const results=list({
  subscription_client_icon_clash:'https://cdn.example.test/clash.png',
  subscription_client_icon_hiddify:'/images/hiddify.webp',
  subscription_client_icon_sing_box:'javascript:alert(1)'
 });
 assert.equal(results[0].iconUrl,'https://cdn.example.test/clash.png');
 assert.equal(results[1].iconUrl,'https://panel.example.test/images/hiddify.webp');
 assert.equal(results[0].mark,'C');
 assert.equal(list({subscription_client_icon_clash:'http://evil.test/icon.png'})[0].iconUrl,null);
 assert.equal(config({subscription_client_icon_size:999}).clientIconSize,64);
 assert.equal(config({subscription_client_icon_size:0}).clientIconSize,22);
});

test('merge mode changes built-ins, disables selected clients, adds and sorts custom ones',()=>{
 const catalog=JSON.stringify([
  {id:'clash',enabled:false},
  {id:'hiddify',name:'Hiddify Next',iconUrl:'https://cdn.example.test/new.png',order:3},
  {id:'nova',name:'Nova',platforms:['windows','mac'],
   action:'scheme',template:'nova://import?url={urlEncoded}&name={nameEncoded}',
   iconUrl:'https://cdn.example.test/nova.svg',order:0},
  {id:'docs',name:'客户端下载',platforms:['windows'],action:'download',
   url:'https://example.test/download',order:-1}
 ]);
 const results=list({subscription_clients_json:catalog});
 assert.deepEqual(results.map(c=>c.name),['客户端下载','Nova','Hiddify Next']);
 assert.equal(results[0].kind,'download');
 assert.equal(results[0].href,'https://example.test/download');
 assert.ok(results[1].href.startsWith('nova://import?url='));
 assert.ok(results[1].href.includes(encodeURIComponent(source)));
 assert.equal(results[2].iconUrl,'https://cdn.example.test/new.png');
 assert.equal(results[2].href.startsWith('hiddify://'),true);
});

test('replace mode shows only explicitly included, supported platform clients',()=>{
 const catalog=JSON.stringify([
  {id:'hiddify',name:'Hiddify',platforms:['windows'],order:1},
  {id:'custom',name:'自定义客户端',platforms:['ios'],action:'download',url:'https://apps.example.test/app'}
 ]);
 const cfg={subscription_client_mode:'replace',subscription_clients_json:catalog};
 assert.deepEqual(list(cfg,'windows').map(c=>c.name),['Hiddify']);
 assert.deepEqual(list(cfg,'ios').map(c=>c.name),['自定义客户端']);
 assert.deepEqual(list(cfg,'android'),[]);
 assert.deepEqual(list({subscription_client_mode:'replace',subscription_clients_json:'[]'}),[]);
});

test('invalid configuration never clears known working defaults or creates unsafe actions',()=>{
 for(const raw of ['{','{"mode":"oops"}','[{"id":"x"},{"id":"x"}]']){
  assert.deepEqual(list({subscription_client_mode:'replace',subscription_clients_json:raw}).map(x=>x.name),['Clash','Hiddify']);
 }
 const malicious=JSON.stringify([
  {id:'fake-js',name:'Unsafe JS',platforms:['windows'],action:'scheme',template:'javascript://run?url={urlEncoded}'},
  {id:'fake-raw',name:'Unsafe URI',platforms:['windows'],action:'scheme',template:'nova://import?url={url}'},
  {id:'fake-http',name:'Unsafe download',platforms:['windows'],action:'download',url:'http://evil.test/download'},
  {id:'fine',name:'Okay',platforms:['windows'],action:'scheme',template:'nova://import?u={urlBase64}'}
 ]);
 const result=list({subscription_client_mode:'replace',subscription_clients_json:malicious});
 assert.deepEqual(result.map(c=>c.name),['Okay']);
 assert.equal(result[0].href.startsWith('nova://'),true);
 assert.equal(makeCustomImport('file:///import?url={urlEncoded}',source,'Luma'),null);
 assert.equal(makeCustomImport('nova://import?url={url}',source,'Luma'),null);
 assert.equal(parseClientCatalog(JSON.stringify(Array.from({length:25},(_,i)=>({id:'c'+i})))),null);
});

test('HTTPS download can be shown without a subscription, but must never receive credentials',()=>{
 const json=JSON.stringify([{id:'app',name:'官网客户端',platforms:['android'],action:'download',url:'https://example.test/download'}]);
 const clients=list({subscription_clients_json:json},'android',null);
 assert.deepEqual(clients.map(c=>c.name),['官网客户端']);
 assert.equal(clients[0].href,'https://example.test/download');
 assert.equal(clients[0].href.includes('token='),false);
});

test('theme settings register catalog, icon size and independent image fields',()=>{
 const build=readFileSync(new URL('../scripts/package-txboard.mjs',import.meta.url),'utf8');
 for(const key of ['subscription_client_mode','subscription_clients_json','subscription_client_icon_size',
 ...PRESET_CLIENT_IDS.map(id=>'subscription_client_icon_'+id.replaceAll('-','_'))]){
  assert.ok(build.includes('"field_name":"'+key+'"'),key+' missing from manifest');
  assert.ok(build.includes('$theme_config[\\\"'+key+'\\\"]'),key+' missing from Blade fallback');
 }
});
