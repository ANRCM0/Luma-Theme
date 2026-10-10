import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {api,getToken,saveToken,clearToken,login,checkout,plans,createTicket,orderCheck,notices} from '../src/live/api.js';

const values=new Map();
globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,val)=>values.set(key,String(val)),removeItem:key=>values.delete(key)};
const originalFetch=globalThis.fetch;
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});

test('authenticated API requests use TXBoard bearer key and same-origin /txapi',async()=>{
 saveToken('test-secret');
 const calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return reply({data:[{id:8,name:'Live'}],request_id:'req-1'})};
 try{
  const result=await plans();
  assert.equal(result[0].name,'Live');
  assert.equal(calls[0].url,'/txapi/plans');
  assert.equal(calls[0].options.headers.Authorization,'Bearer test-secret');
  assert.equal(getToken(),'Bearer test-secret');
 }finally{globalThis.fetch=originalFetch;clearToken()}
});

test('login stores a real returned bearer instead of granting demo session',async()=>{
 let body;
 globalThis.fetch=async(url,opts)=>{body=JSON.parse(opts.body);return reply({data:{auth_data:'Bearer sample-bearer',user:{id:1}},request_id:'req-2'})};
 try{await login('valid@example.com','p455word');assert.equal(body.email,'valid@example.com');assert.equal(getToken(),'Bearer sample-bearer')}
 finally{clearToken();globalThis.fetch=originalFetch}
});

test('API errors fail closed and never invent success payloads',async()=>{
 globalThis.fetch=async()=>reply({error:{code:'INVALID_CREDENTIALS',message:'无效密码'},request_id:'req-3'});
 try{await assert.rejects(()=>login('x@example.com','bad'),/无效密码/);assert.equal(getToken(),'')}
 finally{globalThis.fetch=originalFetch}
});

test('checkout preserves TXBoard type discriminant for QR/redirect payments',async()=>{
 globalThis.fetch=async()=>reply({type:1,data:'https://pay.example.com/order',request_id:'req-4'});
 try{const r=await checkout('TN123',9);assert.equal(r.type,1);assert.equal(r.data,'https://pay.example.com/order')}
 finally{globalThis.fetch=originalFetch}
});

test('ticket saves the real subject, priority and message',async()=>{
 let payload;
 globalThis.fetch=async(url,opts)=>{payload=JSON.parse(opts.body);return reply({data:{id:77},request_id:'req-5'})};
 // POST /tickets answers with the new ticket id, not a boolean.
 try{assert.equal(await createTicket('安装问题',2,'真实问题描述'),77);assert.deepEqual(payload,{subject:'安装问题',level:2,message:'真实问题描述'})}
 finally{globalThis.fetch=originalFetch}
});

test('live mode has no fake subscription, fake plan prices or demo auth bypass',()=>{
 const source=readFileSync(new URL('../src/live/LiveApp.jsx',import.meta.url),'utf8');
 assert.ok(source.includes('tx.verifySession()'));
 assert.ok(source.includes('tx.subscribe()'));
 assert.ok(source.includes('tx.createOrder('));
 assert.ok(source.includes('tx.createTicket('));
 assert.ok(!source.includes('example.invalid'));
 assert.ok(!source.includes('viaspeed-demo-tickets'));
 assert.ok(!source.includes('进入演示'));
});

test('notice list comes from the TXBoard /notices endpoint',async()=>{
 const requests=[];
 globalThis.fetch=async(url)=>{
  const parsed=new URL(url,'https://test.local');
  requests.push(parsed.pathname);
  return reply({data:[{id:1,title:'公告 1'},{id:2,title:'重要提醒'}],request_id:'req-6'});
 };
 try{
  const all=await notices();
  assert.equal(all.length,2);
  assert.equal(all[1].title,'重要提醒');
  assert.deepEqual(requests,['/txapi/notices']);
 }finally{globalThis.fetch=originalFetch}
});


test('order status check sends an authenticated read-only trade number to TXBoard',async()=>{
 let requested;
 // GET /orders/{tradeNo} returns the whole order; orderCheck unwraps status.
 globalThis.fetch=async(url,opts)=>{requested={url,opts};return reply({data:{trade_no:'TN-456',status:3},request_id:'req-7'})};
 try{
  saveToken('order-check-token');
  assert.equal(await orderCheck('TN-456'),3);
  assert.equal(requested.url,'/txapi/orders/TN-456');
  assert.equal(requested.opts.method,'GET');
  assert.equal(requested.opts.headers.Authorization,'Bearer order-check-token');
 }finally{clearToken();globalThis.fetch=originalFetch}
});

test('cancelling an order uses POST /orders/{trade_no}/cancel',async()=>{
 const {cancelOrder}=await import('../src/live/api.js');
 let requested;
 globalThis.fetch=async(url,opts)=>{requested={url,opts};return reply({data:true,request_id:'req-8'})};
 try{
  saveToken('cancel-token');
  assert.equal(await cancelOrder('TN-789'),true);
  assert.equal(requested.url,'/txapi/orders/TN-789/cancel');
  assert.equal(requested.opts.method,'POST');
  assert.equal(requested.opts.headers.Authorization,'Bearer cancel-token');
 }finally{clearToken();globalThis.fetch=originalFetch}
});


test('a stale 401 from the previous account cannot invalidate a newer login token',async()=>{
 let resolveOld;
 globalThis.fetch=()=>new Promise(resolve=>{resolveOld=resolve});
 try{
  saveToken('old-account');
  const pending=api('/me');
  saveToken('new-account');
  resolveOld(reply({error:{code:'UNAUTHORIZED',message:'Token expired'},request_id:'req-9'},401));
  await assert.rejects(pending,/Token expired/);
  assert.equal(getToken(),'Bearer new-account');
 }finally{clearToken();globalThis.fetch=originalFetch}
});
