import React from 'react';
import {ArrowRight,RefreshCcw,ShoppingBag,Wallet,Wifi} from 'lucide-react';
import {canAttemptRenew,canAttemptReset} from './subscription-center.js';
import {catalogPriceFor} from './catalog.js';
import {welcomeContent} from './welcome-config.js';
import {epochMs} from './api.js';

// Welcome is deliberately a greeting, not a second copy of subscription data.
export function WelcomeBanner({user,overview,config,atomic={}}){
 const entry=welcomeContent(overview.state,config.enabled);
 const name=String(user?.email||'用户').split('@')[0]||'用户';
 const title=config.enabled?entry.heading+', '+name:'欢迎回来, '+name;
 const description=(!config.enabled||overview.state==='normal')?'轻松管理你的网络服务。':entry.description;
 return <section className={'welcome card live-welcome-state live-welcome-'+entry.tone} data-welcome-state={config.enabled?overview.state:'normal'} aria-label="账户欢迎卡片">
  <div className="welcome-text">
   {atomic.showEyebrow!==false&&<span className="eyebrow">{entry.eyebrow}</span>}
   <h1>{title}</h1>
   {atomic.welcomeDescription!==false&&<p>{description}</p>}
  </div>
  {atomic.welcomeDecoration!==false&&<div className="welcome-decor" aria-hidden="true"><Wifi size={108} strokeWidth={1.1}/></div>}
 </section>;
}

// The current plan card is the only dashboard location for entitlement facts
// and plan actions. All permission/price checks remain server-authoritative.
export function WelcomeSecondaryCard({mode,featured,subscription,user,overview,config,formatBytes,formatMoney,availablePeriods,onBuy,onNavigate,onRenew,onReset,onRefresh,busy=false,catalogPlan=null}){
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
   <div className="live-welcome-side-heading"><Wallet size={23}/><strong>{formatMoney(user?.balance_minor)}</strong></div>
   <button className="secondary wide" onClick={()=>onNavigate('profile')}>账户与财务<ArrowRight size={15}/></button>
  </section>;
 }
 if(overview.hasPlan){
  const percent=overview.total>0?Math.min(100,Math.round(overview.used/overview.total*100)):0;
  // overview.expiry is already epoch milliseconds (welcome-config.js -> epochMs);
  // never multiply by 1000 and never re-parse it as an ISO string.
  const expiryMs=epochMs(overview.expiry);
  const expiry=expiryMs===null?'长期有效':new Date(expiryMs).toLocaleDateString('zh-CN');
  const remaining=overview.remaining===null?'—':formatBytes(overview.remaining);
  const canRenew=config.renewalAction&&canAttemptRenew(subscription,user,catalogPlan);
  const canReset=config.resetAction&&canAttemptReset(subscription,user);
  const expired=overview.state==='expired';
  const status=expired?'已到期':overview.state==='exhausted'?'流量已用完':'使用中';
  return <section className="card recommend-card live-welcome-side live-current-plan" aria-label="已购套餐">
   <div className="live-current-plan-top"><span className="small-label">套餐管理</span><span className={'live-current-plan-badge'+(expired?' is-alert':'')}>{status}</span></div>
   <strong className="live-current-plan-name">{overview.planName||subscription?.plan?.name||'当前套餐'}</strong>
   <div className="live-current-plan-quota"><span>剩余流量</span><strong>{remaining}</strong></div>
   <div className="live-traffic" role="progressbar" aria-label="套餐流量使用比例" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div style={{width:percent+'%'}}/></div>
   <div className="live-current-plan-expiry">到期时间 <strong>{expiry}</strong></div>
   <div className="live-plan-operations">
    {canRenew&&<button type="button" className="primary" onClick={onRenew} disabled={busy}><RefreshCcw size={16}/>续费当前套餐</button>}
    <button type="button" className="secondary" onClick={()=>onNavigate('shop')}><ShoppingBag size={16}/>{canRenew?'查看其他套餐':'浏览可用套餐'}</button>
    {canReset&&<button type="button" className="secondary" onClick={onReset} disabled={busy}><Wifi size={16}/>重置流量</button>}
    <button type="button" className="secondary" onClick={onRefresh} disabled={busy}><RefreshCcw size={16}/>刷新用量</button>
   </div>
   {canReset&&<p className="live-plan-note">重置流量可能产生费用，价格将在确认前显示。</p>}
  </section>;
 }
 return <section className="card recommend-card live-welcome-side" aria-label="推荐套餐">
  <div className="small-label">可选套餐</div>
  {featured?<><div className="plan-side"><div><strong>{featured.name}</strong><p>{featured.traffic_limit_bytes!=null?Math.round(Number(featured.traffic_limit_bytes)/1073741824)+' GB':'—'}</p></div><div className="price">{formatMoney(catalogPriceFor(featured)?.price)}</div></div>
   <button className="primary wide" onClick={()=>onBuy(featured)}>查看套餐 <ArrowRight size={16}/></button></>
   :<><p className="muted">暂无在售套餐</p><button className="secondary wide" onClick={()=>onNavigate('shop')}>浏览套餐</button></>}
 </section>;
}
