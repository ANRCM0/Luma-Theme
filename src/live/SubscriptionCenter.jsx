import React,{useEffect,useState} from 'react';
import QRCode from 'qrcode';
import {Copy,Eye,EyeOff,ExternalLink} from 'lucide-react';
import {clientsFor,detectPlatform,PLATFORMS,validSubscriptionUrl} from './import.js';

const clientMarks={'Clash':'C','Hiddify':'H','Sing-box':'S','Shadowrocket':'S','Quantumult X':'Q','Surge':'S','Stash':'S','NekoBox':'N','Surfboard':'S'};
export default function SubscriptionCenter({subscription,siteTitle,config,onQr,onCopy,onImport}){
 const [revealed,setRevealed]=useState(false);
 const [platform,setPlatform]=useState(detectPlatform);
 const [qrImage,setQrImage]=useState('');
 const subUrl=validSubscriptionUrl(subscription?.subscribe_url);
 const clients=clientsFor(subUrl,siteTitle,platform);

 useEffect(()=>{
  let cancelled=false;
  setQrImage('');
  if(subUrl){
   QRCode.toDataURL(subUrl,{width:208,margin:1,errorCorrectionLevel:'M'})
    .then(image=>{if(!cancelled)setQrImage(image)})
    .catch(()=>{if(!cancelled)setQrImage('')});
  }
  return ()=>{cancelled=true};
 },[subUrl]);

 return <div className="live-subscription-center" id="live-subscription-management" aria-label="订阅管理中心">
  <section className="card live-subscription-import" aria-label="客户端与订阅导入">
   <div className="live-import-main">
    <div className="live-import-content">
     <h3 className="live-import-label">订阅链接</h3>
     <div className="live-subscription-link">
      <span className="live-break">{subUrl?(revealed?subUrl:'https://••••••••••••••••'):'暂无可用订阅链接'}</span>
      <button title={revealed?'隐藏订阅链接':'显示订阅链接'} aria-label={revealed?'隐藏订阅链接':'显示订阅链接'} disabled={!subUrl} onClick={()=>setRevealed(v=>!v)}>{revealed?<EyeOff size={18}/>:<Eye size={18}/>}</button>
      <button title="复制订阅链接" aria-label="复制订阅链接" disabled={!subUrl} onClick={()=>onCopy(subUrl)}><Copy size={18}/></button>
     </div>
     {config.clientGuide&&<div className="live-client-guide">
      <h4>快捷导入到第三方客户端</h4>
      <div className="live-client-platforms" role="group" aria-label="选择客户端平台">
       {PLATFORMS.map(p=><button key={p.id} type="button" aria-pressed={platform===p.id} className={platform===p.id?'selected':''} onClick={()=>setPlatform(p.id)}>{p.label}</button>)}
      </div>
      {subUrl?<div className="live-client-list">{clients.map(c=><button type="button" key={c.name} aria-label={'导入到 '+c.name} onClick={()=>onImport(c)}><span className="live-client-icon" aria-hidden="true">{clientMarks[c.name]||'+'}</span><span>{c.name}</span><ExternalLink size={13} aria-hidden="true"/></button>)}</div>:<p className="live-import-empty">开通套餐后即可导入客户端</p>}
     </div>}
     <p className="live-import-caution">订阅链接属于账号凭证，请勿分享。</p>
    </div>
    <aside className="live-import-qr" aria-label="订阅二维码">
     <button type="button" className="live-import-qr-button" title="放大二维码" aria-label="放大二维码" disabled={!subUrl} onClick={()=>onQr(subUrl)}>
      {qrImage?<img src={qrImage} alt="订阅二维码" />:<div className="live-import-qr-empty">{subUrl?'二维码生成中':'暂无二维码'}</div>}
     </button>
     <span>扫码导入订阅</span>
    </aside>
   </div>
  </section>
 </div>;
}
