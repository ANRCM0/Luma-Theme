import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/tokens.css',import.meta.url),'utf8');
const root=css.match(/:root\s*\{([^}]*)\}/)?.[1]||'';
function color(token){
 const escaped=token.replaceAll('-', '\\-');
 const found=root.match(new RegExp(''+escaped+'\\s*:\\s*(#[0-9a-f]{6})','i'));
 assert.ok(found,'Missing root color token: '+token);
 return found[1];
}
function luminance(hex){
 const rgb=[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255);
 const [r,g,b]=rgb.map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
 return r*0.2126+g*0.7152+b*0.0722;
}
function contrast(a,b){
 const x=luminance(a),y=luminance(b);
 return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}

test('light theme accent and small supporting labels pass WCAG AA normal text contrast',()=>{
 for(const foreground of ['--color-accent','--color-text-muted','--color-text-subtle']){
  for(const background of ['--color-surface','--color-surface-sunken']){
   const actual=contrast(color(foreground),color(background));
   assert.ok(actual>=4.5,foreground+' on '+background+' is '+actual.toFixed(2)+':1');
  }
 }
});
