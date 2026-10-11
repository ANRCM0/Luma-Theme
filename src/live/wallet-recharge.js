// Native TXBoard wallet amounts are integer cents, limited to ¥1–¥5,000.
export function moneyToMinor(input){
 const text=String(input).trim();
 if(!/^(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,2})?$/.test(text))throw Error('请输入正确的充值金额，最多两位小数');
 const [whole,fraction='']=text.split('.');
 const minor=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(minor)||minor<100||minor>500000)throw Error('单次充值金额应在 ¥1 至 ¥5,000 之间');
 return minor;
}
export function rechargeDate(seconds){
 const n=Number(seconds);
 return Number.isFinite(n)&&n>0?new Date(n*1000).toLocaleString('zh-CN'):'—';
}
