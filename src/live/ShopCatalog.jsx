import React,{useEffect,useState} from 'react';
import {ArrowRight,Check,ChevronDown,GitCompareArrows,Gem,Package,ShieldCheck,Wifi} from 'lucide-react';
import {CATALOG_PERIODS,availableCatalogPlans,groupedCatalogPlans,normalizedDescription,planFeatures,planPeriods,annualSavings} from './catalog.js';

const labelFor=id=>CATALOG_PERIODS.find(p=>p.id===id)?.label||'套餐';
const sections=[
 {id:'recurring',title:'周期订阅',description:'定期续费，购买时选择适合你的计费周期。',Icon:Gem},
 {id:'traffic',title:'流量包订阅',description:'一次性购买流量包，具体有效期与使用规则以套餐说明为准。',Icon:Package}
];

export default function ShopCatalog({plans,config,atomic={},money,onBuy}){
 const [compare,setCompare]=useState([]);
 const [compareOpen,setCompareOpen]=useState(false);
 const all=availableCatalogPlans(plans);
 const grouped=groupedCatalogPlans(all);
 const visibleSections=sections.filter(section=>section.id==='recurring'?atomic.cycle!==false:atomic.traffic!==false)
  .sort((a,b)=>atomic.order==='traffic'?(a.id==='traffic'?-1:1):(a.id==='recurring'?-1:1))
  .filter(section=>atomic.showEmptySections!==false||grouped[section.id].length>0);
 const entries=visibleSections.flatMap(group=>grouped[group.id].map(({plan,price})=>({
  key:group.id+':'+plan.id,kind:group.id,plan,price
 })));
 useEffect(()=>{
  const known=new Set(entries.map(entry=>entry.key));
  setCompare(keys=>keys.filter(key=>known.has(key)));
 },[plans]);
 const selected=entries.filter(entry=>compare.includes(entry.key));
 const toggle=key=>setCompare(keys=>keys.includes(key)?keys.filter(x=>x!==key):keys.length<3?[...keys,key]:keys);
 return <section className="live-shop" aria-label="套餐商店">
  {all.length===0?<div className="card live-shop-empty"><Wifi size={27}/><h3>暂无可售套餐</h3><p>请稍后刷新页面查看。</p></div>
   :visibleSections.length?visibleSections.map(({id,title,description,Icon})=><section className="live-shop-category" key={id} aria-label={title}>
    <div className="live-shop-category-head">
     <div className="live-shop-category-title"><span className="live-shop-category-icon"><Icon size={19}/></span><h2>{title}</h2></div>
     {atomic.showGroupDescription!==false&&<p>{description}</p>}
    </div>
    {grouped[id].length>0?<div className="plans live-shop-grid">
     {grouped[id].map(({plan,price})=>{
      const key=id+':'+plan.id;
      const categoryId=Number(id==='recurring'?atomic.cycleFeaturedId:atomic.trafficFeaturedId);
      const featured=(categoryId>0&&categoryId===Number(plan.id))||(categoryId===0&&config.featuredIds.has(String(plan.id)));
      const featureLimit=Number(id==='recurring'?atomic.cycleFeatureLimit:atomic.trafficFeatureLimit)||0;
      const descriptionText=normalizedDescription(plan.content);
      const properties=atomic.showFeatures===false?[]:planFeatures(plan).slice(0,featureLimit>0?featureLimit:undefined);
      const savings=id==='recurring'&&atomic.showSavings===true?annualSavings(plan):null;
      const tags=Array.isArray(plan.tags)?plan.tags.filter(tag=>typeof tag==='string').slice(0,3):[];
      const both=grouped.recurring.some(item=>String(item.plan.id)===String(plan.id))&&grouped.traffic.some(item=>String(item.plan.id)===String(plan.id));
      return <article className={'card product live-shop-plan'+(featured?' live-shop-featured':'')} key={key} data-plan-id={plan.id} data-plan-type={id}>
       <div className="live-shop-plan-top">
        {featured?<span className="live-shop-recommend"><Check size={14}/> 精选套餐</span>
          :<span className="live-shop-plan-mark"><Icon size={21} aria-hidden="true"/></span>}
        {config.compareEnabled&&entries.length>1&&<label className="live-shop-compare-check">
         <input type="checkbox" aria-label={'对比 '+plan.name+(both?' · '+title:'')} checked={compare.includes(key)} disabled={!compare.includes(key)&&compare.length>=3} onChange={()=>toggle(key)}/>对比
        </label>}
       </div>
       <h3>{plan.name}</h3>
       {atomic.showTags!==false&&tags.length>0&&<div className="live-shop-tags">{tags.map((tag,i)=><span key={i}>{tag}</span>)}</div>}
       <div className="live-shop-price"><strong>{money(price.price)}</strong><span>/ {id==='traffic'?'一次性':labelFor(price.period)}</span></div>
       {savings&&<p className="live-shop-atomic-saving">年付比按月支付节省 {money(savings.saved)}（约 {savings.percent}%）</p>}
       {config.showDescription&&descriptionText&&<p className="live-shop-description">{descriptionText}</p>}
       {properties.length>0&&<div className="live-shop-features">
        {properties.map(row=><div key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>)}
       </div>}
       <button type="button" className="primary wide live-shop-buy" onClick={()=>onBuy(plan,price.period)}>立即购买 <ArrowRight size={17}/></button>
      </article>;
     })}
    </div>:<p className="live-shop-category-empty">暂无可售{title==='周期订阅'?'周期套餐':'一次性流量包'}</p>}
   </section>):<div className="card live-shop-empty"><p>当前未展示套餐分组，请在主题设置中开启至少一种套餐类型。</p></div>}
  {config.compareEnabled&&entries.length>1&&<div className="live-shop-compare-footer">
   <button className="secondary live-shop-compare-button" type="button" onClick={()=>setCompareOpen(x=>!x)} aria-expanded={compareOpen} aria-controls="live-plan-compare"><GitCompareArrows size={17}/> 套餐对比 ({compare.length}/3) <ChevronDown size={16}/></button>
   <div id="live-plan-compare" className="live-shop-compare" hidden={!compareOpen}>
    <div className="live-shop-compare-title"><GitCompareArrows size={18}/><strong>套餐对比</strong><span>最多选择三个方案，价格为各卡片实际展示的价格。</span></div>
    {selected.length>=2?<div className="live-shop-compare-scroll"><table aria-label="已选套餐对比"><thead><tr><th scope="col">对比项目</th>{selected.map(e=><th key={e.key} scope="col">{e.plan.name} · {e.kind==='traffic'?'流量包':'周期'}</th>)}</tr></thead><tbody>
     <tr><th scope="row">当前展示价格</th>{selected.map(e=><td key={e.key}>{money(e.price.price)+' / '+labelFor(e.price.period)}</td>)}</tr>
     <tr><th scope="row">流量</th>{selected.map(e=><td key={e.key}>{e.plan.transfer_enable??'—'} GB</td>)}</tr>
     <tr><th scope="row">设备限制</th>{selected.map(e=><td key={e.key}>{Number(e.plan.device_limit)>0?e.plan.device_limit+' 台':'未设置限制'}</td>)}</tr>
     <tr><th scope="row">速度上限</th>{selected.map(e=><td key={e.key}>{Number(e.plan.speed_limit)>0?e.plan.speed_limit+' Mbps':'未设置限制'}</td>)}</tr>
     <tr><th scope="row">可购周期</th>{selected.map(e=><td key={e.key}>{e.kind==='traffic'?'一次性':planPeriods(e.plan).filter(p=>p.id!=='onetime_price').length+' 种'}</td>)}</tr>
    </tbody></table></div>:<p className="muted">勾选至少两个套餐后，可以在这里比较价格和权益。</p>}
   </div>
  </div>}
  <p className="live-shop-disclaimer"><ShieldCheck size={15}/> 套餐价格来自 TXBoard，最终订单金额由服务端确认。</p>
 </section>;
}
