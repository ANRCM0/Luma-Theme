import React from 'react';
import {ArrowRight,Clock3,Gift,ShieldCheck,ShoppingBag,Wallet,Wifi} from 'lucide-react';
import {welcomeContent} from './welcome-config.js';

// Stateless presentational components: no entitlement decisions or mutations.
export function WelcomeBanner({user,subscription,overview,config,formatBytes,formatDate,onNavigate}){
 const entry=welcomeContent(overview.state,config.enabled);
 const name=String(user?.email||'用户').split('@')[0]||'用户';
 const title=config.enabled?entry.heading+', '+name:'Halo, '+name+' 👋';
 const active=overview.hasPlan;
 const expireText=active?(overview.expiry?formatDate(overview.expiry).split(' ')[0]:'长期有效'):'尚未订阅';
 const trafficText=active&&overview.remaining!==null?formatBytes(overview.remaining):'—';
 return <section className={'welcome card live-welcome-state live-welcome-'+entry.tone} data-welcome-state={config.enabled?overview.state:'normal'} aria-label="账户欢迎卡片">
  <div className="welcome-text">
   <span className="eyebrow">{entry.eyebrow}</span>
   <h1>{title}</h1>
   <p>{entry.description}</p>
   <div className="status-pill"><ShieldCheck size={15}/>{active?(overview.planName||'已订阅'):'未订阅'}<span>{!active?'待开通':overview.state==='expired'?'已到期':overview.state==='exhausted'?'本期流量已用完':'当前套餐'}</span></div>
   <div className="welcome-actions">
    <button className="secondary" onClick={()=>onNavigate(entry.action)}>{entry.primary}<ArrowRight size={15}/></button>
    <button className="welcome-help" onClick={()=>onNavigate(entry.secondaryAction)}>{entry.secondary}</button>
   </div>
   <div className="stats">
    <div><span>到期时间</span><strong>{expireText}</strong></div>
    <div><span>流量重置</span><strong>{subscription?.reset_day?subscription.reset_day+' 天':'—'}</strong></div>
    <div><span>剩余流量</span><strong>{trafficText}</strong></div>
   </div>
  </div>
  <div className="welcome-decor" aria-hidden="true"><Wifi size={108} strokeWidth={1.1}/></div>
 </section>;
}

export function WelcomeSecondaryCard({mode,featured,subscription,user,overview,formatBytes,formatMoney,availablePeriods,onBuy,onNavigate}){
 if(mode==='usage'){
  const percentage=overview.total&&overview.total>0?Math.min(100,overview.used/overview.total*100):0;
  return <section className="card recommend-card live-welcome-side" aria-label="流量用量">
   <div className="small-label">流量使用概览</div>
   <div className="live-welcome-side-heading"><Wifi size={23}/><strong>{overview.total===null?'尚无流量额度':formatBytes(overview.remaining)}</strong></div>
   <p className="muted">剩余流量 · {overview.total!==null?('已用 '+formatBytes(overview.used)+' / '+formatBytes(overview.total)):'等待套餐额度数据'}</p>
   <div className="live-traffic" role="progressbar" aria-label="流量使用比例" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentage)}><div style={{width:percentage+'%'}}/></div>
   <button className="secondary wide" onClick={()=>onNavigate('shop')}>查看套餐<ArrowRight size={15}/></button>
  </section>;
 }
 if(mode==='wallet'){
  return <section className="card recommend-card live-welcome-side" aria-label="账户余额">
   <div className="small-label">账户钱包</div>
   <div className="live-welcome-side-heading"><Wallet size={23}/><strong>{formatMoney(user?.balance)}</strong></div>
   <p className="muted">当前可用余额，以 TXBoard 返回的数据为准。</p>
   <button className="secondary wide" onClick={()=>onNavigate('profile')}>账户与财务<ArrowRight size={15}/></button>
  </section>;
 }
 return <section className="card recommend-card live-welcome-side" aria-label="推荐套餐">
  <div className="small-label">为你推荐</div>
  {featured?<><div className="plan-side"><div><strong>{featured.name}</strong><p>{featured.transfer_enable} GB 流量</p></div><div className="price">{formatMoney(availablePeriods(featured)[0]&&featured[availablePeriods(featured)[0][0]])}</div></div>
   <button className="primary wide" onClick={()=>onBuy(featured)}>查看套餐 <ArrowRight size={16}/></button></>
   :<><p className="muted">暂无在售套餐</p><button className="secondary wide" onClick={()=>onNavigate('ticket')}>联系支持</button></>}
 </section>;
}
