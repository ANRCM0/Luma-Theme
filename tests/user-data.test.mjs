import test from 'node:test';
import assert from 'node:assert/strict';
import {nodeRows,trafficRows,knowledgeRows,positiveTrafficRate,knowledgePlainText,userFeatureEnabled} from '../src/live/user-data.js';
import {serverNodes,trafficLog,knowledgeArticles,userCommConfig,saveToken,clearToken} from '../src/live/api.js';

const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
test('node endpoint validates the native {data,meta,request_id} envelope, preserves rates and rejects wrong shape',()=>{
 const result=nodeRows({data:[{id:7,name:'JP-01',rate:2,is_online:true,tags:['Premium']},{id:8,name:'US',tags:null}],meta:{page:1,per_page:10,total:2,last_page:1},request_id:'req-nodes'});
 assert.equal(result.length,2);
 assert.deepEqual(result[0].tags,['Premium']);
 assert.deepEqual(result[1].tags,[]);
 assert.throws(()=>nodeRows({status:'success',data:{}}),/节点接口响应格式异常/);
});
test('traffic endpoint sorts newest first, uses upload_bytes/download_bytes and respects server_rate',()=>{
 const records=trafficRows([{upload_bytes:100,download_bytes:200,record_at:10,server_rate:2},{upload_bytes:300,download_bytes:100,record_at:12,server_rate:0}]);
 assert.equal(records[0].record_at,12);
 assert.equal(records[0].upload_bytes,300);
 assert.equal(records[0].download_bytes,100);
 assert.equal(positiveTrafficRate(records[1]),2);
 assert.equal(positiveTrafficRate(records[0]),1);
 assert.throws(()=>trafficRows({data:false}),/流量接口响应格式异常/);
});
test('knowledge validates the paged collection and strips executable markup rather than injecting it',()=>{
 const result=knowledgeRows({data:[{id:1,title:'教程',category:'安装',body:'<p>导入链接</p>'},{id:2,title:'问答',body:'OK'}],meta:{page:1,per_page:10,total:2,last_page:1}});
 assert.equal(result.length,2);
 assert.equal(knowledgePlainText('<script>alert(1)</script><p>安全 &amp; 有效</p><img src=x onerror=alert(1)>'),'安全 & 有效');
 assert.equal(knowledgePlainText('<p>订阅链接 https://panel.example.test/api/v1/client/subscribe?token=abc%2B1 结束</p>'),'订阅链接 [订阅链接已隐藏] 结束');
 assert.throws(()=>knowledgeRows(null),/帮助中心接口响应格式异常/);
});
test('feature switches only disable on explicit backend zero/false, with missing legacy flags supported',()=>{
 assert.equal(userFeatureEnabled('traffic_log_enable',{},{}),true);
 assert.equal(userFeatureEnabled('traffic_log_enable',{traffic_log_enable:0},{}),false);
 assert.equal(userFeatureEnabled('traffic_log_enable',{}, {traffic_log_enable:'0'}),false);
 assert.equal(userFeatureEnabled('knowledge_enable',{}, {knowledge_enable:'1'}),true);
});
test('Luma menu reads authenticated TXBoard paths without original SPA redirects',async()=>{
 const before=globalThis.fetch,storage=globalThis.localStorage;
 const values=new Map();
 globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const seen=[];
 globalThis.fetch=async(url,options)=>{
  seen.push({url,options});
  const path=new URL(url,'https://test.local').pathname;
  const data=path==='/txapi/me/nodes'?[{id:12,name:'edge',rate:1,tags:[],is_online:true}]
   :path==='/txapi/traffic/logs'?[{id:3,record_at:1770000000,upload_bytes:1024,download_bytes:512,server_rate:1}]
   :path==='/txapi/knowledge'?[{id:9,title:'开始',category:'install',body:'教程'}]
   :{traffic_log_enable:1,knowledge_enable:1};
  return reply({data,meta:path==='/txapi/traffic/logs'?{page:1,per_page:10,total:1,last_page:1}:undefined,request_id:'req-menu'});
 };
 try{
  saveToken('menu-token');
  assert.equal((await serverNodes())[0].name,'edge');
  const traffic=await trafficLog();
  assert.equal(traffic[0].upload_bytes,1024);
  assert.equal(traffic[0].download_bytes,512);
  assert.equal((await knowledgeArticles('zh-CN'))[0].id,9);
  assert.equal((await userCommConfig()).knowledge_enable,1);
  assert.deepEqual(seen.map(x=>x.url),[
   '/txapi/me/nodes','/txapi/traffic/logs',
   '/txapi/knowledge?language=zh-CN','/txapi/me/site-config'
  ]);
  assert.ok(seen.every(x=>x.options.headers.Authorization==='Bearer menu-token'));
 }finally{clearToken();globalThis.fetch=before;globalThis.localStorage=storage}
});
