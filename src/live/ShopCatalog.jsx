import React,{useEffect,useState} from 'react';
import {ArrowRight,Check,ChevronDown,GitCompareArrows,ShieldCheck,Wifi} from 'lucide-react';
import {CATALOG_PERIODS,availableCatalogPlans,annualSavings,catalogCompare,catalogPriceFor,normalizedDescription,planFeatures,planPeriods} from './catalog.js';

const labelFor=id=>CATALOG_PERIODS.find(p=>p.id===id)?.label||'套餐';
export default function ShopCatalog({plans,config,money,onBuy}){
 const [period,setPeriod]=useState(config.defaultPeriod);
 const [compare,setCompare]=useState([]);
 const [compareOpen,setCompareOpen]=useState(false);
 const all=availableCatalogPlans(plans);
 const options=CATALOG_PERIODS.filter(x=>all.some(p=>catalogPriceFor(p,x.id)));
 const visible=period==='all'?all:all.filter(p=>catalogPriceFor(p,period));
 useEffect(()=>{
  setCompare(ids=>ids.filter(id=>all.some(p=>String(p.id)===id)));
 },[plans]);
 const selected=catalogCompare(all,compare,period);
 const toggle=id=>setCompare(current=>current.includes(id)?current.filter(x=>x!==id):current.length<3?[...current,id]:current);
 return <section className="live-shop" aria-label="套餐商店">
  <div className="live-shop-heading">
   <div><span className="eyebrow">FIND YOUR PLAN</span><h2>选择适合自己的方案</h2><p>从服务端读取套餐及各周期价格，支持对比后再确认购买。</p></div>
   {config.compareEnabled&&all.length>1&&<button className="secondary live-shop-compare-button" type="button" onClick={()=>setCompareOpen(x=>!x)} aria-expanded={compareOpen} aria-controls="live-plan-compare"><GitCompareArrows size={17}/> 套餐对比 ({compare.length}/3) <ChevronDown size={16}/></button>}
  </div>
  <div className="live-shop-periods" role="group" aria-label="套餐周期">
   <button type="button" aria-pressed={period==='all'} className={period==='all'?'selected':''} onClick={()=>setPeriod('all')}>全部周期</button>
   {options.map(({id,label})=><button type="button" key={id} aria-pressed={period===id} className={period===id?'selected':''} onClick={()=>setPeriod(id)}>{label}</button>)}
  </div>
  <p className="live-shop-count">找到 {visible.length} 个可选套餐{period!=='all'?' · '+labelFor(period):''}</p>
  {visible.length>0?<div className="plans live-shop-grid">
   {visible.map(plan=>{
    const price=catalogPriceFor(plan,period);
    const featured=config.featuredIds.has(String(plan.id));
    const saving=config.showSavings?annualSavings(plan,period==='all'?'year_price':period):null;
    const properties=planFeatures(plan);
    const description=normalizedDescription(plan.content);
    const tags=Array.isArray(plan.tags)?plan.tags.filter(x=>typeof x==='string').slice(0,3):[];
    return <article className={'card product live-shop-plan'+(featured?' live-shop-featured':'')} key={plan.id} data-plan-id={plan.id}>
     <div className="live-shop-plan-top">{featured?<span className="live-shop-recommend"><Check size={14}/> 精选套餐</span>:<span className="live-shop-plain-tag">可选方案</span>}
      {config.compareEnabled&&all.length>1&&<label className="live-shop-compare-check"><input type="checkbox" aria-label={'对比 '+plan.name} checked={compare.includes(String(plan.id))} disabled={!compare.includes(String(plan.id))&&compare.length>=3} onChange={()=>toggle(String(plan.id))}/>对比</label>}
     </div>
     <h3>{plan.name}</h3>
     {tags.length>0&&<div className="live-shop-tags">{tags.map((tag,i)=><span key={i}>{tag}</span>)}</div>}
     {price&&<div className="live-shop-price"><strong>{money(price.price)}</strong><span>/ {labelFor(price.period)}</span></div>}
     {saving&&<p className="live-shop-saving">按 {saving.months} 个月月付价格比较，可少付 {money(saving.saved)}（约 {saving.percent}%）</p>}
     {config.showDescription&&<p className="live-shop-description">{description||'套餐服务内容以服务端说明为准。'}</p>}
     <div className="live-shop-features">
      {properties.map(row=><div key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>)}
      <div><span>可选周期</span><strong>{planPeriods(plan).length} 种</strong></div>
     </div>
     <button className="primary wide live-shop-buy" onClick={()=>onBuy(plan,price.period)}>选择这个套餐 <ArrowRight size={17}/></button>
    </article>
   })}
  </div>:<div className="card live-shop-empty"><Wifi size={27}/><h3>当前周期暂无可选套餐</h3><p>可以切换其他周期查看，或稍后刷新。</p><button type="button" className="secondary" onClick={()=>setPeriod('all')}>查看全部周期</button></div>}
  {config.compareEnabled&&all.length>1&&<div id="live-plan-compare" className="live-shop-compare" hidden={!compareOpen}>
   <div className="live-shop-compare-title"><GitCompareArrows size={18}/><strong>套餐对比</strong><span>最多选择三个套餐；当前显示 {labelFor(period==='all'?'month_price':period)}优先价格。</span></div>
   {selected.length>=2?<div className="live-shop-compare-scroll"><table aria-label="已选套餐对比"><thead><tr><th scope="col">对比项目</th>{selected.map(p=><th key={p.id} scope="col">{p.name}</th>)}</tr></thead><tbody>
    <tr><th scope="row">当前展示价格</th>{selected.map(p=><td key={p.id}>{p.price?money(p.price.price)+' / '+labelFor(p.price.period):'该周期不支持'}</td>)}</tr>
    <tr><th scope="row">流量</th>{selected.map(p=><td key={p.id}>{p.traffic??'—'} GB</td>)}</tr>
    <tr><th scope="row">设备限制</th>{selected.map(p=><td key={p.id}>{Number(p.devices)>0?p.devices+' 台':'未设置限制'}</td>)}</tr>
    <tr><th scope="row">速度上限</th>{selected.map(p=><td key={p.id}>{Number(p.speed)>0?p.speed+' Mbps':'未设置限制'}</td>)}</tr>
    <tr><th scope="row">可购周期</th>{selected.map(p=><td key={p.id}>{p.periods} 种</td>)}</tr>
   </tbody></table></div>:<p className="muted">勾选至少两个套餐后，会在这里展示对应价格与权益对比。</p>}
  </div>}
  <p className="live-shop-disclaimer"><ShieldCheck size={15}/> 套餐价格按 TXBoard 返回数据展示，优惠券、余额抵扣及支付手续费以创建订单后的服务端金额为准。</p>
 </section>;
}
