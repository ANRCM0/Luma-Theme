// Read-only Luma staging preflight. No login, payment creation or admin writes.
import {readFileSync} from 'node:fs';
import {basename} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export function stagingOrigin(raw) {
 const u=new URL(raw);
 const local=['localhost','127.0.0.1','[::1]'].includes(u.hostname);
 if((u.protocol!=='https:'&&!local)||!['https:','http:'].includes(u.protocol))throw Error('Remote staging requires HTTPS');
 if(u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Staging origin must not contain secrets, path, query or hash');
 if(!local&&!/(?:staging|stage|test|dev)/i.test(u.hostname))throw Error('Host must be visibly labeled staging/test/dev; this tool refuses unlabelled production hosts');
 return u.origin;
}

export function verifyThemeZip(zipPath,shaPath){
 const file=readFileSync(zipPath);
 if(file.length>20*1024*1024||!file.length)throw Error('Invalid or oversized theme package');
 const digest=createHash('sha256').update(file).digest('hex');
 const lines=readFileSync(shaPath,'utf8').trim().split(/\r?\n/);
 if(lines.length!==1)throw Error('Expected one SHA256 entry');
 const parts=lines[0].match(/^([0-9a-f]{64})\s+\*?(\S+)$/i);
 if(!parts||parts[2]!==basename(zipPath)||parts[1].toLowerCase()!==digest)throw Error('ZIP SHA256 check failed');
 const names=execFileSync('unzip',['-Z','-1',zipPath],{encoding:'utf8'}).trim().split(/\r?\n/);
 if(names.some(n=>!n||n.startsWith('/')||n.includes('\\')||n.split('/').includes('..'))||new Set(names).size!==names.length)
  throw Error('Unsafe or duplicate ZIP entries');
 if(!names.includes('config.json')||!names.includes('dashboard.blade.php')||
    !names.some(n=>/^assets\/[^/]+\.js$/.test(n))||!names.some(n=>/^assets\/[^/]+\.css$/.test(n)))
  throw Error('Missing installable theme files');
 const config=JSON.parse(execFileSync('unzip',['-p',zipPath,'config.json'],{encoding:'utf8'}));
 if(config.name!=='vv-theme'||typeof config.version!=='string')throw Error('Unexpected theme ID/version in ZIP');
 return {version:config.version,sha256:digest,entries:names.length};
}

async function publicGet(origin,path){
 const response=await fetch(origin+path,{headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(15_000)});
 if(response.status!==200)throw Error('Public staging GET '+path+' returned '+response.status);
 const data=await response.text();
 if(data.length>2_000_000)throw Error('Oversized public response');
 return data;
}

export async function stagingReadOnlySmoke(origin,expected){
 if(!['vv-theme','TXBoard'].includes(expected))throw Error('Expected theme must be vv-theme or TXBoard');
 const [healthText,configText,html]=await Promise.all([
  publicGet(origin,'/txapi/health'),
  publicGet(origin,'/txapi/public/site-config'),
  publicGet(origin,'/')
 ]);
 const health=JSON.parse(healthText),config=JSON.parse(configText);
 if(health?.data?.status!=='ok'||!config?.data||typeof config.data!=='object')
  throw Error('Unexpected TXAPI public response');
 if(config.data.frontend_theme!==expected)throw Error('Site config reports wrong theme');
 const refs=[...html.matchAll(/(?:src|href)="(\/theme\/vv-theme\/assets\/[^"]+\.(?:css|js))"/g)].map(m=>m[1]);
 if(expected==='vv-theme'){
  if(!refs.some(n=>n.endsWith('.js'))||!refs.some(n=>n.endsWith('.css')))throw Error('Luma entry does not link theme assets');
  for(const asset of refs){
   if(!/^\/theme\/vv-theme\/assets\/[a-zA-Z0-9_.-]+\.(?:css|js)$/.test(asset))
    throw Error('Unexpected theme asset path');
   await publicGet(origin,asset);
  }
 }else if(refs.length)throw Error('Default TXBoard root still refers to Luma assets after rollback');
 return {mode:expected,health:'ok',publicConfig:'ok',root:'ok',themeAssets:refs.length};
}
async function main(){
 const [zip,sha,rawOrigin,expected]=process.argv.slice(2);
 if(!zip||!sha||!rawOrigin||!expected)throw Error('Usage: node scripts/staging-theme-preflight.mjs luma-theme.zip luma-theme.zip.sha256 https://staging.example.test vv-theme|TXBoard');
 const origin=stagingOrigin(rawOrigin);
 const packageInfo=verifyThemeZip(zip,sha);
 const checks=await stagingReadOnlySmoke(origin,expected);
 // Never print URLs, authentication data, API response bodies or private configuration.
 process.stdout.write(JSON.stringify({result:'PASS',package:packageInfo,checks})+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(e=>{console.error('NO-GO:',e.message);process.exitCode=1});
}
