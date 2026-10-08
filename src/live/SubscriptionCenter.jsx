import React,{useState} from 'react';
import {ArrowRight,CheckCircle2,Clock3,Copy,Eye,EyeOff,ExternalLink,HelpCircle,Monitor,QrCode,RefreshCcw,ShieldCheck,ShoppingBag,Smartphone,Wifi} from 'lucide-react';
import {clientsFor,detectPlatform,PLATFORMS,validSubscriptionUrl} from './import.js';
import {canAttemptRenew,canAttemptReset,displayDate,nextResetLabel,subscriptionState} from './subscription-center.js';

export default function SubscriptionCenter({subscription,user,siteTitle,config,formatBytes,onQr,onCopy,onImport,onRenew,onReset,onShop,onRefresh,busy=false}){
 const [revealed,setRevealed]=useState(false);
 const [platform,setPlatform]=useState(detectPlatform);
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
 return <div className="live-subscription-center" aria-label="订阅管理中心">
  <section className="card live-subscription-summary" aria-label="订阅概览">
   <div className="live-subscription-head">
    <div><span className="eyebrow">SUBSCRIPTION OVERVIEW</span><h3>{info.hasPlan?subscription?.plan?.name||'当前套餐':'还没有订阅套餐'}</h3></div>
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
   {canReset&&<p className="live-subscription-note">重置流量是付费订单操作，点击后会先查询服务端价格，再由 TXBoard 判断是否允许购买。</p>}
  </section>
  <section className="card live-subscription-import" aria-label="客户端与订阅导入">
   <div className="section-title"><div><ShieldCheck size={21}/><h3>订阅导入</h3></div><button className="link" disabled={!subUrl} onClick={()=>onQr(subUrl)}><QrCode size={16}/> 查看二维码</button></div>
   <p className="muted">订阅地址是账号凭证。只在可信设备、可信客户端导入，切勿向他人分享。</p>
   <div className="live-subscription-link">
    <span className="live-break">{subUrl?(revealed?subUrl:'https://••••••••••••••••'):'暂无可用订阅链接'}</span>
    <button title={revealed?'隐藏订阅链接':'显示订阅链接'} aria-label={revealed?'隐藏订阅链接':'显示订阅链接'} disabled={!subUrl} onClick={()=>setRevealed(v=>!v)}>{revealed?<EyeOff size={17}/>:<Eye size={17}/>}</button>
    <button title="复制订阅链接" aria-label="复制订阅链接" disabled={!subUrl} onClick={()=>onCopy(subUrl)}><Copy size={17}/></button>
   </div>
   {config.clientGuide&&<div className="live-client-guide">
    <div className="live-client-guide-heading"><h4>一键导入客户端</h4><span>先安装可信客户端，再点击导入</span></div>
    <div className="live-client-platforms" role="group" aria-label="选择客户端平台">
     {PLATFORMS.map(p=><button key={p.id} type="button" aria-pressed={platform===p.id} className={platform===p.id?'selected':''} onClick={()=>setPlatform(p.id)}>{p.label}</button>)}
    </div>
    {subUrl?<div className="live-client-list">{clients.map(c=><button type="button" key={c.name} onClick={()=>onImport(c)}><span className="live-client-icon"><Smartphone size={19}/></span><span>{c.name}</span><ExternalLink size={14}/></button>)}</div>:<p className="muted">当前没有可导入的订阅地址。请先开通套餐或联系支持。</p>}
    <div className="live-client-steps"><div><b>1</b><span>从客户端官方渠道安装应用</span></div><div><b>2</b><span>返回这里选择客户端，点击导入</span></div><div><b>3</b><span>在客户端确认添加订阅并更新配置</span></div></div>
    <p className="live-subscription-note">一键导入依赖设备已安装相应客户端及协议支持。如果未自动跳转，请复制订阅链接，在客户端内手动添加。</p>
   </div>}
  </section>
 </div>;
}
