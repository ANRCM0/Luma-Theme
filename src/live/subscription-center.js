// Subscription helpers over the native GET /me/subscription DTO:
// {subscribe_url,reset_day,plan:{id,name,traffic_limit_bytes},upload_bytes,
//  download_bytes,traffic_limit_bytes,device_limit,speed_limit_mbps,
//  expired_at,next_reset_at}  (all timestamps ISO 8601).
// UI hints never grant renew/reset permissions.
import {liveThemeConfig} from './theme-config.js';
import {epochMs} from './api.js';

const flag=(raw,fallback)=>raw==null?fallback:!(raw===false||raw===0||raw==='0'||raw==='false');
const numeric=raw=>raw===null||raw===undefined||raw===''?null:Number.isFinite(Number(raw))?Number(raw):null;
export function resolveSubscriptionConfig(guest={},settings={}){
 const src=liveThemeConfig(guest)||settings?.subscriptionCenter||{};
 return {
  clientGuide:flag(src.subscription_client_guide??src.clientGuide,true),
  resetAction:flag(src.subscription_reset_action??src.resetAction,true),
  renewalAction:flag(src.subscription_renew_action??src.renewalAction,true),
  showNextReset:flag(src.subscription_show_next_reset??src.showNextReset,true)
 };
}
export function subscriptionUsage(subscription={},user={}){
 // The subscription DTO is authoritative; the account DTO carries the same
 // figures nested under traffic.* and is only a fallback.
 // A zero/absent subscription quota must fall through to the account traffic
 // object and then the plan allowance; `??` alone stops at the first 0.
 const positive=value=>{const n=numeric(value);return n!==null&&n>0?n:null};
 const total=positive(subscription?.traffic_limit_bytes)
  ??positive(user?.traffic?.limit_bytes)
  ??positive(subscription?.plan?.traffic_limit_bytes);
 const u=Math.max(0,numeric(subscription?.upload_bytes)??numeric(user?.traffic?.upload_bytes)??0);
 const d=Math.max(0,numeric(subscription?.download_bytes)??numeric(user?.traffic?.download_bytes)??0);
 const used=u+d;
 const remaining=total===null?null:Math.max(0,total-used);
 const usedPercent=total===null||total<=0?null:Math.round(Math.min(100,used/total*100));
 return {total,used,remaining,uploaded:u,downloaded:d,usedPercent};
}
export function subscriptionState(subscription={},user={},now=Date.now()){
 const planId=Number(subscription?.plan?.id??user?.plan_id??0);
 const hasPlan=Number.isSafeInteger(planId)&&planId>0;
 const expiry=epochMs(subscription?.expired_at??user?.expired_at);
 const usage=subscriptionUsage(subscription,user);
 const expired=hasPlan&&expiry!==null&&expiry<=now;
 return {hasPlan,planId:hasPlan?planId:null,expired,expiry,usage};
}
export function nextResetLabel(subscription={}){
 const timestamp=epochMs(subscription?.next_reset_at);
 if(timestamp)return {value:timestamp,kind:'timestamp'};
 const days=numeric(subscription?.reset_day);
 if(days!==null&&days>=0&&Number.isInteger(days))return {value:days,kind:'days'};
 return null;
}
export function canAttemptReset(subscription={},user={},now=Date.now()){
 const state=subscriptionState(subscription,user,now);
 // TXBoard further checks isAvailable, ownership, plan pricing and the
 // reset_traffic_method at order creation. Unknown/no quota fails closed.
 if(!state.hasPlan||state.expired||!state.usage.total)return false;
 const mode=subscription?.plan?.reset_traffic_method;
 if(mode===2||mode==='2')return false;
 return true;
}
// Renewal capability lives on the plan catalog (GET /plans -> renewable); the
// subscription DTO only names the plan. `catalogPlan` is the matching entry
// from /plans, so an unknown plan fails open (the backend still decides).
export function canAttemptRenew(subscription={},user={},catalogPlan=null){
 const state=subscriptionState(subscription,user);
 if(!state.hasPlan)return false;
 const renewable=catalogPlan?.renewable??subscription?.plan?.renewable;
 return renewable!==false;
}
export function displayDate(ms,locale='zh-CN'){
 if(ms===null)return '长期有效';
 return new Date(ms).toLocaleDateString(locale,{year:'numeric',month:'2-digit',day:'2-digit'});
}
