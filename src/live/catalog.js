// TXBoard native plan catalog. GET /plans returns the PlanCatalog DTO:
// {id,name,content,tags,traffic_limit_bytes,speed_limit_mbps,device_limit,
//  capacity_limit,reset_traffic_method,prices:[{period,amount_minor}],renewable}
// Periods are native keys (monthly, yearly, ...). Amounts are minor units.
import {liveThemeConfig} from './theme-config.js';

export const CATALOG_PERIODS=[
 {id:'monthly',label:'月付',months:1},
 {id:'quarterly',label:'季付',months:3},
 {id:'half_yearly',label:'半年付',months:6},
 {id:'yearly',label:'年付',months:12},
 {id:'two_yearly',label:'两年付',months:24},
 {id:'three_yearly',label:'三年付',months:36},
 {id:'onetime',label:'一次性',months:null}
];
const IDS=new Set(CATALOG_PERIODS.map(x=>x.id));
const bool=(v,fallback)=>v==null?fallback:!(v===false||v===0||v==='0'||v==='false');
const amountOf=entry=>{
 const minor=Number(entry?.amount_minor);
 return Number.isFinite(minor)&&minor>0?Math.round(minor):null;
};
// Prices are a list of {period,amount_minor}; zero/absent prices are not sold.
export function planPrice(plan,period){
 if(!IDS.has(period))return null;
 const entry=(Array.isArray(plan?.prices)?plan.prices:[]).find(item=>item?.period===period);
 return entry?amountOf(entry):null;
}
// The reset-traffic price is a plan price entry but never a subscription
// period, so it is read directly instead of through CATALOG_PERIODS.
export function resetPrice(plan){
 const entry=(Array.isArray(plan?.prices)?plan.prices:[]).find(item=>item?.period==='reset_traffic');
 return entry?amountOf(entry):null;
}
export function planPeriods(plan){
 return CATALOG_PERIODS.filter(item=>planPrice(plan,item.id)!==null);
}
export function parseFeatured(raw){
 const ids=typeof raw==='string'?raw.split(/[,，;；]/):[];
 return new Set(ids.map(x=>x.trim()).filter(x=>/^\d+$/.test(x)&&Number(x)>0).slice(0,20));
}
export function resolveCatalogConfig(guest={},settings={}){
 const source=liveThemeConfig(guest)||settings?.catalog||{};
 const defaultPeriod=String(source.shop_default_period??source.defaultPeriod??'all');
 return {
  defaultPeriod:defaultPeriod==='all'||IDS.has(defaultPeriod)?defaultPeriod:'all',
  featuredIds:parseFeatured(source.shop_featured_ids??source.featuredIds??''),
  compareEnabled:bool(source.shop_compare_enabled??source.compareEnabled,true),
  showSavings:bool(source.shop_show_savings??source.showSavings,true),
  showDescription:bool(source.shop_show_description??source.showDescription,true)
 };
}
// The native catalog already excludes hidden and unsellable plans; a plan
// still needs at least one priced period to be purchasable.
export function availableCatalogPlans(plans){
 return (Array.isArray(plans)?plans:[]).filter(p=>p&&planPeriods(p).length>0);
}
// A plan may expose both recurring and one-time prices. Show it once in each
// applicable category, while keeping checkout tied to its price entry.
export function groupedCatalogPlans(plans){
 const grouped={recurring:[],traffic:[]};
 for(const plan of availableCatalogPlans(plans)){
  const recurring=CATALOG_PERIODS.find(p=>p.id!=='onetime'&&planPrice(plan,p.id)!==null);
  if(recurring)grouped.recurring.push({plan,price:{period:recurring.id,price:planPrice(plan,recurring.id)}});
  const oneTime=planPrice(plan,'onetime');
  if(oneTime!==null)grouped.traffic.push({plan,price:{period:'onetime',price:oneTime}});
 }
 return grouped;
}

export function catalogPriceFor(plan,period='all'){
 const periods=planPeriods(plan);
 if(!periods.length)return null;
 if(period!=='all')return planPrice(plan,period)===null?null:{period,price:planPrice(plan,period)};
 // Default preview uses the shortest recurring period, then one-time.
 const first=periods[0].id;
 return {period:first,price:planPrice(plan,first)};
}
export function annualSavings(plan,period='yearly'){
 const base=planPrice(plan,'monthly');
 const offer=planPrice(plan,period);
 const months=CATALOG_PERIODS.find(x=>x.id===period)?.months;
 if(!months||months<=1||base===null||base<=0||offer===null)return null;
 const comparison=base*months;
 const saved=comparison-offer;
 if(saved<=0)return null;
 return {saved,percent:Math.round(saved/comparison*100),months,comparison};
}
// Plan limits are native byte / mbps / count values, never legacy GiB.
export function planFeatures(plan){
 const result=[];
 if(Number.isFinite(Number(plan?.traffic_limit_bytes))&&plan.traffic_limit_bytes!==null)
  result.push({label:'套餐流量',value:Math.round(Number(plan.traffic_limit_bytes)/1073741824)+' GB'});
 if(Number(plan?.device_limit)>0)result.push({label:'设备限制',value:String(plan.device_limit)+' 台'});
 if(Number(plan?.speed_limit_mbps)>0)result.push({label:'速度上限',value:String(plan.speed_limit_mbps)+' Mbps'});
 if(Number(plan?.capacity_limit)>0)result.push({label:'剩余名额',value:String(plan.capacity_limit)});
 return result;
}
export function normalizedDescription(raw){
 return String(raw??'').replace(/<\s*br\s*\/?>/gi,' ')
  .replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim().slice(0,220);
}
export function catalogCompare(plans,ids,period){
 return (Array.isArray(plans)?plans:[]).filter(p=>ids.includes(String(p.id)))
  .map(p=>({id:String(p.id),name:p.name,price:catalogPriceFor(p,period),
   traffic:p.traffic_limit_bytes,devices:p.device_limit,speed:p.speed_limit_mbps,
   periods:planPeriods(p).length}));
}
