import test from 'node:test';
import assert from 'node:assert/strict';
import {safeWebUrl,safeImageUrl,removeSensitiveHashParam} from '../src/live/browser-safety.js';
import {safeExternal} from '../src/live/api.js';

test('untrusted outbound URLs reject insecure schemes, credentials, control characters and protocol-relative links',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,hi','file:///tmp/foo','//phishing.test','http://pay.example.test/order','https://user:password@pay.example.test/order','https://pay.example.test/\nlocation','https://pay.example.test\\@spoof.test', '', null]){
  assert.equal(safeExternal(value),null,String(value));
 }
 assert.equal(safeExternal('https://pay.example.test/order?payment=12'),'https://pay.example.test/order?payment=12');
 assert.equal(safeExternal('http://localhost:5050/checkout'),null);
 assert.equal(safeWebUrl('http://localhost:5050/checkout',{origin:'http://localhost:4173',allowHttpLoopback:true}),'http://localhost:5050/checkout');
 assert.equal(safeWebUrl('https://service.example.test/docs',{allowRelative:true}),'https://service.example.test/docs');
});

test('theme and notice images accept HTTPS CDN or safe relative paths, reject insecure remote HTTP',()=>{
 assert.equal(safeImageUrl('/img/logo.png','https://panel.example.test'),'https://panel.example.test/img/logo.png');
 assert.equal(safeImageUrl('/img/logo.png','http://localhost:4174'),'http://localhost:4174/img/logo.png');
 assert.equal(safeImageUrl('https://cdn.example.test/notice.png','https://panel.example.test'),'https://cdn.example.test/notice.png');
 for(const bad of ['http://remote.example.test/tracker.png','//remote.example.test/logo.png','data:image/svg+xml,evil','javascript:alert(1)','https://alice:secret@cdn.example.test/x.png']){
  assert.equal(safeImageUrl(bad,'https://panel.example.test'),null,bad);
 }
});

test('one-time token is removed from location hash while other login arguments are preserved',()=>{
 assert.equal(removeSensitiveHashParam('#/login?verify=SECRET&tab=register&code=ABC'),'#/login?tab=register&code=ABC');
 assert.equal(removeSensitiveHashParam('#/login?tab=register&code=ABC'),'#/login?tab=register&code=ABC');
 assert.equal(removeSensitiveHashParam('#/login?verify=SECRET'),'#/login');
 assert.equal(removeSensitiveHashParam('#/dashboard'),'#/dashboard');
});
