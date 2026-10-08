import React from 'react';
import {ArrowRight,ShieldCheck,ShoppingBag,Wallet,Wifi} from 'lucide-react';
import {welcomeContent} from './welcome-config.js';

// Presentation only. Subscription state and quotas come from TXBoard.
export function WelcomeBanner({user,subscription,overview,config,formatBytes,formatDate,onNavigate}){
 const entry=welcomeContent(overview.state,config.enabled);
 const name=String(user?.email||'用户').split('@')[0]||'用户';
 const title=config.enabled?entry.heading+', '+name:'Halo, '+name+' 👋';
 const active=overview.hasPlan;
 const expiry=active?(overview.expiry?formatDate(overview.expiry).split(' ')[0]:'长期有效'):'—';
 const remaining=active&&overview.remaining!==null?formatBytes(overview.remaining):'—';
 return <section className={'welcome card live-welcome-state live-welcome-'+entry.tone} data-welcome-state={config.enabled?overview.state:'normal'} aria-label="账户欢迎卡片">
  <div className="welcome-text">
   <span className="eyebrow">{entry.eyebrow}</span>
   <h1>{title}</h1>
   {overview.state!=='normal'&&<p>{entry.description}</p>}
   <div className="status-pill"><ShieldCheck size={15}/>{active?(overview.planName||'已订阅'):'尚未订阅'}<span>{!active?'待开通':overview.state==='expired'?'已到期':overview.state==='exhausted'?'流量已用完':'当前套餐'}</span></div>
   <div className="welcome-actions">
    <button className="secondary" onClick={()=>onNavigate(entry.action)}>{entry.primary}<ArrowRight size={15}/></button>
   </div>
   <div className="stats">
    <div><span>剩余流量</span><strong>{remaining}</strong></div>
    <div><span>到期时间</span><strong>{expiry}</strong></div>
   </div>
  </div>
  <div className="welcome-decor" aria-hidden="true"><Wifi size={108} strokeWidth={1.1}/></div>
 </section>;
}

export function WelcomeSecondaryCard({mode,featured,subscription,user,overview,formatBytes,formatMoney,availablePeriods,onBuy,onNavigate}){
 // Keep explicit admin overrides for usage/wallet. The default side card
 // prioritizes what the user already owns instead of pushing another plan.
 if(mode==='usage'){
  const percentage=overview.total&&overview.total>0?Math.min(100,overview.used/overview.total*100):0;
  return <section className="card recommend-card live-welcome-side" aria-label="流量用量">
   <div className="small-label">流量概览</div>
   <div className="live-welcome-side-heading"><Wifi size={23}/><strong>{overview.total===null?'尚无额度':formatBytes(overview.remaining)}</strong></div>
   <div className="live-traffic" role="progressbar" aria-label="流量使用比例" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentage)}><div style={{width:percentage+'%'}}/></div>
   <p className="muted">已使用 {overview.total!==null?formatBytes(overview.used)+' / '+formatBytes(overview.total):'—'}</p>
   <button className="secondary wide" onClick={()=>onNavigate('shop')}>查看套餐<ArrowRight size={15}/></button>
  </section>;
 }
 if(mode==='wallet'){
  return <section className="card recommend-card live-welcome-side" aria-label="账户余额">
   <div className="small-label">账户余额</div>
   <div className="live-welcome-side-heading"><Wallet size={23}/><strong>{formatMoney(user?.balance)}</strong></div>
   <button className="secondary wide" onClick={()=>onNavigate('profile')}>账户与财务<ArrowRight size={15}/></button>
  </section>;
 }
 if(overview.hasPlan){
  const percent=overview.total>0?Math.min(100,Math.round(overview.used/overview.total*100)):0;
  const expiry=overview.expiry?new Date(overview.expiry*1000).toLocaleDateString('zh-CN'):'长期有效';
  const remaining=overview.remaining===null?'—':formatBytes(overview.remaining);
  return <section className="card recommend-card live-welcome-side live-current-plan" aria-label="已购套餐">
   <div className="live-current-plan-top"><span className="small-label">我的套餐</span><span className="live-current-plan-badge">{overview.state==='expired'?'已到期':overview.state==='exhausted'?'流量已用完':'已开通'}</span></div>
   <strong className="live-current-plan-name">{overview.planName||subscription?.plan?.name||'当前套餐'}</strong>
   <div className="live-current-plan-quota"><span>剩余流量</span><strong>{remaining}</strong></div>
   <div className="live-traffic" role="progressbar" aria-label="套餐流量使用比例" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div style={{width:percent+'%'}}/></div>
   <div className="live-current-plan-expiry">到期时间 <strong>{expiry}</strong></div>
   <button className="secondary wide" onClick={()=>document.getElementById('live-subscription-management')?.scrollIntoView({behavior:'smooth',block:'start'})}>管理订阅<ArrowRight size={15}/></button>
  </section>;
 }
 return <section className="card recommend-card live-welcome-side" aria-label="推荐套餐">
  <div className="small-label">为你推荐</div>
  {featured?<><div className="plan-side"><div><strong>{featured.name}</strong><p>{featured.transfer_enable} GB</p></div><div className="price">{formatMoney(availablePeriods(featured)[0]&&featured[availablePeriods(featured)[0][0]])}</div></div>
   <button className="primary wide" onClick={()=>onBuy(featured)}>查看套餐 <ArrowRight size={16}/></button></>
   :<><p className="muted">暂无在售套餐</p><button className="secondary wide" onClick={()=>onNavigate('shop')}>浏览套餐</button></>}
 </section>;
}
