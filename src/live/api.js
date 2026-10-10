// TXBoard native API client. Every request targets the /txapi namespace and
// speaks its native envelope: {data, meta?, request_id} on success and
// {error:{code,message,fields?}, request_id} on failure. No Xboard aliases and
// no legacy field names: the payloads below are the native DTOs verbatim.
import {safeWebUrl} from './browser-safety.js';
import {nodeRows,trafficRows,knowledgeRows,noticeRows,orderRows,ticketRows} from './user-data.js';
const AUTH_KEY = 'xboard_auth_data';

// Native plan periods (Plan::getAvailablePeriods keys). The legacy *_price
// aliases are accepted by the backend on write but never returned on read.
export const PERIODS = [
  ['monthly','月付'],['quarterly','季付'],['half_yearly','半年付'],
  ['yearly','年付'],['two_yearly','两年付'],['three_yearly','三年付'],
  ['onetime','一次性'],['reset_traffic','重置流量']
];

// Every native amount is an integer in minor units (cents).
export const money = minor => '¥' + (Number(minor || 0) / 100).toFixed(2);
export const bytes = value => {
  const n=Number(value || 0);
  if (!n) return '0 B';
  const units=['B','KB','MB','GB','TB'];
  const power=Math.min(4,Math.floor(Math.log(n)/Math.log(1024)));
  return (n/1024**power).toFixed(power>1?2:0)+' '+units[power];
};
// Native timestamps are ISO 8601 strings (or null), never epoch seconds.
export const epochMs = value => {
  if (!value) return null;
  const ms=Date.parse(value);
  return Number.isFinite(ms)?ms:null;
};
export const dateTime = value => {
  const ms=epochMs(value);
  return ms===null?'—':new Date(ms).toLocaleString('zh-CN');
};
export const dateOnly = value => {
  const ms=epochMs(value);
  return ms===null?'—':new Date(ms).toLocaleDateString('zh-CN');
};

export function getToken() {
  try { const token=(localStorage.getItem(AUTH_KEY)||'').trim(); return token ? (/^Bearer\s+/i.test(token)?token:'Bearer '+token) : ''; }
  catch { return ''; }
}
export function saveToken(value) {
  const token=String(value||'').trim();
  if (!token) throw Error('登录接口未返回有效凭证');
  localStorage.setItem(AUTH_KEY,/^Bearer\s+/i.test(token)?token:'Bearer '+token);
}
export function clearToken() { localStorage.removeItem(AUTH_KEY); }
export class ApiError extends Error {
  constructor(message,status,code) { super(message); this.name='ApiError'; this.status=status; this.code=code||null; }
}
export async function api(path,options={}) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  const {auth=true,method='GET',body,preserveEnvelope=false,...rest}=options;
  const headers={Accept:'application/json'};
  const requestToken=auth?getToken():'';
  if(body!==undefined)headers['Content-Type']='application/json';
  if(requestToken)headers.Authorization=requestToken;
  try {
    const response=await fetch('/txapi'+path,{
      method,headers,credentials:'same-origin',signal:controller.signal,
      ...(body!==undefined?{body:JSON.stringify(body)}:{}),...rest
    });
    const result=await response.json().catch(()=>null);
    // Native failures carry {error:{code,message}} and can still use a 2xx
    // status, so the envelope is inspected before the HTTP status.
    if(result&&typeof result==='object'&&result.error){
      const code=result.error.code||null;
      const message=result.error.message||('HTTP '+response.status);
      if(auth&&(response.status===401||code==='UNAUTHORIZED'||code==='TOKEN_INVALID')){
        // A stale response from an earlier account must not sign out a new login.
        if(requestToken&&getToken()===requestToken){
          clearToken();
          if(typeof window!=='undefined')window.dispatchEvent(new Event('txboard:unauthorized'));
        }
      }
      throw new ApiError(message,response.status,code);
    }
    if(!response.ok) {
      const message=result?.message||('HTTP '+response.status);
      if(auth&&(response.status===401||response.status===403)){
        if(requestToken&&getToken()===requestToken){
          clearToken();
          if(typeof window!=='undefined')window.dispatchEvent(new Event('txboard:unauthorized'));
        }
      }
      throw new ApiError(message,response.status);
    }
    if(result&&typeof result==='object'&&'data' in result) {
      return preserveEnvelope?result:result.data;
    }
    // Native endpoints always wrap; this only guards a malformed response.
    return result;
  } catch(error) {
    if(error.name==='AbortError')throw new ApiError('请求超时，请检查网络连接',0);
    throw error;
  } finally {clearTimeout(timer);}
}
export const get=(path,params,auth=true)=>api(path+(params?'?'+new URLSearchParams(params).toString():''),{auth});
export const post=(path,body,auth=true)=>api(path,{method:'POST',body,auth});
export const patch=(path,body)=>api(path,{method:'PATCH',body});
export const del=(path)=>api(path,{method:'DELETE'});

// --- public ---------------------------------------------------------------
// /public/site-config returns the active theme and its public theme_config.
export const siteConfig=async()=>{
  const config=await get('/public/site-config',null,false);
  if(!config||typeof config!=='object'||Array.isArray(config))return {};
  // Some builds serialize theme_config as JSON text; normalize it once so
  // every resolver can assume a plain object.
  if(typeof config.theme_config==='string'){
    try{config.theme_config=JSON.parse(config.theme_config)}
    catch{config.theme_config=null}
  }
  return config;
};
export const guest=siteConfig;

