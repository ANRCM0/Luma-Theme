// Read-only normalizers for TXBoard native list payloads. Every native
// collection arrives as data:[...] with pagination in meta:{page,per_page,
// total,last_page}; these helpers validate that shape instead of silently
// falling back to demo rows.
function collection(payload,label){
 const data=Array.isArray(payload)?payload:payload?.data;
 if(!Array.isArray(data))throw Error(label+'响应格式异常');
 return data.filter(row=>row&&typeof row==='object');
}

// GET /me/nodes -> [{id,type,version,name,rate,tags,is_online,last_check_at}]
export function nodeRows(payload){
 return collection(payload,'节点接口').filter(row=>row.id!=null)
  .map(row=>({...row,tags:Array.isArray(row.tags)?row.tags.filter(tag=>typeof tag==='string'):[]}));
}

// GET /traffic/logs -> [{id,upload_bytes,download_bytes,record_at,server_rate}]
export function trafficRows(payload){
 return collection(payload,'流量接口')
  .sort((a,b)=>Number(b.record_at||0)-Number(a.record_at||0));
}

// GET /knowledge -> [{id,category,title,body,updated_at}]
export function knowledgeRows(payload){
 return collection(payload,'帮助中心接口');
}

// GET /notices -> {data:[{id,title,content,img_url,tags,created_at}],meta:{...}}
export function noticeRows(payload){
 return collection(payload,'公告接口');
}

// GET /orders and GET /billing/commissions both page with meta.
export function orderRows(payload){
 return collection(payload,'订单接口');
}

// GET /tickets -> [{id,subject,level,status,reply_status,created_at,updated_at}]
export function ticketRows(payload){
 return collection(payload,'工单接口');
}

export function positiveTrafficRate(item){
 const n=Number(item?.server_rate??1);
 return Number.isFinite(n)&&n>0?n:1;
}
// Render help as escaped plain text. Knowledge bodies may contain trusted
// server placeholders and arbitrary markup: never inject HTML into React.
// The body also carries the account's real subscription URL via the
// {{subscribeUrl}} placeholder, so it is redacted before rendering.
export function knowledgePlainText(html){
 return String(html??'')
  .replace(/<(script|style|iframe|object|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'')
  .replace(/<br\s*\/?>/gi,'\n')
  .replace(/<\/(p|div|li|h[1-6])\s*>/gi,'\n')
  .replace(/<[^>]*>/g,'')
  .replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"')
  .replace(/&#39;|&apos;/gi,"'").replace(/&amp;/gi,'&')
  .replace(/https?:\/\/[^\s/]+\/(?:api\/v1\/client\/subscribe|txapi\/client\/subscribe)\?token=[^\s&]+/gi,'[订阅链接已隐藏]')
  .replace(/\n{3,}/g,'\n\n').trim();
}
export function userFeatureEnabled(key,guest={},userConfig={}){
 const off=v=>v!==undefined&&v!==null&&(v===false||v===0||v==='0'||v==='false');
 return !off(guest?.[key])&&!off(userConfig?.[key]);
}
