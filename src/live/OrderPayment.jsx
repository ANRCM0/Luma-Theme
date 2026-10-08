import React from 'react';
import {AlertTriangle,CheckCircle2,Clock3,ExternalLink,RefreshCcw,ShieldCheck} from 'lucide-react';
import {isBlockingOrder,orderStateText,normalizeOrderStatus} from './order-flow.js';

export function ExistingOrderDialog({order,onContinue,onCancel,onDismiss,busy}){
 const status=normalizeOrderStatus(order?.status);
 return <div className="live-order-conflict">
  <div className="live-order-warning"><AlertTriangle size={20}/><div><strong>{status===1?'订单正在开通':'发现待支付订单'}</strong><p>{status===1?'请等待原订单开通完成，避免重复创建订单。':'可以继续支付原订单；只有明确要放弃它时，才取消旧单并创建新订单。'}</p></div></div>
  <p>原订单号：<strong className="live-break">{order?.trade_no}</strong></p>
  <p>原套餐：{order?.plan?.name||('套餐 #'+order?.plan_id)}</p>
  <div className="live-order-actionstack">
   <button className="primary wide" type="button" disabled={busy} onClick={onContinue}>{status===1?'查看订单进度':'继续支付原订单'}</button>
   {status===0&&<button className="secondary wide" type="button" disabled={busy} onClick={onCancel}>取消原订单并重新下单</button>}
   <button className="secondary wide" type="button" disabled={busy} onClick={onDismiss}>暂不处理</button>
  </div>
 </div>;
}

export function OrderPaymentBody({order,methods,method,onMethod,paying,busy,watching,watchExpired,paymentError,paymentLink,onPay,onCancel,onRefresh,money,statusLabel}){
 const status=normalizeOrderStatus(order?.status);
 const selected=methods.find(item=>String(item.id)===String(method));
 const handling=selected?Math.round(Number(order.total_amount||0)*Number(selected.handling_fee_percent||0)/100)+Number(selected.handling_fee_fixed||0):0;
 return <div className="live-order-operations">
  <div className="live-order">
   <p>订单号：<strong className="live-break">{order.trade_no}</strong></p>
   <p>套餐：{order.plan?.name||order.plan_id}</p>
   <p>周期：{order.period}</p>
   <p>金额：<strong>{money(order.total_amount)}</strong></p>
   {selected&&status===0&&<p>支付手续费（估算）：{money(handling)}</p>}
   <p>状态：{statusLabel(order.status)}</p>
  </div>
  <div className={'live-order-state'+(status===3?' success':'')}>
   {status===3?<CheckCircle2 size={19}/>:status===0||status===1?<Clock3 size={19}/>:<ShieldCheck size={19}/>}
   <div><strong>{orderStateText(order.status)}</strong>
    <p>{status===0?'支付完成后会自动查询后台状态，不必重复创建订单。':status===1?'支付已由后台确认，等待服务开通；请勿再次支付。':status===3?'后台确认订单已完成，订阅信息将更新。':'如有疑问可查看订单记录或联系支持。'}</p>
   </div>
  </div>
  {watching&&<p className="live-order-watching" role="status"><RefreshCcw size={15}/> 正在自动查询订单状态（最多约 80 秒）</p>}
  {watchExpired&&isBlockingOrder(status)&&<p className="live-order-watching">自动查询已暂停。你可以点击下方按钮继续核对后台状态。</p>}
  {paymentError&&<p className="live-order-payment-error" role="alert">{paymentError}</p>}
  {status===0&&<>
   <div className="field"><label>支付方式</label>
    <select value={String(method)} onChange={e=>onMethod(e.target.value)} disabled={paying||busy||Boolean(order.payment_id)}>
     {!methods.length&&<option value="">无在线支付方式（尝试余额支付）</option>}
     {methods.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}
    </select>
   </div>
   {selected?.payment==='StripeCredit'&&<p className="muted">Stripe 信用卡支付交给 TXBoard 官方安全支付组件处理。</p>}
   <button className="primary wide" type="button" disabled={paying||busy} onClick={onPay}>{paying?'正在发起支付…':'立即支付'}</button>
   {paymentLink&&<p className="live-order-payment-link">支付页面没有自动打开？<a href={paymentLink} target="_blank" rel="noopener noreferrer">手动打开安全支付链接 <ExternalLink size={13}/></a></p>}
   <button className="secondary wide" type="button" disabled={paying||busy} onClick={onCancel}>取消订单</button>
  </>}
  <button className="secondary wide" type="button" disabled={paying||busy} onClick={onRefresh}>刷新订单状态</button>
 </div>;
}
