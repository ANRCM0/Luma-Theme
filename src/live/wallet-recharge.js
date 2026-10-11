// Native TXBoard wallet amounts are integer cents, limited to ¥1–¥5,000.
export function moneyToMinor(input){
 const text=String(input).trim();
 if(!/^(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,2})?$/.test(text))throw Error('请输入正确的充值金额，最多两位小数');
 const [whole,fraction='']=text.split('.');
 const minor=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(minor)||minor<100||minor>500000)throw Error('单次充值金额应在 ¥1 至 ¥5,000 之间');
 return minor;
}
// TXBoard's WalletRechargeController::dto() returns Unix *seconds* for
// created_at/paid_at, unlike most native ISO timestamps. Accept explicit
// timezone-bearing ISO values too for backwards/forwards compatibility.
export function rechargeDate(value){
 if(value===null||value===undefined||value==='')return '—';
 let ms=NaN;
 if((typeof value==='number'&&Number.isSafeInteger(value))||
    (typeof value==='string'&&/^[0-9]{1,12}$/.test(value))){
  const seconds=Number(value);
  if(Number.isSafeInteger(seconds)&&seconds>0)ms=seconds*1000;
 }else if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value)){
  ms=Date.parse(value);
 }
 return Number.isFinite(ms)&&ms>0&&ms<=8.64e15?new Date(ms).toLocaleString('zh-CN'):'—';
}
