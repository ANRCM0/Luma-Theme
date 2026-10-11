import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {stagingOrigin,verifyThemeZip,stagingReadOnlySmoke} from '../scripts/staging-theme-preflight.mjs';

test('staging verifier refuses production or credential-bearing origins',()=>{
 for(const url of ['http://staging.example.test','https://prod.example.com','https://abc:pass@staging.example.test','https://staging.example.test/x','https://staging.example.test?token=secret'])
  assert.throws(()=>stagingOrigin(url));
 assert.equal(stagingOrigin('https://staging.example.test/'),'https://staging.example.test');
 assert.equal(stagingOrigin('http://127.0.0.1:1234/'),'http://127.0.0.1:1234');
});

test('installable Luma ZIP is checksum-checked and rejects tampering',()=>{
 const dir=mkdtempSync(join(tmpdir(),'luma-staging-'));
 try{
  mkdirSync(join(dir,'assets'));
  writeFileSync(join(dir,'config.json'),JSON.stringify({name:'vv-theme',version:'1.0.3'}));
  writeFileSync(join(dir,'dashboard.blade.php'),'<html></html>');
  writeFileSync(join(dir,'assets/index-a.js'),'console.log(1)');
  writeFileSync(join(dir,'assets/index-b.css'),'body{}');
  const zip=join(dir,'luma-theme.zip'),sha=join(dir,'luma-theme.zip.sha256');
  execFileSync('zip',['-q',zip,'config.json','dashboard.blade.php','assets/index-a.js','assets/index-b.css'],{cwd:dir});
  const digest=createHash('sha256').update(readFileSync(zip)).digest('hex');
  writeFileSync(sha,digest+'  luma-theme.zip\n');
  assert.equal(verifyThemeZip(zip,sha).version,'1.0.3');
  writeFileSync(sha,'0'.repeat(64)+'  luma-theme.zip\n');
  assert.throws(()=>verifyThemeZip(zip,sha),/SHA256/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('public staging smoke validates active Luma and rollback without writing payments',async()=>{
 let active='vv-theme';const calls=[];
 const server=createServer((req,res)=>{
  calls.push({method:req.method,url:req.url});
  res.setHeader('Content-Type',req.url.endsWith('.css')?'text/css':'application/json');
  if(req.url==='/txapi/health')res.end(JSON.stringify({data:{status:'ok'},request_id:'smoke'}));
  else if(req.url==='/txapi/public/site-config')res.end(JSON.stringify({data:{frontend_theme:active},request_id:'smoke'}));
  else if(req.url==='/')res.end(active==='vv-theme'?'<link href="/theme/vv-theme/assets/index-b.css"><script src="/theme/vv-theme/assets/index-a.js"></script>':'<html>TXBoard SPA</html>');
  else if(req.url.startsWith('/theme/vv-theme/assets/'))res.end('/* test */');
  else{res.statusCode=404;res.end('not found')}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const origin='http://127.0.0.1:'+server.address().port;
  assert.equal((await stagingReadOnlySmoke(origin,'vv-theme')).themeAssets,2);
  active='TXBoard';
  assert.equal((await stagingReadOnlySmoke(origin,'TXBoard')).themeAssets,0);
  assert.ok(calls.every(c=>c.method==='GET'));
  await assert.rejects(()=>stagingReadOnlySmoke(origin,'vv-theme'),/wrong theme/);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
