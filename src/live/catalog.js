// TXBoard plan catalog display helpers. Prices are integer cent amounts returned
// by PlanResource; discounts here are comparisons, never checkout totals.
export const CATALOG_PERIODS=[
 {id:'month_price',label:'月付',months:1},
 {id:'quarter_price',label:'季付',months:3},
 {id:'half_year_price',label:'半年付',months:6},
 {id:'year_price',label:'年付',months:12},
 {id:'two_year_price',label:'两年付',months:24},
 {id:'three_year_price',label:'三年付',months:36},
 {id:'onetime_price',label:'一次性',months:null}
];
const IDS=new Set(CATALOG_PERIODS.map(x=>x.id));
const bool=(v,fallback)=>v==null?fallback:!(v===false||v===0||v==='0'||v==='false');
export function planPrice(plan,period){
 if(!IDS.has(period))return null;
 const raw=plan?.[period];
 if(raw===null||raw===undefined||raw==='')return null;
 const cents=Number(raw);
 return Number.isFinite(cents)&&cents>=0?Math.round(cents):null;
}
export function planPeriods(plan){
 return CATALOG_PERIODS.filter(item=>planPrice(plan,item.id)!==null);
}
export function parseFeatured(raw){
 const ids=typeof raw==='string'?raw.split(/[,，;；]/):[];
 return new Set(ids.map(x=>x.trim()).filter(x=>/^\d+$/.test(x)&&Number(x)>0).slice(0,20));
}
export function resolveCatalogConfig(guest={},settings={}){
 const remote=guest?.frontend_theme==='vv-theme'&&guest?.theme_config&&
  typeof guest.theme_config==='object'&&!Array.isArray(guest.theme_config)
  ?guest.theme_config:null;
 const source=remote||settings?.catalog||{};
 const defaultPeriod=String(source.shop_default_period??source.defaultPeriod??'all');
 return {
  defaultPeriod:defaultPeriod==='all'||IDS.has(defaultPeriod)?defaultPeriod:'all',
  featuredIds:parseFeatured(source.shop_featured_ids??source.featuredIds??''),
  compareEnabled:bool(source.shop_compare_enabled??source.compareEnabled,true),
  showSavings:bool(source.shop_show_savings??source.showSavings,true),
  showDescription:bool(source.shop_show_description??source.showDescription,true)
 };
}
export function availableCatalogPlans(plans){
 return (Array.isArray(plans)?plans:[])
  .filter(p=>p&&p.show!==false&&p.show!==0&&p.sell!==false&&p.sell!==0&&planPeriods(p).length>0);
}
export function catalogPriceFor(plan,period='all'){
 const periods=planPeriods(plan);
 if(!periods.length)return null;
 if(period!=='all')return planPrice(plan,period)===null?null:{period,price:planPrice(plan,period)};
 // Default preview uses the shortest recurring period, then one-time.
 const first=periods[0].id;
 return {period:first,price:planPrice(plan,first)};
}
export function annualSavings(plan,period='year_price'){
 const base=planPrice(plan,'month_price');
 const offer=planPrice(plan,period);
 const months=CATALOG_PERIODS.find(x=>x.id===period)?.months;
 if(!months||months<=1||base===null||base<=0||offer===null)return null;
 const comparison=base*months;
 const saved=comparison-offer;
 if(saved<=0)return null;
 return {saved,percent:Math.round(saved/comparison*100),months,comparison};
}
export function planFeatures(plan){
 const result=[];
 if(Number.isFinite(Number(plan?.transfer_enable))&&plan.transfer_enable!==null)result.push({label:'套餐流量',value:String(plan.transfer_enable)+' GB'});
 if(Number(plan?.device_limit)>0)result.push({label:'设备限制',value:String(plan.device_limit)+' 台'});
 if(Number(plan?.speed_limit)>0)result.push({label:'速度上限',value:String(plan.speed_limit)+' Mbps'});
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
   traffic:p.transfer_enable,devices:p.device_limit,speed:p.speed_limit,
   periods:planPeriods(p).length}));
}
