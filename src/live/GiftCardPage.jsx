import React,{useEffect,useState} from 'react';
import {Gift,RefreshCcw,CheckCircle2} from 'lucide-react';
import * as tx from './api.js';
function rewardText(rewards={}){
 const parts=[];
 if(rewards.balance)parts.push('余额 '+tx.money(rewards.balance));
 if(rewards.transfer_enable)parts.push('流量 '+tx.bytes(rewards.transfer_enable));
 if(rewards.expire_days)parts.push('延长 '+rewards.expire_days+' 天');
 if(rewards.plan_id)parts.push('套餐 #'+rewards.plan_id);
 if(rewards.device_limit)parts.push('设备 '+rewards.device_limit+' 台');
 return parts.length?parts.join(' · '):'由服务端分配奖励';
}
export default function GiftCardPage({onUpdated,atomic={}}){
 const [code,setCode]=useState(''),[preview,setPreview]=useState(null),[history,setHistory]=useState([]);
 const [detail,setDetail]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function load(){
  setLoading(true);
  try{
   const response=await tx.giftHistory();
   setHistory(Array.isArray(response?.data)?response.data:[]);
  }catch(e){setError(e?.message||'无法加载兑换记录')}finally{setLoading(false)}
 }
 useEffect(()=>{let alive=true;tx.giftHistory().then(result=>{if(alive)setHistory(Array.isArray(result?.data)?result.data:[])}).catch(e=>{if(alive)setError(e?.message||'无法加载兑换记录')}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[]);
 const check=async()=>{
  if(!code.trim()||busy)return;
  setBusy(true);setError('');setMessage('');
  try{setPreview(await tx.giftCheck(code.trim()))}catch(e){setPreview(null);setError(e?.message||'验证礼品卡失败')}finally{setBusy(false)}
 };
 const redeem=async()=>{
  if(!preview?.can_redeem||busy||!code.trim())return;
  if(!window.confirm('确认兑换礼品卡？兑换后可能无法撤销。'))return;
  setBusy(true);setError('');
  try{
   const result=await tx.giftRedeem(code.trim());
   setMessage(result?.message||'礼品卡兑换成功');
   setPreview(null);setCode('');
   await load();await onUpdated?.();
  }catch(e){setError(e?.message||'兑换失败')}finally{setBusy(false)}
 };
 const showDetail=async id=>{setError('');try{setDetail(await tx.giftDetail(id))}catch(e){setError(e?.message||'无法加载兑换详情')}};
 return <section className="live-extra-stack" aria-label="礼品卡">
  <div className="live-data-heading"><div>{atomic.showEyebrow!==false&&<span className="eyebrow">GIFT CARD</span>}<h1>礼品卡</h1>{atomic.showPageDescription!==false&&<p>兑换前先查询奖励和使用条件。</p>}</div></div>
  {error&&<p className="live-extra-error" role="alert">{error}</p>}{message&&<p className="live-extra-success" role="status">{message}</p>}
  <div className="card live-extra-card">
   <h3>兑换礼品卡</h3><label className="live-extra-field">兑换码<input aria-label="礼品卡兑换码" value={code} onChange={e=>{setCode(e.target.value);setPreview(null)}} placeholder="GC-XXXX-XXXX" disabled={busy}/></label>
   <button className="secondary" type="button" onClick={()=>void check()} disabled={!code.trim()||busy}>查询礼品卡</button>
   {preview&&<div className="live-gift-preview"><strong>{preview.code_info?.template?.name||'礼品卡'}</strong><p>{preview.code_info?.template?.description}</p><p>预计奖励：{rewardText(preview.reward_preview)}</p>{preview.reason&&<p className="live-extra-hint">{preview.reason}</p>}
    {preview.can_redeem&&<button className="primary" disabled={busy} type="button" onClick={()=>void redeem()}><Gift size={16}/>确认兑换</button>}
   </div>}
  </div>
  <div className="card live-extra-card"><div className="live-extra-head"><h3>兑换记录</h3><button className="secondary" disabled={loading||busy} onClick={()=>void load()}><RefreshCcw size={15}/>刷新</button></div>
   {loading?<p className="muted">正在加载…</p>:history.length?<div className="live-extra-list">{history.map(item=><div className="live-extra-row" key={item.id}>
    <div><strong>{item.template_name||'礼品卡'}</strong><small>{rewardText(item.rewards_given)} · {tx.dateOnly(item.created_at)}</small></div>
    <button className="secondary" onClick={()=>void showDetail(item.id)}>查看详情</button></div>)}</div>:<p className="muted">暂无兑换记录</p>}
  </div>
  {detail&&<div className="card live-extra-card" aria-label="兑换详情"><div className="live-extra-head"><h3>兑换详情</h3><button className="secondary" onClick={()=>setDetail(null)}>关闭</button></div>
   <p>名称：{detail.template?.name||'礼品卡'}</p><p>类型：{detail.template?.type_name||'—'}</p><p>获得奖励：{rewardText(detail.rewards_given)}</p>
  </div>}
 </section>;
}
