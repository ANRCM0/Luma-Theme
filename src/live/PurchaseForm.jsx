import React from 'react';
import {ArrowRight,CheckCircle2,LockKeyhole,Tag} from 'lucide-react';
import {annualSavings,planPeriods,planPrice} from './catalog.js';

export default function PurchaseForm({plan,period,setPeriod,coupon,setCoupon,discount,setDiscount,busy,formatMoney,onVerify,onSubmit}){
 const options=planPeriods(plan);
 const price=planPrice(plan,period);
 const saving=annualSavings(plan,period);
 return <div className="live-purchase">
  <p className="live-purchase-subtitle">第一步 · 选择周期与核对基础价格</p>
  <div className="live-purchase-periods" role="group" aria-label="购买周期">
   {options.map(({id,label})=><label key={id} className={'live-purchase-period '+(id===period?'selected':'')}>
    <input type="radio" name="period" value={id} checked={period===id} onChange={()=>{setPeriod(id);setDiscount('')}}/>
    <span>{label}</span><strong>{formatMoney(planPrice(plan,id))}</strong>
   </label>)}
  </div>
  {saving&&<p className="live-purchase-saving">当前周期与连续购买 {saving.months} 个月月付比较，基础价格少 {formatMoney(saving.saved)}（约 {saving.percent}%）。</p>}
  <div className="live-purchase-summary" aria-label="订单基础价格">
   <div><span>套餐</span><strong>{plan.name}</strong></div>
   <div><span>已选周期</span><strong>{options.find(x=>x.id===period)?.label||'请选择'}</strong></div>
   <div className="live-purchase-subtotal"><span>基础价格</span><strong>{price!==null?formatMoney(price):'请选择周期'}</strong></div>
  </div>
  <p className="live-purchase-subtitle">第二步 · 优惠码（可选）</p>
  <div className="live-purchase-coupon">
   <label htmlFor="live-purchase-coupon-input"><Tag size={16}/>优惠码</label>
   <div className="live-row">
    <input id="live-purchase-coupon-input" value={coupon} autoComplete="off" maxLength={100} placeholder="有优惠码可在此填写" onChange={e=>{setCoupon(e.target.value);setDiscount('')}}/>
    <button type="button" className="secondary" disabled={!coupon.trim()||busy||!period} onClick={onVerify}>验证优惠码</button>
   </div>
   {discount&&<p className="live-purchase-coupon-success"><CheckCircle2 size={15}/> 已验证优惠码：{discount}。优惠金额以订单最终金额为准。</p>}
  </div>
  <div className="live-purchase-confirm">
   <p><LockKeyhole size={16}/> 订单将由 TXBoard 服务端计算，创建后可核对最终金额再选择支付方式。</p>
   <button type="button" className="primary wide" disabled={busy||price===null} onClick={onSubmit}>{busy?'提交中…':'确认并创建订单'} <ArrowRight size={17}/></button>
  </div>
 </div>;
}
