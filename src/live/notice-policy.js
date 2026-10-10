import {noticeVersion,readSeenNotices} from './notice.js';

// All options are stored under theme_vv-theme through the existing TXBoard theme manifest.
// Legacy TXBoard builds get the same values via Blade-injected window.settings.notice.
import {liveThemeConfig} from './theme-config.js';
export const DEFAULT_NOTICE_CONFIG=Object.freeze({
 popupEnabled:true,centerEnabled:true,tag:'',frequency:'once',
 scope:'all',style:'classic'
});
const FREQUENCIES=new Set(['once','session','daily','always']);
const SCOPES=new Set(['all','dashboard']);
const STYLES=new Set(['classic','compact','feature']);
const enabled=(raw,fallback)=>raw==null?fallback:!(raw===false||raw===0||raw==='0'||raw==='false');
const popupAllowed=item=>enabled(item?.popup,true); // Respect TXBoard admin notice '弹窗展示'.

export function resolveNoticeConfig(guest={},settings={}){
 const source=liveThemeConfig(guest)||settings?.notice||{};
 const frequency=String(source.notice_popup_frequency??source.frequency??'once');
 const scope=String(source.notice_popup_scope??source.scope??'all');
 const style=String(source.notice_popup_style??source.style??'classic');
 return {
  popupEnabled:enabled(source.notice_popup_enabled??source.popupEnabled,true),
  centerEnabled:enabled(source.notice_center_enabled??source.centerEnabled,true),
  tag:String(source.notice_popup_tag??source.tag??'').trim().toLocaleLowerCase(),
  frequency:FREQUENCIES.has(frequency)?frequency:'once',
  scope:SCOPES.has(scope)?scope:'all',
  style:STYLES.has(style)?style:'classic'
 };
}

export function matchesPopupTag(item,tag=''){
 if(!tag)return true;
 const tags=Array.isArray(item?.tags)?item.tags:[];
 const requested=tag.split(/[,，;；]/).map(x=>x.trim().toLocaleLowerCase()).filter(Boolean);
 return requested.length>0&&requested.some(x=>tags.some(y=>String(y).trim().toLocaleLowerCase()===x));
}

function gateKey(kind,user,notice){
 const who=user?.id??user?.email;
 const version=noticeVersion(notice);
 if(who==null||!version)return null;
 return 'vv-theme:notice-'+kind+':'+encodeURIComponent(String(who))+':'+encodeURIComponent(version);
}
function readGate(storage,key){
 if(!key)return null;
 try{return storage?.getItem(key)??null}catch{return null}
}
function writeGate(storage,key,value){
 if(!key)return;
 try{storage?.setItem(key,String(value))}catch{/* Storage may be blocked. */}
}

export function automaticNotices(items,policy,user,storage,sessionStorage,now=Date.now()){
 if(!policy.popupEnabled)return [];
 const seen=new Set(readSeenNotices(storage,user));
 return (Array.isArray(items)?items:[]).filter(item=>{
  const version=noticeVersion(item);
  if(!version||!popupAllowed(item)||!matchesPopupTag(item,policy.tag))return false;
  switch(policy.frequency){
   case 'once':return !seen.has(version);
   case 'session':return !readGate(sessionStorage,gateKey('session',user,item));
   case 'daily':{
    const last=Number(readGate(storage,gateKey('daily',user,item))||0);
    return !(last>0&&last<=now&&now-last<86400000);
   }
   case 'always':return true;
   default:return !seen.has(version);
  }
 });
}

export function recordAutoNotice(item,policy,user,storage,sessionStorage,now=Date.now()){
 if(policy.frequency==='session')writeGate(sessionStorage,gateKey('session',user,item),'1');
 if(policy.frequency==='daily')writeGate(storage,gateKey('daily',user,item),now);
}
