// Subscription center helpers use the authenticated TXBoard user/getSubscribe
// response. UI hints do not grant renew/reset permissions.
const GI_B=1073741824;
const flag=(raw,fallback)=>raw==null?fallback:!(raw===false||raw===0||raw==='0'||raw==='false');
const numeric=(raw)=>raw===null||raw===undefined||raw===''?null:Number.isFinite(Number(raw))?Number(raw):null;
export function resolveSubscriptionConfig(guest={},settings={}){
 const remote=guest?.frontend_theme==='vv-theme'&&guest?.theme_config&&typeof guest.theme_config==='object'&&!Array.isArray(guest.theme_config)?guest.theme_config:null;
 const src=remote||settings?.subscriptionCenter||{};
 return {
  clientGuide:flag(src.subscription_client_guide??src.clientGuide,true),
  resetAction:flag(src.subscription_reset_action??src.resetAction,true),
  renewalAction:flag(src.subscription_renew_action??src.renewalAction,true),
  showNextReset:flag(src.subscription_show_next_reset??src.showNextReset,true)
 };
}
export function subscriptionUsage(subscription={},user={}){
 const rawTotal=numeric(subscription?.transfer_enable);
 const accountTotal=numeric(user?.transfer_enable);
 const planGiB=numeric(subscription?.plan?.transfer_enable);
 const total=rawTotal!==null&&rawTotal>0?rawTotal:accountTotal!==null&&accountTotal>0?accountTotal:planGiB!==null&&planGiB>0?planGiB*GI_B:null;
 const u=Math.max(0,numeric(subscription?.u)??0),d=Math.max(0,numeric(subscription?.d)??0);
 const used=u+d;
 const remaining=total===null?null:Math.max(0,total-used);
 const usedPercent=total===null||total<=0?null:Math.round(Math.min(100,used/total*100));
 return {total,used,remaining,uploaded:u,downloaded:d,usedPercent};
}
export function epochTime(raw){
 const v=numeric(raw);
 if(v===null||v<=0)return null;
 const ms=v>100000000000?v:v*1000;
 return Number.isFinite(ms)&&ms<8640000000000000?ms:null;
}
export function nextResetLabel(subscription={}){
 const timestamp=epochTime(subscription?.next_reset_at);
 if(timestamp)return {value:timestamp,kind:'timestamp'};
 const days=numeric(subscription?.reset_day);
 if(days!==null&&days>=0&&Number.isInteger(days))return {value:days,kind:'days'};
 return null;
}
export function subscriptionState(subscription={},user={},now=Date.now()){
 const id=Number(subscription?.plan_id??user?.plan_id??0);
 const hasPlan=id>0&&Number.isSafeInteger(id);
 const expiry=epochTime(subscription?.expired_at??user?.expired_at);
 const usage=subscriptionUsage(subscription,user);
 const expired=hasPlan&&expiry!==null&&expiry<=now;
 return {hasPlan,planId:hasPlan?id:null,expired,expiry,usage};
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
export function canAttemptRenew(subscription={},user={}){
 const state=subscriptionState(subscription,user);
 return state.hasPlan&&subscription?.plan?.renew!==false&&subscription?.plan?.renew!==0;
}
export function displayDate(ms,locale='zh-CN'){
 if(ms===null)return '长期有效';
 return new Date(ms).toLocaleDateString(locale,{year:'numeric',month:'2-digit',day:'2-digit'});
}
