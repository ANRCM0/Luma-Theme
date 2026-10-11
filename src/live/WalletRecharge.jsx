import React,{useCallback,useEffect,useRef,useState} from 'react';
import {RefreshCcw,Wallet,ExternalLink} from 'lucide-react';
import QRCode from 'qrcode';
import * as tx from './api.js';
import {moneyToMinor,rechargeDate} from './wallet-recharge.js';

export default function WalletRecharge({onUpdated}){
 const [balance,setBalance]=useState(null),[methods,setMethods]=useState([]),[method,setMethod]=useState('');
 const [amount,setAmount]=useState('50.00'),[rows,setRows]=useState([]),[page,setPage]=useState(1),[lastPage,setLastPage]=useState(1);
 const [pending,setPending]=useState(null),[paymentUrl,setPaymentUrl]=useState(''),[qr,setQr]=useState('');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[info,setInfo]=useState('');
 const lock=useRef(false),keyRef=useRef(null);
 const reload=useCallback(async(n=1)=>{
  const token=tx.getToken();
  const [wallet,available,history]=await Promise.all([tx.wallet(),tx.rechargeMethods(),tx.rechargeHistory(n)]);
  if(tx.getToken()!==token)return;
  setBalance(wallet);setMethods(available);setRows(history.rows);setLastPage(history.meta.last_page);setPage(n);
  setMethod(value=>available.some(item=>String(item.id)===value)?value:String(available[0]?.id||''));
 },[]);
 useEffect(()=>{
  let active=true;
  reload(1).catch(e=>{if(active)setError(e.message||'钱包加载失败')}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[reload]);
 useEffect(()=>{
  // Only server-pending recharges are pollable; no checkout/order creation here.
  if(!pending||pending.status!==0||!pending.trade_no)return;
  const token=tx.getToken(),trade=pending.trade_no;
  let active=true,inFlight=false,attempts=0,settled=false;
  const stop=()=>clearInterval(timer);
  const poll=async()=>{
   if(inFlight||!active)return;
   if(tx.getToken()!==token){stop();return}
   if(attempts>=20){stop();setInfo('自动查询已暂停，可手动刷新充值状态');return}
   attempts++;inFlight=true;
   try{
    const current=await tx.rechargeStatus(trade);
    if(!active||tx.getToken()!==token||current?.trade_no!==trade)return;
    if(current.status===1){
     settled=true;stop();
     setInfo('后端已确认充值到账');setPaymentUrl('');setQr('');
     // Start both server-backed refreshes before the paid status unmounts
     // this poll effect. Neither refresh can award credit on the client.
     const updates=Promise.allSettled([reload(page),onUpdated?.()]);
     setPending(prev=>prev?.trade_no===trade?current:prev);
     await updates;
    }else setPending(prev=>prev?.trade_no===trade?current:prev);
   }catch{
    // Network failure is an unknown state, NOT a failed payment.
   }finally{
    inFlight=false;
    // Count failed calls too. The old cap only ran on successful responses,
    // leaving a broken gateway polled forever.
    if(active&&!settled&&attempts>=20){
     stop();
     if(tx.getToken()===token)setInfo('自动查询已暂停，可手动刷新充值状态');
    }
   }
  };
  const timer=setInterval(()=>void poll(),4000);
  return()=>{active=false;stop()};
 },[pending?.trade_no,pending?.status,page,reload,onUpdated]);
 const refresh=async(n=page)=>{
  setLoading(true);setError('');
  try{await reload(n)}catch(e){setError(e.message||'刷新失败')}finally{setLoading(false)}
 };
 const check=async()=>{
  if(!pending?.trade_no)return;
  const token=tx.getToken(),trade=pending.trade_no;
  try{
   const item=await tx.rechargeStatus(trade);
   if(tx.getToken()!==token||item?.trade_no!==trade)return;
   setPending(prev=>prev?.trade_no===trade?item:prev);
   if(item.status===1){setInfo('后端已确认充值到账');setPaymentUrl('');setQr('');await reload(page);if(tx.getToken()===token)await onUpdated?.()}
   else setInfo('充值尚未到账，请等待支付平台确认');
  }catch(e){if(tx.getToken()===token)setError(e.message||'订单查询失败')}
 };
 const pay=async item=>{
  setPending(item);setPaymentUrl('');setQr('');
  const result=await tx.rechargeCheckout(item.trade_no);
  if(result?.type===0&&typeof result.data==='string'){
   setQr(await QRCode.toDataURL(result.data,{width:240,margin:1}));
   setInfo('请扫码完成付款，余额以后台确认状态为准');
  }else if(result?.type===1&&typeof result.data==='string'){
   const url=tx.safeExternal(result.data);
   if(!url)throw Error('支付服务返回了不安全的链接');
   setPaymentUrl(url);
   window.open(url,'_blank','noopener,noreferrer');
   setInfo('支付页面如未打开，请使用下方安全支付链接');
  }else if(result?.type===-1){
   setInfo('正在等待后台确认，请刷新充值状态');
  }else{
   throw Error('支付服务返回了不支持的响应');
  }
 };
 const run=async(item=null)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setInfo('');
  try{
   if(item){await pay(item);return}
   const cents=moneyToMinor(amount);
   const id=Number(method);
   if(!Number.isSafeInteger(id)||id<1)throw Error('请选择支付方式');
   const signature=cents+':'+id;
   if(!keyRef.current||keyRef.current.signature!==signature)keyRef.current={signature,key:crypto.randomUUID()};
   const created=await tx.createRecharge(cents,id,keyRef.current.key);
   keyRef.current=null;
   setPending(created);
   await reload(page);
   await pay(created);
  }catch(e){setError(e.message||'操作失败。若创建超时，请保持原金额及方式重试，避免重复订单')}
  finally{lock.current=false;setBusy(false)}
 };
 return <section className="card live-extra-card" aria-label="钱包充值">
  <div className="live-extra-head"><h3><Wallet size={18}/> 钱包充值</h3><button className="secondary" type="button" disabled={busy||loading} onClick={()=>void refresh()}><RefreshCcw size={15}/>刷新</button></div>
  <p className="muted">余额：<strong>{balance?tx.money(balance.balance_minor):'—'}</strong> · 每次 ¥1–5,000，真实到账由 TXBoard 支付回调确认。</p>
  {error&&<p role="alert" className="live-extra-error">{error}</p>}
  {info&&<p role="status" className="live-extra-success">{info}</p>}
  <div className="field"><label htmlFor="luma-recharge-amount">充值金额（元）</label><input id="luma-recharge-amount" inputMode="decimal" value={amount} disabled={busy} onChange={e=>{setAmount(e.target.value);keyRef.current=null}}/></div>
  <div className="field"><label htmlFor="luma-recharge-method">充值支付方式</label><select id="luma-recharge-method" value={method} disabled={busy} onChange={e=>{setMethod(e.target.value);keyRef.current=null}}>
   {!methods.length&&<option value="">暂无支持充值的支付方式</option>}
   {methods.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}
  </select></div>
  <button type="button" className="primary wide" onClick={()=>void run()} disabled={busy||loading||!methods.length}>{busy?'处理中…':'创建充值订单并支付'}</button>
  {pending&&<div className="live-extra-stack">
   <p>当前充值单：<strong>{pending.trade_no}</strong> · {tx.money(pending.amount_minor)} · {pending.status===1?'已到账':'等待支付'}</p>
   {qr&&<img src={qr} width="240" height="240" alt="钱包充值支付二维码"/>}
   {paymentUrl&&<p><a href={paymentUrl} target="_blank" rel="noopener noreferrer">手动打开安全支付链接 <ExternalLink size={14}/></a></p>}
   <button className="secondary" type="button" disabled={busy} onClick={()=>void check()}>核对充值状态</button>
  </div>}
  <h4>充值记录</h4>
  {rows.length?<div className="live-extra-list">{rows.map(item=><div key={item.trade_no} className="live-extra-row">
   <div><strong>{tx.money(item.amount_minor)}</strong><small>{item.trade_no} · {rechargeDate(item.created_at)} · {item.status===1?'已到账':'待支付'}</small></div>
   {item.status===0&&<button className="secondary" disabled={busy} onClick={()=>void run(item)}>继续支付</button>}
  </div>)}</div>:<p className="muted">暂无充值记录</p>}
  {lastPage>1&&<div className="live-extra-actions">
   <button className="secondary" disabled={page<=1||loading||busy} onClick={()=>void refresh(page-1)}>上一页</button>
   <span>{page} / {lastPage}</span>
   <button className="secondary" disabled={page>=lastPage||loading||busy} onClick={()=>void refresh(page+1)}>下一页</button>
  </div>}
 </section>;
}
