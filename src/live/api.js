// TXBoard V1 API integration. Keep the token format compatible with web/user/src/api/client.ts.
import {safeWebUrl} from './browser-safety.js';
const AUTH_KEY = 'xboard_auth_data';
export const PERIODS = [
  ['month_price','月付'],['quarter_price','季付'],['half_year_price','半年付'],
  ['year_price','年付'],['two_year_price','两年付'],['three_year_price','三年付'],
  ['onetime_price','一次性'],['reset_price','重置流量']
];
export const money = value => '¥' + (Number(value || 0) / 100).toFixed(2);
export const bytes = value => {
  const n=Number(value || 0);
  if (!n) return '0 B';
  const units=['B','KB','MB','GB','TB'];
  const power=Math.min(4,Math.floor(Math.log(n)/Math.log(1024)));
  return (n/1024**power).toFixed(power>1?2:0)+' '+units[power];
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
  constructor(message,status) { super(message); this.name='ApiError'; this.status=status; }
}
export async function api(path,options={}) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  const {auth=true,method='GET',body,preserveEnvelope=false,...rest}=options;
  const headers={Accept:'application/json'};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(auth&&getToken())headers.Authorization=getToken();
  try {
    const response=await fetch('/api/v1'+path,{
      method,headers,credentials:'same-origin',signal:controller.signal,
      ...(body!==undefined?{body:JSON.stringify(body)}:{}),...rest
    });
    const result=await response.json().catch(()=>null);
    if(!response.ok) {
      const message=result?.message||('HTTP '+response.status);
      if(auth&&(response.status===401||(response.status===403&&/login|token|auth|登录|认证|过期/i.test(message)))){
        clearToken();
        if(typeof window!=='undefined')window.dispatchEvent(new Event('txboard:unauthorized'));
      }
      throw new ApiError(message,response.status);
    }
    if(result&&typeof result==='object'&&'status' in result) {
      if(result.status!=='success')throw new ApiError(result.message||'请求失败',response.status);
      if(result.data===undefined)throw new ApiError(result.message||'响应缺少数据',response.status);
      return preserveEnvelope?result:result.data;
    }
    // Some legacy endpoints intentionally return a top-level {data,total} object.
    return result;
  } catch(error) {
    if(error.name==='AbortError')throw new ApiError('请求超时，请检查网络连接',0);
    throw error;
  } finally {clearTimeout(timer);}
}
export const get=(path,params,auth=true)=>api(path+(params?'?'+new URLSearchParams(params).toString():''),{auth});
export const post=(path,body,auth=true)=>api(path,{method:'POST',body,auth});
export const guest=()=>get('/guest/comm/config',null,false);
export const login=async(email,password,captcha={})=>{
  const result=await post('/passport/auth/login',{email,password,...captcha},false);
  saveToken(result?.auth_data);return result;
};
export const register=async(data)=>{const result=await post('/passport/auth/register',data,false);saveToken(result?.auth_data);return result;};
export const tokenLogin=async(verify)=>{
  const raw=await get('/passport/auth/token2Login',{verify},false);
  const authData=raw?.data??raw;
  saveToken(authData?.auth_data);
  return authData;
};
export const verifySession=()=>get('/user/checkLogin');
export const user=()=>get('/user/info');
export const subscribe=()=>get('/user/getSubscribe');
export const notices=async()=>{
 // The TXBoard user endpoint returns server-ordered pages with {data,total}.
 // Load up to 500 visible notices so tag-targeted popups and the inbox can see
 // more than the first 20 entries. Never loop indefinitely on bad pagination.
 const collected=[];
 for(let current=1;current<=5;current++){
  const result=await get('/user/notice/fetch',{current,pageSize:100});
  const items=Array.isArray(result)?result:Array.isArray(result?.data)?result.data:[];
  collected.push(...items);
  const total=Number(result?.total);
  if(items.length<100||(Number.isFinite(total)&&total>=0&&collected.length>=total))break;
 }
 return collected;
};
export const plans=()=>get('/user/plan/fetch');
export const plan=id=>get('/user/plan/fetch',{id});
export const orders=()=>get('/user/order/fetch');
export const orderDetail=(trade_no)=>get('/user/order/detail',{trade_no});
export const orderCheck=(trade_no)=>get('/user/order/check',{trade_no});
export const payments=()=>get('/user/order/getPaymentMethod');
export const cancelOrder=(trade_no)=>post('/user/order/cancel',{trade_no});
export const createOrder=(plan_id,period,coupon_code)=>post('/user/order/save',{plan_id,period,...(coupon_code?{coupon_code}:{})});
export const checkCoupon=(code,plan_id,period)=>post('/user/coupon/check',{code,plan_id,period});
export const checkout=(trade_no,method)=>api('/user/order/checkout',{method:'POST',body:{trade_no,...(method!==undefined?{method}:{})},preserveEnvelope:true});
export const tickets=()=>get('/user/ticket/fetch');
export const ticketDetail=(id)=>get('/user/ticket/fetch',{id});
export const createTicket=(subject,level,message)=>post('/user/ticket/save',{subject,level,message});
export const replyTicket=(id,message)=>post('/user/ticket/reply',{id,message});
export const closeTicket=(id)=>post('/user/ticket/close',{id});
export const changePassword=(old_password,new_password)=>post('/user/changePassword',{old_password,new_password});
export const invites=()=>get('/user/invite/fetch');
export const createInvite=()=>get('/user/invite/save');
export const inviteDetails=()=>get('/user/invite/details',{current:1,page_size:50});
export const sendVerify=(email,purpose)=>post('/passport/comm/sendEmailVerify',{email,purpose},false);
export const forgetPassword=(email,password,email_code)=>post('/passport/auth/forget',{email,password,email_code},false);
export const stat=()=>get('/user/getStat');
export const safeExternal=(value)=>safeWebUrl(value,{allowHttpLoopback:true});
