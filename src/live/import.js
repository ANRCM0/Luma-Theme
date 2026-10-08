// Mirrors the supported client import protocols of TXBoard web/user/src/lib/client-import.ts.
// Custom scheme links are only generated after validating the server-issued URL.
export const PLATFORMS=[
 {id:'windows',label:'Windows'},
 {id:'mac',label:'macOS'},
 {id:'ios',label:'iOS'},
 {id:'android',label:'Android'}
];
export function detectPlatform(userAgent=typeof navigator!=='undefined'?navigator.userAgent:''){
 const ua=String(userAgent).toLowerCase();
 if(/iphone|ipad|ipod/.test(ua))return 'ios';
 if(/android/.test(ua))return 'android';
 if(/macintosh|mac os/.test(ua))return 'mac';
 if(/windows/.test(ua))return 'windows';
 return 'unknown';
}
export function validSubscriptionUrl(input){
 try{
  const u=new URL(input);
  return (u.protocol==='https:'||u.protocol==='http:')&&
    !u.username&&!u.password&&!!u.hostname&&u.href.length<=8192?u.href:null;
 }catch{return null}
}
const b64=x=>btoa(Array.from(new TextEncoder().encode(x),byte=>String.fromCharCode(byte)).join(''));
export function allImportClients(url,title='TXBoard'){
 const clean=validSubscriptionUrl(url);
 if(!clean)return [];
 const name=encodeURIComponent(String(title).slice(0,100));
 const encoded=encodeURIComponent(clean);
 return [
  {name:'Clash',href:'clash://install-config?url='+encoded+'&name='+name,platforms:['windows','mac','android']},
  {name:'Hiddify',href:'hiddify://import/'+encoded+'#'+name,platforms:['windows','mac','ios','android']},
  {name:'Sing-box',href:'sing-box://import-remote-profile?url='+encoded+'#'+name,platforms:['mac','ios','android']},
  {name:'Shadowrocket',href:'shadowrocket://add/sub://'+b64(clean)+'?remark='+name,platforms:['ios','mac']},
  {name:'Quantumult X',href:'quantumult-x:///update-configuration?remote-resource='+encodeURIComponent(JSON.stringify({server_remote:[clean+', tag='+String(title).replace(/[\r\n,]/g,' ').slice(0,50)]})),platforms:['ios','mac']},
  {name:'Surge',href:'surge:///install-config?url='+encoded+'&name='+name,platforms:['ios','mac']},
  {name:'Stash',href:'stash://install-config?url='+encoded+'&name='+name,platforms:['ios','mac']},
  {name:'NekoBox',href:'clash://install-config?url='+encoded+'&name='+name,platforms:['android']},
  {name:'Surfboard',href:'surfboard:///install-config?url='+encoded+'&name='+name,platforms:['android']}
 ];
}
export function clientsFor(url,title='TXBoard',platform=detectPlatform()){
 return allImportClients(url,title).filter(x=>platform==='unknown'||x.platforms.includes(platform));
}
