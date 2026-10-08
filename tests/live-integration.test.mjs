import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {api,getToken,saveToken,clearToken,login,checkout,plans,createTicket,orderCheck,notices} from '../src/live/api.js';

const values=new Map();
globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,val)=>values.set(key,String(val)),removeItem:key=>values.delete(key)};
const originalFetch=globalThis.fetch;
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});

test('authenticated API requests use TXBoard bearer key and same-origin /api/v1',async()=>{
 saveToken('test-secret');
 const calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return reply({status:'success',data:[{id:8,name:'Live'}]})};
 try{
  const result=await plans();
  assert.equal(result[0].name,'Live');
  assert.equal(calls[0].url,'/api/v1/user/plan/fetch');
  assert.equal(calls[0].options.headers.Authorization,'Bearer test-secret');
  assert.equal(getToken(),'Bearer test-secret');
 }finally{globalThis.fetch=originalFetch;clearToken()}
});

test('login stores a real returned bearer instead of granting demo session',async()=>{
 let body;
 globalThis.fetch=async(url,opts)=>{body=JSON.parse(opts.body);return reply({status:'success',data:{auth_data:'sample-bearer'}})};
 try{await login('valid@example.com','p455word');assert.equal(body.email,'valid@example.com');assert.equal(getToken(),'Bearer sample-bearer')}
 finally{clearToken();globalThis.fetch=originalFetch}
});

test('API errors fail closed and never invent success payloads',async()=>{
 globalThis.fetch=async()=>reply({status:'fail',message:'无效密码',data:false});
 try{await assert.rejects(()=>login('x@example.com','bad'),/无效密码/);assert.equal(getToken(),'')}
 finally{globalThis.fetch=originalFetch}
});

test('checkout preserves TXBoard type discriminant for QR/redirect payments',async()=>{
 globalThis.fetch=async()=>reply({status:'success',type:1,data:'https://pay.example.com/order'});
 try{const r=await checkout('TN123',9);assert.equal(r.type,1);assert.equal(r.data,'https://pay.example.com/order')}
 finally{globalThis.fetch=originalFetch}
});

test('ticket saves the real subject, priority and message',async()=>{
 let payload;
 globalThis.fetch=async(url,opts)=>{payload=JSON.parse(opts.body);return reply({status:'success',data:true})};
 try{assert.equal(await createTicket('安装问题',2,'真实问题描述'),true);assert.deepEqual(payload,{subject:'安装问题',level:2,message:'真实问题描述'})}
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


test('notice history follows TXBoard pagination and stops at server total',async()=>{
 const requests=[];
 globalThis.fetch=async(url)=>{
  const parsed=new URL(url,'https://test.local');
  const current=Number(parsed.searchParams.get('current'));
  requests.push(current);
  const items=current===1
   ?Array.from({length:100},(_,i)=>({id:i+1,title:'公告 '+i}))
   :[{id:101,title:'重要提醒'}];
  return reply({status:'success',data:{data:items,total:101}});
 };
 try{
  const all=await notices();
  assert.equal(all.length,101);
  assert.equal(all[100].title,'重要提醒');
  assert.deepEqual(requests,[1,2]);
 }finally{globalThis.fetch=originalFetch}
});


test('order status check sends authenticated, read-only trade number to TXBoard',async()=>{
 let requested;
 globalThis.fetch=async(url,opts)=>{requested={url,opts};return reply({status:'success',data:3})};
 try{
  saveToken('order-check-token');
  assert.equal(await orderCheck('TN-456'),3);
  assert.equal(requested.url,'/api/v1/user/order/check?trade_no=TN-456');
  assert.equal(requested.opts.method,'GET');
  assert.equal(requested.opts.headers.Authorization,'Bearer order-check-token');
 }finally{clearToken();globalThis.fetch=originalFetch}
});
