import test from 'node:test';
import assert from 'node:assert/strict';
import {nodeRows,trafficRows,knowledgeRows,positiveTrafficRate,knowledgePlainText,userFeatureEnabled} from '../src/live/user-data.js';
import {serverNodes,trafficLog,knowledgeArticles,userCommConfig,saveToken,clearToken} from '../src/live/api.js';

const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
test('node endpoint has a legacy data wrapper, preserves rates and rejects wrong shape',()=>{
 const result=nodeRows({data:[{id:7,name:'JP-01',rate:2,is_online:true,tags:['Premium']},{id:8,name:'US',tags:null}]});
 assert.equal(result.length,2);
 assert.deepEqual(result[0].tags,['Premium']);
 assert.deepEqual(result[1].tags,[]);
 assert.throws(()=>nodeRows({status:'success',data:{}}),/节点接口响应格式异常/);
});
test('traffic endpoint sorts newest first and respects server_rate',()=>{
 const records=trafficRows([{u:100,d:200,record_at:10,server_rate:2},{u:300,d:100,record_at:12,server_rate:0}]);
 assert.equal(records[0].record_at,12);
 assert.equal(positiveTrafficRate(records[1]),2);
 assert.equal(positiveTrafficRate(records[0]),1);
 assert.throws(()=>trafficRows({data:false}),/流量接口响应格式异常/);
});
test('knowledge handles category groups and strips executable markup rather than injecting it',()=>{
 const result=knowledgeRows({安装:[{id:1,title:'教程',category:'安装',body:'<p>导入链接</p>'}],常见问题:[{id:2,title:'问答',body:'OK'}]});
 assert.equal(result.length,2);
 assert.equal(knowledgePlainText('<script>alert(1)</script><p>安全 &amp; 有效</p><img src=x onerror=alert(1)>'),'安全 & 有效');
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
  const data=url.includes('server/fetch')?{data:[{id:12,name:'edge',rate:1,tags:[]}]}
    :url.includes('stat/getTrafficLog')?{status:'success',data:[{record_at:100,u:1024,d:512,server_rate:1}]}
    :url.includes('knowledge/fetch')?{status:'success',data:{help:[{id:9,title:'开始',body:'教程'}]}}
    :{status:'success',data:{traffic_log_enable:1,knowledge_enable:1}};
  return reply(data);
 };
 try{
  saveToken('menu-token');
  assert.equal((await serverNodes())[0].name,'edge');
  assert.equal((await trafficLog())[0].u,1024);
  assert.equal((await knowledgeArticles('zh-CN'))[0].id,9);
  assert.equal((await userCommConfig()).knowledge_enable,1);
  assert.deepEqual(seen.map(x=>x.url),[
   '/api/v1/user/server/fetch','/api/v1/user/stat/getTrafficLog',
   '/api/v1/user/knowledge/fetch?language=zh-CN','/api/v1/user/comm/config'
  ]);
  assert.ok(seen.every(x=>x.options.headers.Authorization==='Bearer menu-token'));
 }finally{globalThis.fetch=before;globalThis.localStorage=storage;clearToken()}
});
