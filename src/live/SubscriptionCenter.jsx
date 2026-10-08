import React,{useEffect,useState} from 'react';
import QRCode from 'qrcode';
import {ArrowRight,ChevronDown,Copy,Eye,EyeOff,ExternalLink,RefreshCcw,ShoppingBag,Wifi} from 'lucide-react';
import {clientsFor,detectPlatform,PLATFORMS,validSubscriptionUrl} from './import.js';
import {canAttemptRenew,canAttemptReset,displayDate,nextResetLabel,subscriptionState} from './subscription-center.js';

const clientMarks={'Clash':'C','Hiddify':'H','Sing-box':'S','Shadowrocket':'S','Quantumult X':'Q','Surge':'S','Stash':'S','NekoBox':'N','Surfboard':'S'};
export default function SubscriptionCenter({subscription,user,siteTitle,config,formatBytes,onQr,onCopy,onImport,onRenew,onReset,onShop,onRefresh,busy=false}){
 const [revealed,setRevealed]=useState(false);
 const [platform,setPlatform]=useState(detectPlatform);
 const [qrImage,setQrImage]=useState('');
 const info=subscriptionState(subscription,user);
 const usage=info.usage;
 const subUrl=validSubscriptionUrl(subscription?.subscribe_url);
 const clients=clientsFor(subUrl,siteTitle,platform);
 const reset=nextResetLabel(subscription);
 const expiryText=info.hasPlan?(info.expiry?displayDate(info.expiry):'长期有效'):'未开通';
 const canRenew=config.renewalAction&&canAttemptRenew(subscription,user);
 const canReset=config.resetAction&&canAttemptReset(subscription,user);
 const status=!info.hasPlan?'未开通':info.expired?'已过期':usage.remaining===0?'流量用完':'使用中';
 const percent=usage.usedPercent??0;

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
   <details className="live-subscription-extra">
    <summary>套餐管理 <ChevronDown size={16} aria-hidden="true"/></summary>
    <section className="live-subscription-summary" aria-label="订阅概览">
     <div className="live-subscription-head">
      <strong>{info.hasPlan?subscription?.plan?.name||'当前套餐':'还没有订阅套餐'}</strong>
      <span className={'live-subscription-status '+(!info.hasPlan||info.expired?'is-alert':'')}>{status}</span>
     </div>
     <div className="live-subscription-meter">
      <div className="live-subscription-balance"><span>本期剩余流量</span><strong>{info.hasPlan&&usage.remaining!==null?formatBytes(usage.remaining):'—'}</strong><small>{usage.total!==null?' / '+formatBytes(usage.total):'暂无套餐额度数据'}</small></div>
      <div className="live-traffic" role="progressbar" aria-label="流量使用比例" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div style={{width:percent+'%'}}/></div>
      <div className="live-subscription-usage"><span>已使用 {formatBytes(usage.used)}</span><span>{usage.usedPercent!==null?'已用 '+percent+'%':'比例未知'}</span></div>
     </div>
     <div className="live-subscription-metrics">
      <div><span>上传流量</span><strong>{formatBytes(usage.uploaded)}</strong></div>
      <div><span>下载流量</span><strong>{formatBytes(usage.downloaded)}</strong></div>
      <div><span>有效期至</span><strong>{expiryText}</strong></div>
      {config.showNextReset&&<div><span>下次流量重置</span><strong>{reset?(reset.kind==='timestamp'?displayDate(reset.value):'约 '+reset.value+' 天后'):'暂无重置安排'}</strong></div>}
     </div>
     <div className="live-subscription-actions">
      {canRenew&&<button className="primary" onClick={onRenew} disabled={busy}><RefreshCcw size={16}/> 续费当前套餐</button>}
      <button className="secondary" onClick={onShop}><ShoppingBag size={16}/> {canRenew?'查看其他套餐':'浏览可用套餐'}</button>
      {canReset&&<button className="secondary" onClick={onReset} disabled={busy}><Wifi size={16}/> 重置流量</button>}
      <button className="secondary" onClick={onRefresh} disabled={busy}><RefreshCcw size={16}/> 刷新用量</button>
     </div>
     {canReset&&<p className="live-subscription-note">流量重置可能产生费用，价格将在确认前显示。</p>}
    </section>
   </details>
  </section>
 </div>;
}
