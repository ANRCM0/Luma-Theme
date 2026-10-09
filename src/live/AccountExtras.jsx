import React,{useEffect,useState} from 'react';
import {Copy,RefreshCcw,ShieldCheck,Wallet,ExternalLink} from 'lucide-react';
import * as tx from './api.js';
import {userFeatureEnabled} from './user-data.js';

// Major units from config; all API amounts are integer cents.
export function validMajorAmount(value){
 const v=String(value||'').trim();
 return /^\d+(?:\.\d{1,2})?$/.test(v)&&Number(v)>0&&Number.isSafeInteger(Math.round(Number(v)*100));
}
export function commissionMinimum(config,field){
 const value=field==='transfer'?config?.commission_transfer_limit??config?.commission_withdraw_limit:config?.commission_withdraw_limit;
 const n=Number(value);
 return Number.isFinite(n)&&n>0?n:0;
}
const date=v=>{
 if(!v)return '—';
 const t=String(v).includes(' ')?String(v).replace(' ','T'):String(v);
 const d=new Date(t);
 return Number.isNaN(d.valueOf())?'—':d.toLocaleString('zh-CN');
};
function ErrorNotice({message}){return message?<p className="live-extra-error" role="alert">{message}</p>:null}
function Confirmation({children}){return <p className="live-extra-hint">{children}</p>}

