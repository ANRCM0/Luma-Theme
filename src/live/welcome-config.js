// User dashboard presentation rules. TXBoard remains the authority for
// subscription, traffic and expiry data; these rules do not change entitlements.
export const GIB=1073741824;
export const DEFAULT_WELCOME_CONFIG=Object.freeze({
 enabled:true,
 newUserHours:48,
 expiryHours:72,
 trafficLowGB:10,
 trafficLowPercent:10,
 secondaryCard:'recommend'
});
const bool=(value,fallback)=>value==null?fallback:!(value===false||value===0||value==='0'||value==='false');
const bounded=(raw,fallback,min,max)=>{
 if(raw==null||String(raw).trim()==='')return fallback;
 const n=Number(raw);
 return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
};
const nonnegative=raw=>{
 if(raw==null||raw==='')return null;
 const value=Number(raw);
 return Number.isFinite(value)&&value>=0?value:null;
};
const epochSeconds=raw=>{
 const n=nonnegative(raw);
 return n===null||n===0?null:n>1e12?n/1000:n;
};

export function resolveWelcomeConfig(guest={},settings={}){
 const remote=guest?.frontend_theme==='vv-theme'&&guest?.theme_config&&
  typeof guest.theme_config==='object'&&!Array.isArray(guest.theme_config)
  ?guest.theme_config:null;
 const source=remote||settings?.welcome||{};
 const card=String(source.welcome_secondary_card??source.secondaryCard??'recommend');
 return {
  enabled:bool(source.welcome_enabled??source.enabled,true),
  newUserHours:bounded(source.welcome_new_hours??source.newUserHours,48,0,720),
  expiryHours:bounded(source.welcome_expiry_hours??source.expiryHours,72,0,720),
  trafficLowGB:bounded(source.welcome_low_traffic_gb??source.trafficLowGB,10,0,10000),
  trafficLowPercent:bounded(source.welcome_low_traffic_percent??source.trafficLowPercent,10,0,100),
  secondaryCard:['recommend','usage','wallet'].includes(card)?card:'recommend'
 };
}

export function subscriptionMetrics(user={},subscription={}){
 const planId=Number(subscription?.plan_id??user?.plan_id??0);
 const hasPlan=Boolean((Number.isFinite(planId)&&planId>0)||subscription?.plan?.id);
 const up=nonnegative(subscription?.u),down=nonnegative(subscription?.d);
 const used=(up??0)+(down??0);
 // The subscribe endpoint returns transfer_enable as a byte count, and the
 // plan object expresses it in GiB. Never confuse the two units.
 const subQuota=nonnegative(subscription?.transfer_enable);
 const userQuota=nonnegative(user?.transfer_enable);
 const planGB=nonnegative(subscription?.plan?.transfer_enable);
 const total=subQuota!==null&&subQuota>0?subQuota
  :userQuota!==null&&userQuota>0?userQuota
  :planGB!==null&&planGB>0?planGB*GIB:null;
 const remaining=total===null?null:Math.max(0,total-used);
 const expiry=epochSeconds(subscription?.expired_at??user?.expired_at);
 const created=epochSeconds(user?.created_at);
 return {hasPlan,used,total,remaining,expiry,created,planName:subscription?.plan?.name||null};
}

export function classifyWelcome(user={},subscription={},config=DEFAULT_WELCOME_CONFIG,nowMs=Date.now()){
 const metrics=subscriptionMetrics(user,subscription);
 const now=nowMs/1000;
 const details={...metrics,expiryHours:metrics.expiry===null?null:(metrics.expiry-now)/3600};
 let state='normal';
 if(!metrics.hasPlan){
  const ageHours=metrics.created===null?null:(now-metrics.created)/3600;
  state=ageHours!==null&&ageHours>=0&&ageHours<=config.newUserHours?'new':'no_plan';
 }else if(metrics.expiry!==null&&metrics.expiry<=now){
  state='expired';
 }else if(metrics.remaining!==null&&metrics.remaining<=0){
  state='exhausted';
 }else if(metrics.expiry!==null&&metrics.expiry>now&&metrics.expiry-now<=config.expiryHours*3600){
  state='expiring';
 }else if(metrics.remaining!==null&&metrics.total>0){
  const limit=Math.min(config.trafficLowGB*GIB,metrics.total*config.trafficLowPercent/100);
  if(limit>0&&metrics.remaining<=limit)state='low_traffic';
 }
 return {...details,state};
}

const CONTENT={
 new:{eyebrow:'GETTING STARTED',heading:'欢迎加入，开启新旅程',description:'账号已经准备好了。选择一个适合自己的套餐，即可开始使用服务。',primary:'挑选入门套餐',action:'shop',secondary:'了解服务支持',secondaryAction:'ticket',tone:'welcome'},
 no_plan:{eyebrow:'GET STARTED',heading:'还没有订阅套餐',description:'当前账号暂未订阅服务。可以先浏览套餐，按需选择合适的周期。',primary:'浏览可用套餐',action:'shop',secondary:'获取帮助',secondaryAction:'ticket',tone:'welcome'},
 expired:{eyebrow:'SUBSCRIPTION EXPIRED',heading:'你的订阅已到期',description:'订阅有效期已经结束。请查看可续费的套餐，恢复正常使用。',primary:'续费或选择套餐',action:'shop',secondary:'查看历史订单',secondaryAction:'orders',tone:'warning'},
 exhausted:{eyebrow:'DATA ALLOWANCE USED',heading:'本期流量已用完',description:'已使用当前可用的全部流量。可以查看升级方案，或核对套餐的重置周期。',primary:'查看升级套餐',action:'shop',secondary:'联系服务支持',secondaryAction:'ticket',tone:'warning'},
 expiring:{eyebrow:'RENEWAL REMINDER',heading:'订阅即将到期',description:'当前订阅即将到期。建议提前查看续费选项，避免服务中断。',primary:'查看续费方案',action:'shop',secondary:'查看订单',secondaryAction:'orders',tone:'attention'},
 low_traffic:{eyebrow:'TRAFFIC REMINDER',heading:'剩余流量不多了',description:'当前套餐的流量接近用尽，可以提前了解套餐升级方案。',primary:'查看可用套餐',action:'shop',secondary:'联系服务支持',secondaryAction:'ticket',tone:'attention'},
 normal:{eyebrow:'WELCOME BACK',heading:'欢迎回来',description:'订阅运行正常。可以在这里查看剩余流量、到期日期并管理服务。',primary:'管理我的套餐',action:'shop',secondary:'获取帮助',secondaryAction:'ticket',tone:'normal'}
};

export function welcomeContent(state,enabled=true){
 return CONTENT[enabled?state:'normal']||CONTENT.normal;
}
