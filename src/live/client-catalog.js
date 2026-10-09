// Luma managed client catalog. Preset deep links remain generated from the
// server-issued subscription URL; custom deep links require explicit templates.
// Admin-provided JSON is presentation/configuration, never executable markup.
import {allImportClients,validSubscriptionUrl,PLATFORMS} from './import.js';
import {safeImageUrl,safeWebUrl} from './browser-safety.js';

export const PRESET_CLIENT_IDS=Object.freeze([
 'clash','hiddify','sing-box','shadowrocket','quantumult-x',
 'surge','stash','nekobox','surfboard'
]);
const platformIds=new Set(PLATFORMS.map(item=>item.id));
const reservedSchemes=new Set(['javascript','data','file','blob','vbscript','http','https','intent']);
const maxClients=24;
const has=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const goodId=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{0,39}$/.test(value);
const goodName=value=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=42;
const cleanPlatforms=value=>Array.isArray(value)?[...new Set(value.filter(x=>platformIds.has(x)))]:null;
const safeIcon=(value,origin)=>safeImageUrl(value,origin)||null;
const fallbackMark=name=>Array.from(String(name||'?').trim())[0]?.toUpperCase()||'?';
const base64url=value=>{
 const bytes=new TextEncoder().encode(value);
 let result='';
 for(const char of bytes)result+=String.fromCharCode(char);
 return btoa(result);
};
function safeSchemeTemplate(template){
 if(typeof template!=='string'||template.length<9||template.length>2048)return null;
 if(/[\u0000-\u0020\u007f<>"'\\]/.test(template))return null;
 const scheme=/^([a-z][a-z0-9+.-]{1,31}):\/{2,3}/i.exec(template);
 if(!scheme||reservedSchemes.has(scheme[1].toLowerCase()))return null;
 if(!/\{urlEncoded\}|\{urlBase64\}/.test(template))return null;
 // Prevent arbitrary interpolation names and raw credentials.
 const leftovers=template.replaceAll('{urlEncoded}','').replaceAll('{urlBase64}','').replaceAll('{nameEncoded}','');
 return /[{}]/.test(leftovers)?null:template;
}
export function makeCustomImport(template,subUrl,title){
 const source=validSubscriptionUrl(subUrl);
 const safe=safeSchemeTemplate(template);
 if(!source||!safe)return null;
 const resolved=safe.replaceAll('{urlEncoded}',encodeURIComponent(source))
  .replaceAll('{urlBase64}',base64url(source))
  .replaceAll('{nameEncoded}',encodeURIComponent(String(title||'TXBoard').slice(0,90)));
 return resolved.length<=8192?resolved:null;
}
export function parseClientCatalog(value){
 if(value==null||value==='')return [];
 if(typeof value!=='string'||value.length>24000)return null;
 try{
  const items=JSON.parse(value);
  if(!Array.isArray(items)||items.length>maxClients)return null;
  const ids=new Set();
  for(const item of items){
   if(!item||typeof item!=='object'||Array.isArray(item)||!goodId(item.id)||ids.has(item.id))return null;
   ids.add(item.id);
  }
  return items;
 }catch{return null}
}
export function resolveImportClients({subscriptionUrl,title='TXBoard',platform='unknown',config={},origin='https://example.test'}={}){
 const source=validSubscriptionUrl(subscriptionUrl);
 const presets=source?allImportClients(source,title).map((item,index)=>({
  ...item,id:PRESET_CLIENT_IDS[index],kind:'import',iconUrl:null,
  mark:fallbackMark(item.name),order:index
 })):[];
 const entries=parseClientCatalog(config.clientCatalog);
 // Invalid JSON is treated as no overrides: do not erase working imports.
 const mode=entries!==null&&config.clientMode==='replace'?'replace':'merge';
 const defaults=mode==='replace'?[]:presets;
 const merged=new Map(defaults.map(x=>[x.id,x]));
 const defaultIcons=config.clientIcons&&typeof config.clientIcons==='object'?config.clientIcons:{};
 for(const item of defaults){
  item.iconUrl=safeIcon(defaultIcons[item.id],origin);
 }
 if(entries){
  for(let index=0;index<entries.length;index++){
   const item=entries[index],current=merged.get(item.id)||
    presets.find(preset=>preset.id===item.id);
   if(item.enabled===false){merged.delete(item.id);continue}
   const name=goodName(item.name)?item.name.trim():current?.name;
   if(!name)continue;
   const platforms=has(item,'platforms')?cleanPlatforms(item.platforms):current?.platforms||[];
   if(!platforms||platforms.length===0)continue;
   const action=item.action||'preset';
   let href=null,kind='import';
   if(action==='preset'){
    // No protocol guessing: only known preset IDs have a verified deep link.
    href=current?.href||null;
   }else if(action==='scheme'){
    href=makeCustomImport(item.template,source,title);
   }else if(action==='download'){
    // A static public HTTPS URL never receives the private subscription token.
    href=safeWebUrl(item.url,{origin,allowRelative:false,allowHttpLoopback:false});
    kind='download';
   }
   if(!href)continue;
   const iconUrl=has(item,'iconUrl')?safeIcon(item.iconUrl,origin):
    safeIcon(defaultIcons[item.id],origin)||current?.iconUrl||null;
   merged.set(item.id,{
    ...current,id:item.id,name,platforms,href,kind,iconUrl,
    mark:fallbackMark(name),
    order:Number.isFinite(Number(item.order))?Math.max(-100,Math.min(100,Number(item.order))):current?.order??(100+index)
   });
  }
 }
 return [...merged.values()].filter(item=>platform==='unknown'||item.platforms.includes(platform))
  .sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,'en'));
}
