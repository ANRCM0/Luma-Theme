// Read-only response normalization for TXBoard's user data pages.
// Unlike the common API envelope, /user/server/fetch returns {data:[...]}.
export function nodeRows(payload){
 const data=Array.isArray(payload)?payload:payload?.data;
 if(!Array.isArray(data))throw Error('节点接口响应格式异常');
 return data.filter(row=>row&&typeof row==='object'&&row.id!=null)
  .map(row=>({...row,tags:Array.isArray(row.tags)?row.tags.filter(tag=>typeof tag==='string'):[]}));
}
export function trafficRows(payload){
 const data=Array.isArray(payload)?payload:payload?.data;
 if(!Array.isArray(data))throw Error('流量接口响应格式异常');
 return data.filter(row=>row&&typeof row==='object')
  .sort((a,b)=>Number(b.record_at||0)-Number(a.record_at||0));
}
export function knowledgeRows(payload){
 let data=payload;
 if(!Array.isArray(data)&&data&&typeof data==='object'&&'data' in data)data=data.data;
 if(Array.isArray(data))return data.filter(row=>row&&typeof row==='object');
 if(!data||typeof data!=='object')throw Error('帮助中心接口响应格式异常');
 return Object.values(data).flatMap(value=>Array.isArray(value)?value:[])
  .filter(row=>row&&typeof row==='object');
}
export function positiveTrafficRate(item){
 const n=Number(item?.server_rate??item?.rate??1);
 return Number.isFinite(n)&&n>0?n:1;
}
// Render help as escaped plain text. Knowledge bodies may contain trusted
// server placeholders and arbitrary markup: never inject HTML into React.
export function knowledgePlainText(html){
 return String(html??'')
  .replace(/<(script|style|iframe|object|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'')
  .replace(/<br\s*\/?>/gi,'\n')
  .replace(/<\/(p|div|li|h[1-6])\s*>/gi,'\n')
  .replace(/<[^>]*>/g,'')
  .replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"')
  .replace(/&#39;|&apos;/gi,"'").replace(/&amp;/gi,'&')
  .replace(/\n{3,}/g,'\n\n').trim();
}
export function userFeatureEnabled(key,guest={},userConfig={}){
 const off=v=>v!==undefined&&v!==null&&(v===false||v===0||v==='0'||v==='false');
 return !off(guest?.[key])&&!off(userConfig?.[key]);
}
