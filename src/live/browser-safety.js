// Browser navigation boundaries for user-supplied and server-supplied URLs.
// External actions use HTTPS; plain HTTP is permitted only for loopback development.
const LOOPBACK=new Set(['localhost','127.0.0.1','[::1]','::1']);
export function safeWebUrl(value,{origin='https://example.test',allowRelative=false,allowHttpLoopback=false}={}){
 if(typeof value!=='string'||!value.trim()||value.length>8192)return null;
 const raw=value.trim();
 if(/[\\\u0000-\u001f\u007f]/.test(raw))return null;
 // Accept an explicit http(s) URL, or same-origin paths if requested.
 if(!/^https?:\/\//i.test(raw)&&!(allowRelative&&raw.startsWith('/')&&!raw.startsWith('//')))return null;
 try{
  const url=new URL(raw,origin);
  if(url.username||url.password||url.protocol==='javascript:'||url.protocol==='data:')return null;
  if(url.protocol!=='https:'&&!(allowHttpLoopback&&url.protocol==='http:'&&LOOPBACK.has(url.hostname)))return null;
  if(allowRelative&&!/^https?:\/\//i.test(raw)&&url.origin!==new URL(origin).origin)return null;
  return url.href;
 }catch{return null}
}
export function safeImageUrl(value,origin){
 const safe=safeWebUrl(value,{origin,allowRelative:true,allowHttpLoopback:true});
 if(!safe)return null;
 const url=new URL(safe);
 const page=new URL(origin);
 // Same-origin HTTP pages are supported for local development only.
 if(url.protocol==='http:'&&url.origin!==page.origin)return null;
 return safe;
}
export function removeSensitiveHashParam(hash,key='verify'){
 const raw=String(hash||'');
 const i=raw.indexOf('?');
 if(i<0)return raw;
 const pathname=raw.slice(0,i);
 const params=new URLSearchParams(raw.slice(i+1));
 if(!params.has(key))return raw;
 params.delete(key);
 const suffix=params.toString();
 return pathname+(suffix?'?'+suffix:'');
}
