import test from 'node:test';
import assert from 'node:assert/strict';
import {moneyToMinor,rechargeDate} from '../src/live/wallet-recharge.js';
import {saveToken,clearToken,createRecharge,rechargeCheckout,rechargeStatus,rechargeHistory} from '../src/live/api.js';
const reply=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
test('wallet amount parser handles decimal cents and rejects overflows',()=>{
 assert.equal(moneyToMinor('1'),100);
 assert.equal(moneyToMinor('25.60'),2560);
 assert.equal(moneyToMinor('5000.00'),500000);
 for(const value of ['0.5','0','5000.01','-1','1.999','1e3'])assert.throws(()=>moneyToMinor(value));
 assert.notEqual(rechargeDate(1760000000),'—');
});
test('wallet native requests retain bearer and UUID idempotency headers',async()=>{
 const oldFetch=globalThis.fetch,oldStorage=globalThis.localStorage,store=new Map(),calls=[];
 globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 globalThis.fetch=async(url,options)=>{
  calls.push({url,options});
  const data=url.includes('/checkout')?{type:1,data:'https://pay.example.test/checkout'}:
   url.endsWith('/recharges')?{trade_no:'WR123',amount_minor:2500,payment_method_id:3}:
   url.includes('/recharges/WR123')?{trade_no:'WR123',status:0}:
   [{trade_no:'WR123',status:0}];
  const meta=url.includes('page=')?{page:1,per_page:20,total:1,last_page:1}:undefined;
  return reply({data,meta,request_id:'req-wallet'});
 };
 try{
  saveToken('wallet-test');
  const uuid='123e4567-e89b-42d3-a456-426614174000';
  const created=await createRecharge(2500,3,uuid);
  assert.equal(created.trade_no,'WR123');
  assert.equal(calls[0].options.headers.Authorization,'Bearer wallet-test');
  assert.equal(calls[0].options.headers['Idempotency-Key'],uuid);
  assert.equal(JSON.parse(calls[0].options.body).amount_minor,2500);
  assert.deepEqual(await rechargeCheckout('WR123'),{type:1,data:'https://pay.example.test/checkout'});
  assert.equal((await rechargeStatus('WR123')).status,0);
  assert.equal((await rechargeHistory(1)).rows[0].trade_no,'WR123');
  await assert.rejects(()=>createRecharge(0,3,uuid));
 }finally{clearToken();globalThis.fetch=oldFetch;globalThis.localStorage=oldStorage}
});