// --- auth -----------------------------------------------------------------
export const login=async(email,password,captcha={})=>{
  const result=await post('/auth/login',{email,password,...captcha},false);
  // TXBoard returns data.auth_data already prefixed with "Bearer ".
  saveToken(result?.auth_data);return result;
};
export const register=async(data)=>{const result=await post('/auth/register',data,false);saveToken(result?.auth_data);return result;};
export const tokenLogin=async(verify)=>{
  const result=await post('/auth/one-time-token',{verify},false);
  saveToken(result?.auth_data);return result;
};
export const logout=()=>post('/auth/logout',{});
// There is no dedicated session probe; a successful /me read proves the token.
export const verifySession=async()=>{
  const me=await get('/me');
  return {is_login:Boolean(me&&(me.id!=null||me.email)),user:me};
};
export const sendVerify=(email,purpose,captcha={})=>post('/auth/email-code',{email,purpose,...captcha},false);
export const forgetPassword=(email,password,email_code,captcha={})=>post('/auth/password/forgot',{email,password,email_code,...captcha},false);
export const changePassword=(old_password,new_password)=>post('/auth/password',{old_password,new_password});
export const quickLoginUrl=()=>post('/auth/quick-login',{}).then(result=>result?.url);
export const activeSessions=()=>get('/auth/sessions');
export const removeSession=sessionId=>del('/auth/sessions/'+encodeURIComponent(sessionId));

// --- account --------------------------------------------------------------
export const user=()=>get('/me');
export const subscribe=()=>get('/me/subscription');
export const userCommConfig=()=>get('/me/site-config');
export const stat=()=>get('/me/dashboard-stats');
// Rotates the subscription secret so old subscription URLs stop working.
export const resetSecurity=()=>post('/me/subscription-credentials/rotate',{}).then(result=>result?.subscribe_url);
export const preferences=()=>get('/me/preferences');
export const updateUserSettings=(values)=>patch('/me/preferences',values);
export const serverNodes=async()=>nodeRows(await api('/me/nodes',{cache:'no-store'}));

// --- catalog --------------------------------------------------------------
export const plans=()=>get('/plans');
export const plan=planId=>get('/plans/'+encodeURIComponent(planId));

// --- orders ---------------------------------------------------------------
export const orders=async()=>orderRows(await get('/orders'));
export const orderDetail=tradeNo=>get('/orders/'+encodeURIComponent(tradeNo)+'/detail');
// Status reads use the lightweight order projection, never the detail one.
export const orderCheck=async tradeNo=>{
  const order=await get('/orders/'+encodeURIComponent(tradeNo));
  return order?.status??null;
};
export const createOrder=(plan_id,period,coupon_code)=>
  post('/orders',{plan_id,period,...(coupon_code?{coupon_code}:{})}).then(result=>result?.trade_no);
export const cancelOrder=tradeNo=>post('/orders/'+encodeURIComponent(tradeNo)+'/cancel',{});
export const checkout=(tradeNo,method,token)=>api('/orders/'+encodeURIComponent(tradeNo)+'/checkout',{method:'POST',body:{...(method!==undefined?{method}:{}),...(token?{token}:{})},preserveEnvelope:true});
export const payments=()=>get('/billing/payment-methods');
export const checkCoupon=(code,plan_id,period)=>post('/billing/coupons/check',{code,plan_id,period});

// --- tickets --------------------------------------------------------------
export const tickets=async()=>ticketRows(await get('/tickets'));
export const ticketDetail=id=>get('/tickets/'+encodeURIComponent(id));
export const createTicket=(subject,level,message)=>post('/tickets',{subject,level,message}).then(result=>result?.id);
export const replyTicket=(id,message)=>post('/tickets/'+encodeURIComponent(id)+'/messages',{message});
export const closeTicket=(id)=>post('/tickets/'+encodeURIComponent(id)+'/close',{});

// --- content --------------------------------------------------------------
export const notices=async()=>noticeRows(await get('/notices'));
export const knowledgeArticles=async language=>knowledgeRows(await get('/knowledge',language?{language}:null));

// --- traffic --------------------------------------------------------------
export const trafficLog=async()=>trafficRows(await get('/traffic/logs'));

// --- invites & commissions ------------------------------------------------
export const invites=()=>get('/invites');
export const createInvite=()=>post('/invites',{});
export const commissions=async()=>orderRows(await get('/billing/commissions'));
export const transferCommission=(transfer_amount)=>post('/billing/commission-transfer',{transfer_amount});
export const withdrawCommission=(withdraw_method,withdraw_account)=>post('/billing/withdrawals',{withdraw_method,withdraw_account});
export const wallet=()=>get('/billing/wallet');

// --- gift cards -----------------------------------------------------------
export const giftCheck=code=>post('/gift-cards/check',{code});
export const giftRedeem=code=>post('/gift-cards/redeem',{code});
export const giftHistory=(page=1,per_page=15)=>get('/gift-cards/history',{page,per_page});
export const giftDetail=id=>get('/gift-cards/history/'+encodeURIComponent(id));

// --- payments -------------------------------------------------------------
export const stripePublicKey=id=>post('/billing/stripe-public-key',{id});

export const safeExternal=(value)=>safeWebUrl(value,{origin:typeof location!=='undefined'?location.origin:'https://example.test',allowHttpLoopback:typeof location!=='undefined'&&['localhost','127.0.0.1','::1'].includes(location.hostname)});
