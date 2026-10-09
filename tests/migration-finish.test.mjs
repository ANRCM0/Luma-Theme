import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as tx from '../src/live/api.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Luma business screens contain no legacy user-spa redirects',()=>{
 const app=read('src/live/LiveApp.jsx');
 const order=read('src/live/OrderPayment.jsx');
 assert.doesNotMatch(app,/user-spa|window\.location\.assign/);
 assert.doesNotMatch(order,/user-spa/);
 assert.match(app,/stripeRef\.current\?\.createToken\(\)/);
 assert.match(app,/CaptchaField ref=\{captchaRef\}/);
 assert.match(app,/gift-card/);
});
test('native TXBoard financial API sends integer cents and withdrawal fields',async()=>{
 const before=globalThis.fetch,old=globalThis.localStorage;
 const values=new Map();
 globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const seen=[];
 globalThis.fetch=async(url,opt)=>{
  seen.push({url,body:opt.body?JSON.parse(opt.body):null,headers:opt.headers});
  return new Response(JSON.stringify({status:'success',data:true}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
  tx.saveToken('account-test');
  await tx.transferCommission(1250);
  await tx.withdrawCommission('支付宝','user@example.test');
  await tx.updateUserSettings({remind_traffic:1,remind_expire:0});
  await tx.removeSession('42');
  assert.deepEqual(seen.map(x=>x.url),[
   '/api/v1/user/transfer','/api/v1/user/ticket/withdraw','/api/v1/user/update','/api/v1/user/removeActiveSession'
  ]);
  assert.deepEqual(seen[0].body,{transfer_amount:1250});
  assert.deepEqual(seen[1].body,{withdraw_method:'支付宝',withdraw_account:'user@example.test'});
  assert.deepEqual(seen[2].body,{remind_traffic:1,remind_expire:0});
  assert.deepEqual(seen[3].body,{session_id:'42'});
  assert.ok(seen.every(x=>x.headers.Authorization==='Bearer account-test'));
 }finally{tx.clearToken();globalThis.fetch=before;globalThis.localStorage=old}
});
test('Stripe token and captcha proof travel to respective server APIs',async()=>{
 const before=globalThis.fetch;
 const seen=[];
 globalThis.fetch=async(url,opt)=>{
  seen.push({url,body:JSON.parse(opt.body)});
  return new Response(JSON.stringify({status:'success',type:2,data:true}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
  await tx.checkout('ORD-1',7,'tok_secure_123');
  await tx.sendVerify('alice@example.test','register',{turnstile_token:'proof'});
  await tx.forgetPassword('alice@example.test','password123','112233',{recaptcha_v3_token:'v3-proof'});
  assert.deepEqual(seen[0].body,{trade_no:'ORD-1',method:7,token:'tok_secure_123'});
  assert.equal(seen[1].body.turnstile_token,'proof');
  assert.equal(seen[2].body.recaptcha_v3_token,'v3-proof');
 }finally{globalThis.fetch=before}
});
test('gift card API never tries to emulate redemption locally',async()=>{
 const before=globalThis.fetch,seen=[];
 globalThis.fetch=async(url,opt)=>{seen.push({url,body:JSON.parse(opt.body)});return new Response(JSON.stringify({status:'success',data:{can_redeem:true}}),{status:200,headers:{'Content-Type':'application/json'}})};
 try{await tx.giftCheck('GC-123');await tx.giftRedeem('GC-123');
  assert.deepEqual(seen.map(x=>x.url),['/api/v1/user/gift-card/check','/api/v1/user/gift-card/redeem']);
  assert.deepEqual(seen[1].body,{code:'GC-123'});
 }finally{globalThis.fetch=before}
});
