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
  seen.push({url,body:opt.body?JSON.parse(opt.body):null,headers:opt.headers,method:opt.method});
  return new Response(JSON.stringify({data:true,request_id:'req-fin'}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
  tx.saveToken('account-test');
  await tx.transferCommission(1250);
  await tx.withdrawCommission('支付宝','user@example.test');
  await tx.updateUserSettings({remind_traffic:1,remind_expire:0});
  await tx.removeSession('42');
  assert.deepEqual(seen.map(x=>x.url),[
   '/txapi/billing/commission-transfer','/txapi/billing/withdrawals','/txapi/me/preferences','/txapi/auth/sessions/42'
  ]);
  // Preferences are mutated with PATCH, not POST.
  assert.equal(seen[2].method,'PATCH');
  assert.deepEqual(seen[0].body,{transfer_amount:1250});
  assert.deepEqual(seen[1].body,{withdraw_method:'支付宝',withdraw_account:'user@example.test'});
  assert.deepEqual(seen[2].body,{remind_traffic:1,remind_expire:0});
  assert.ok(seen.every(x=>x.headers.Authorization==='Bearer account-test'));
 }finally{tx.clearToken();globalThis.fetch=before;globalThis.localStorage=old}
});
test('Stripe token and captcha proof travel to respective server APIs',async()=>{
 const before=globalThis.fetch;
 const seen=[];
 globalThis.fetch=async(url,opt)=>{
  seen.push({url,body:JSON.parse(opt.body)});
  return new Response(JSON.stringify({type:2,data:true,request_id:'req-stripe'}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
  await tx.checkout('ORD-1',7,'tok_secure_123');
  await tx.sendVerify('alice@example.test','register',{turnstile_token:'proof'});
  await tx.forgetPassword('alice@example.test','password123','112233',{recaptcha_v3_token:'v3-proof'});
  // TXBoard takes the trade number from the URL, not the body.
  assert.equal(seen[0].url,'/txapi/orders/ORD-1/checkout');
  assert.deepEqual(seen[0].body,{method:7,token:'tok_secure_123'});
  assert.equal(seen[1].url,'/txapi/auth/email-code');
  assert.equal(seen[1].body.turnstile_token,'proof');
  assert.equal(seen[2].url,'/txapi/auth/password/forgot');
  assert.equal(seen[2].body.recaptcha_v3_token,'v3-proof');
 }finally{globalThis.fetch=before}
});
test('gift card API never tries to emulate redemption locally',async()=>{
 const before=globalThis.fetch,seen=[];
 globalThis.fetch=async(url,opt)=>{seen.push({url,body:JSON.parse(opt.body)});return new Response(JSON.stringify({status:'success',data:{can_redeem:true}}),{status:200,headers:{'Content-Type':'application/json'}})};
 try{await tx.giftCheck('GC-123');await tx.giftRedeem('GC-123');
  assert.deepEqual(seen.map(x=>x.url),['/txapi/gift-cards/check','/txapi/gift-cards/redeem']);
  assert.deepEqual(seen[1].body,{code:'GC-123'});
 }finally{globalThis.fetch=before}
});