export function InviteFinance({user,config,guest,onUpdated,onCopy,onNavigate}){
 const [invite,setInvite]=useState(null),[history,setHistory]=useState([]),[loading,setLoading]=useState(true);
 const [error,setError]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(false);
 const [transfer,setTransfer]=useState(''),[method,setMethod]=useState(''),[account,setAccount]=useState('');
 const available=Number(invite?.stat?.[4]??user?.commission_balance??0);
 const minTransfer=commissionMinimum(config,'transfer'),minWithdraw=commissionMinimum(config,'withdraw');
 const methods=Array.isArray(config?.withdraw_methods)?config.withdraw_methods.map(String):[];
 const transferEnabled=userFeatureEnabled('commission_enable',guest,config);
 const withdrawEnabled=transferEnabled&&userFeatureEnabled('withdraw_close',{withdraw_close:0},{withdraw_close:0})&&Number(config?.withdraw_close??1)===0;
 const featureAllowed=userFeatureEnabled('invite_enable',guest,config);
 const baseUrl=tx.safeExternal(guest?.app_url)||location.origin;
 const link=code=>baseUrl.replace(/\/$/,'')+'/#/login?tab=register&code='+encodeURIComponent(code);
 const reload=async()=>{
  setLoading(true);
  try{
   const [data,details]=await Promise.all([tx.invites(),tx.inviteDetails().catch(()=>({data:[]}))]);
   setInvite(data);setHistory(Array.isArray(details?.data)?details.data:[]);
  }catch(e){setError(e?.message||'邀请数据加载失败')}finally{setLoading(false)}
 };
 useEffect(()=>{let mounted=true;(async()=>{
  setLoading(true);
  try{const [data,details]=await Promise.all([tx.invites(),tx.inviteDetails().catch(()=>({data:[]}))]);if(mounted){setInvite(data);setHistory(Array.isArray(details?.data)?details.data:[])}}catch(e){if(mounted)setError(e?.message||'获取邀请数据失败')}finally{if(mounted)setLoading(false)}
 })();return()=>{mounted=false}},[]);
 const run=async(fn,msg)=>{
  if(busy)return false;
  setBusy(true);setError('');setSuccess('');
  try{await fn();setSuccess(msg);await reload();await onUpdated?.();return true}catch(e){setError(e?.message||'操作失败');return false}finally{setBusy(false)}
 };
 const transferAction=async()=>{
  if(!validMajorAmount(transfer)){setError('请输入最多两位小数的正金额');return}
  const cents=Math.round(Number(transfer)*100);
  if(cents>available){setError('划转金额不得超过可用佣金');return}
  if(Number(transfer)<minTransfer){setError('低于最低划转金额 '+minTransfer.toFixed(2)+' 元');return}
  if(!window.confirm('确定将 '+Number(transfer).toFixed(2)+' 元佣金划转到账户余额？'))return;
  if(await run(()=>tx.transferCommission(cents),'佣金已划转到余额'))setTransfer('');
 };
 const withdrawAction=async()=>{
  if(!withdrawEnabled){setError('站点暂未开放提现');return}
  if(!method||!methods.includes(method)||!account.trim()){setError('请选择提现方式并填写收款账号');return}
  if(available/100<minWithdraw){setError('可用佣金未达到提现门槛 '+minWithdraw.toFixed(2)+' 元');return}
  if(!window.confirm('确定通过 '+method+' 提交提现申请？后台将生成工单，确认后不可自动撤销。'))return;
  if(await run(()=>tx.withdrawCommission(method,account.trim()),'提现申请已提交到工单')){setAccount('');onNavigate?.('ticket')}
 };
 if(!featureAllowed)return <div className="card live-extra-card">站点未开启邀请功能。</div>;
 return <div className="live-extra-stack" aria-label="邀请与佣金">
  <ErrorNotice message={error}/>{success&&<p className="live-extra-success" role="status">{success}</p>}
  <div className="card live-extra-card">
   <div className="live-extra-head"><h3>邀请概览</h3><button className="secondary" disabled={busy||loading} onClick={()=>void reload()}><RefreshCcw size={15}/>刷新</button></div>
   <div className="finance-summary"><div><span>邀请人数</span><strong>{invite?.stat?.[0]??'—'}</strong></div><div><span>有效佣金</span><strong>{tx.money(invite?.stat?.[1])}</strong></div><div><span>待确认佣金</span><strong>{tx.money(invite?.stat?.[2])}</strong></div><div><span>可用佣金</span><strong>{tx.money(available)}</strong></div></div>
   {loading?<p className="muted">正在加载…</p>:<div className="live-extra-list">{(invite?.codes||[]).map(row=><div key={row.code} className="live-extra-row"><div><strong>{row.code}</strong><small>访问 {row.pv||0} 次</small></div><button className="secondary" onClick={()=>onCopy(link(row.code))}><Copy size={14}/>复制邀请链接</button></div>)}</div>}
   <button className="secondary" disabled={busy||loading} onClick={()=>void run(tx.createInvite,'邀请码已生成')}>生成邀请码</button>
  </div>
  {transferEnabled&&<div className="card live-extra-card">
   <h3>佣金划转</h3><p className="muted">将佣金余额转为站内可用余额，不是银行提现。</p>
   <label className="live-extra-field">划转金额（元）<input type="text" inputMode="decimal" placeholder="0.00" value={transfer} onChange={e=>setTransfer(e.target.value)} disabled={busy}/></label>
   <Confirmation>可用 {tx.money(available)}{minTransfer>0?' · 最低划转 ¥'+minTransfer.toFixed(2):''}</Confirmation>
   <button className="primary" disabled={busy||!validMajorAmount(transfer)} onClick={()=>void transferAction()}>确认划转</button>
  </div>}
  {withdrawEnabled&&<div className="card live-extra-card">
   <h3>佣金提现申请</h3>
   <label className="live-extra-field">提现方式<select value={method} onChange={e=>setMethod(e.target.value)} disabled={busy}><option value="">请选择</option>{methods.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
   <label className="live-extra-field">收款账号<input value={account} onChange={e=>setAccount(e.target.value)} placeholder="请填写真实收款账号" disabled={busy}/></label>
   <Confirmation>提现将创建工单，由管理员处理。{minWithdraw>0?'最低金额 ¥'+minWithdraw.toFixed(2):''}</Confirmation>
   <button className="primary" disabled={busy||!method||!account.trim()} onClick={()=>void withdrawAction()}>提交提现申请</button>
  </div>}
  <div className="card live-extra-card"><h3>佣金记录</h3>{history.length?<div className="live-extra-list">{history.map((row,i)=><div key={i} className="live-extra-row"><span>{row.created_at?new Date(Number(row.created_at)*1000).toLocaleDateString('zh-CN'):'—'}</span><strong>{tx.money(row.get_amount)}</strong></div>)}</div>:<p className="muted">暂无佣金记录</p>}</div>
 </div>;
}

export function AccountSecurity({user,onUpdated,onCopy}){
 const [sessions,setSessions]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [expiry,setExpiry]=useState(Boolean(Number(user?.remind_expire??0))),[traffic,setTraffic]=useState(Boolean(Number(user?.remind_traffic??0)));
 const load=async()=>{setLoading(true);try{const data=await tx.activeSessions();setSessions(Array.isArray(data)?data:[])}catch(e){setError(e?.message||'无法读取活跃会话')}finally{setLoading(false)}};
 useEffect(()=>{let active=true;tx.activeSessions().then(data=>{if(active)setSessions(Array.isArray(data)?data:[])}).catch(e=>{if(active)setError(e?.message||'无法读取活跃会话')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 const run=async(fn,success)=>{
  setBusy(true);setError('');setMessage('');
  try{const value=await fn();setMessage(success);return value}catch(e){setError(e?.message||'操作失败');return null}finally{setBusy(false)}
 };
 const save=async()=>{const result=await run(()=>tx.updateUserSettings({remind_expire:expiry?1:0,remind_traffic:traffic?1:0}),'提醒设置已更新');if(result!==null)await onUpdated?.()};
 const revoke=async item=>{if(!window.confirm('确定移除会话 '+(item.name||item.id)+'？'))return;const result=await run(()=>tx.removeSession(String(item.id)),'会话已移除');if(result!==null)await load()};
 const reset=async()=>{
  if(!window.confirm('重置订阅密钥会使旧订阅链接失效，并影响使用旧配置的客户端。确定继续吗？'))return;
  const result=await run(tx.resetSecurity,'订阅密钥已重置，请在客户端重新导入订阅');
  if(typeof result==='string')await onUpdated?.();
 };
 const quick=async()=>{const url=await run(tx.quickLoginUrl,'已生成一次性登录链接');if(!url)return;const safe=tx.safeExternal(url);if(!safe){setError('服务器返回的快捷登录地址不安全');return}await onCopy(safe)};
 return <div className="live-extra-stack" aria-label="账户安全管理">
  <ErrorNotice message={error}/>{message&&<p className="live-extra-success" role="status">{message}</p>}
  <div className="card live-extra-card"><h3>提醒设置</h3>
   <label className="live-extra-toggle"><input type="checkbox" checked={expiry} onChange={e=>setExpiry(e.target.checked)}/> 套餐到期提醒</label>
   <label className="live-extra-toggle"><input type="checkbox" checked={traffic} onChange={e=>setTraffic(e.target.checked)}/> 流量不足提醒</label>
   <button className="secondary" disabled={busy} onClick={()=>void save()}>保存提醒设置</button>
  </div>
  <div className="card live-extra-card"><div className="live-extra-head"><h3>活跃会话</h3><button className="secondary" disabled={busy||loading} onClick={()=>void load()}><RefreshCcw size={15}/>刷新</button></div>
   {loading?<p className="muted">加载会话中…</p>:sessions.length?<div className="live-extra-list">{sessions.map(item=><div className="live-extra-row" key={item.id}><div><strong>{item.name||'会话 #'+item.id}</strong><small>最后使用：{date(item.last_used_at)}</small></div><button className="secondary" disabled={busy} onClick={()=>void revoke(item)}>移除</button></div>)}</div>:<p className="muted">暂无会话数据</p>}
  </div>
  <div className="card live-extra-card"><h3>登录与订阅安全</h3><p className="muted">快捷登录链接属于敏感凭证，不会在页面上长期显示。</p>
   <div className="live-extra-actions"><button className="secondary" disabled={busy} onClick={()=>void quick()}><Copy size={15}/>复制快捷登录链接</button><button className="secondary" disabled={busy} onClick={()=>void reset()}><ShieldCheck size={15}/>重置订阅密钥</button></div>
  </div>
 </div>;
}
