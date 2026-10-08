// TXBoard V1 order status lifecycle. The backend is always authoritative.
export const ORDER_STATUS=Object.freeze({
 UNPAID:0,PROCESSING:1,CANCELED:2,COMPLETED:3,DISCOUNTED:4
});
export const STATUS_POLL_MS=4000;
export const MAX_STATUS_POLLS=20;
export const normalizeOrderStatus=value=>{
 if(value===null||value===undefined||value==='')return null;
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
