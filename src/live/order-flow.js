// TXBoard V1 order status lifecycle. The backend is always authoritative.
export const ORDER_STATUS=Object.freeze({
 UNPAID:0,PROCESSING:1,CANCELED:2,COMPLETED:3,DISCOUNTED:4
});
export const STATUS_POLL_MS=4000;
export const MAX_STATUS_POLLS=20;
const bool=(value,fallback)=>value==null?fallback:!(value===false||value===0||value==='0'||value==='false');
export function resolvePaymentConfig(guest={},settings={}){
 const remote=guest?.frontend_theme==='vv-theme'&&guest?.theme_config&&typeof guest.theme_config==='object'&&!Array.isArray(guest.theme_config)?guest.theme_config:null;
 const values=remote||settings?.payment||{};
 const seconds=Number(values.payment_poll_seconds??values.pollSeconds??4);
 return {
  autoCheck:bool(values.payment_auto_check??values.autoCheck,true),
  pollMs:(Number.isFinite(seconds)?Math.min(15,Math.max(4,Math.round(seconds))):4)*1000
 };
}

export const normalizeOrderStatus=value=>{
 if(typeof value!=='number'&&typeof value!=='string')return null;
 if(typeof value==='string'&&!/^[0-4]$/.test(value.trim()))return null;
 const n=Number(value);
 return Number.isInteger(n)&&n>=0&&n<=4?n:null;
};
export const isBlockingOrder=status=>[0,1].includes(normalizeOrderStatus(status));
export const isTerminalOrder=status=>[2,3,4].includes(normalizeOrderStatus(status));
export function firstBlockingOrder(orders){
 return (Array.isArray(orders)?orders:[]).find(order=>order&&order.trade_no&&isBlockingOrder(order.status))||null;
}
export function shouldPollOrder(order){
 return Boolean(order?.trade_no&&isBlockingOrder(order?.status));
}
export function orderStateText(status){
 switch(normalizeOrderStatus(status)){
  case 0:return '等待支付';
  case 1:return '支付已确认，正在开通';
  case 2:return '订单已取消';
  case 3:return '订单已完成';
  case 4:return '订单已折抵';
  default:return '订单状态未知，请手动刷新';
 }
}
