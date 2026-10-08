// Import schemes follow TXBoard web/user/src/lib/client-import.ts.
const platform=()=>{
 const ua=navigator.userAgent.toLowerCase();
 if(/iphone|ipad|ipod/.test(ua))return 'ios';
 if(/android/.test(ua))return 'android';
 if(/macintosh|mac os/.test(ua))return 'mac';
 if(/windows/.test(ua))return 'windows';
 return 'unknown';
};
export function clientsFor(url,name='TXBoard'){
 if(!/^https?:\/\//i.test(url||''))return [];
 const encoded=encodeURIComponent(url);
 const label=encodeURIComponent(name);
 const utf8=new TextEncoder().encode(url);
 const binary=Array.from(utf8,x=>String.fromCharCode(x)).join('');
 const b64=btoa(binary);
 const clients=[
   ['Clash','clash://install-config?url='+encoded+'&name='+label,['windows','mac','android']],
   ['Hiddify','hiddify://import/'+encoded+'#'+label,['windows','mac','ios','android']],
   ['Sing-box','sing-box://import-remote-profile?url='+encoded+'#'+label,['mac','ios','android']],
   ['Shadowrocket','shadowrocket://add/sub://'+b64+'?remark='+label,['ios','mac']],
   ['Surge','surge:///install-config?url='+encoded+'&name='+label,['ios','mac']],
   ['Surfboard','surfboard:///install-config?url='+encoded+'&name='+label,['android']]
 ];
 const current=platform();
 return clients.filter(([, ,systems])=>current==='unknown'||systems.includes(current)).map(([name,href])=>({name,href}));
}
