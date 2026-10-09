import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight,BookOpen,RefreshCcw,Search,Server,Wifi} from 'lucide-react';
import * as tx from './api.js';
import {positiveTrafficRate,knowledgePlainText} from './user-data.js';

const pages={
 nodes:{title:'节点列表',eyebrow:'AVAILABLE NODES',intro:'可用节点来自当前账号的 TXBoard 节点接口。',fetch:tx.serverNodes},
 traffic:{title:'流量记录',eyebrow:'TRAFFIC HISTORY',intro:'查看本月流量记录及节点倍率。',fetch:tx.trafficLog},
 knowledge:{title:'帮助中心',eyebrow:'HELP CENTER',intro:'安装、订阅与常见问题。',fetch:tx.knowledgeArticles}
};
function asDate(value){
 const seconds=Number(value);
 return Number.isFinite(seconds)&&seconds>0?new Date(seconds*1000).toLocaleString('zh-CN'):'—';
}
function TrafficContent({rows,config={}}){
 return rows.length?<div className="live-data-table-scroll"><table className="live-data-table">
  <thead><tr><th>时间</th>{config.showUpload!==false&&<th>上传</th>}{config.showDownload!==false&&<th>下载</th>}{config.showRate!==false&&<th>倍率</th>}<th>合计</th></tr></thead>
  <tbody>{rows.map((row,i)=>{
   const rate=positiveTrafficRate(row);
   const upload=Number(row.u)||0,download=Number(row.d)||0;
   return <tr key={String(row.record_at)+'-'+i}><td>{asDate(row.record_at)}</td>{config.showUpload!==false&&<td>{tx.bytes(upload/rate)}</td>}{config.showDownload!==false&&<td>{tx.bytes(download/rate)}</td>}{config.showRate!==false&&<td><span className="live-data-tag">{rate} ×</span></td>}<td>{tx.bytes((upload+download)/rate)}</td></tr>;
  })}</tbody>
 </table></div>:<p className="live-data-empty">本月暂无流量记录。</p>;
}
function NodesContent({rows,onShop,config={}}){
 return rows.length?<div className="live-node-list">
  <div className="live-node-head"><span>节点名称</span><span>{config.showRate===false?'状态':'状态 · 倍率'}</span></div>
  {rows.map(node=><div className="live-node-row" key={node.id}>
   <div className="live-node-identity"><strong>{String(node.name??'未命名节点')}</strong>{config.showTags!==false&&node.tags.length>0&&<div className="live-node-tags">{node.tags.map((tag,i)=><span key={i}>{tag}</span>)}</div>}</div>
   <div className="live-node-meta"><span className={'live-node-status '+(node.is_online?'online':'offline')}><i aria-hidden="true"/>{node.is_online?'在线':'离线'}</span>{config.showRate!==false&&<span className="live-data-tag">{node.rate??1} ×</span>}</div>
  </div>)}
 </div>:<div className="live-data-empty"><p>当前没有可用节点。节点列表会根据账号订阅权限由服务器返回。</p><button type="button" className="secondary" onClick={onShop}>查看可用套餐 <ArrowRight size={15}/></button></div>;
}
function KnowledgeContent({rows,config={}}){
 const [category,setCategory]=useState('all');
 const [keyword,setKeyword]=useState('');
 const categories=useMemo(()=>[...new Set(rows.map(x=>String(x.category||'')).filter(Boolean))], [rows]);
 const filtered=rows.filter(x=>(category==='all'||String(x.category)===category)&&
  (!keyword.trim()||(String(x.title||'')+' '+knowledgePlainText(x.body)).toLowerCase().includes(keyword.trim().toLowerCase())));
 return <>
  {config.showSearch!==false&&<label className="live-data-search"><Search size={17}/><input aria-label="搜索帮助文章" placeholder="搜索帮助文章" value={keyword} onChange={e=>setKeyword(e.target.value)}/></label>}
  {config.showCategories!==false&&categories.length>1&&<div className="live-data-categories" role="group" aria-label="帮助分类">
   <button type="button" aria-pressed={category==='all'} className={category==='all'?'active':''} onClick={()=>setCategory('all')}>全部</button>
   {categories.map(item=><button type="button" key={item} aria-pressed={category===item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}
  </div>}
  {filtered.length>0?<div className="live-knowledge-list">{filtered.map((item,i)=><details key={item.id??i}>
   <summary><BookOpen size={16}/><span>{String(item.title||'未命名文章')}</span><span className="live-knowledge-arrow">⌄</span></summary>
   <div className="live-knowledge-body">{knowledgePlainText(item.body)||'暂无正文'}</div>
  </details>)}</div>:<p className="live-data-empty">{rows.length?'没有匹配的文章。':'暂无帮助文章。'}</p>}
 </>;
}
export default function UserDataPage({page,onShop,atomic={}}){
 const config=pages[page];
 const [rows,setRows]=useState([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!config)return;
  const token=tx.getToken();
  let alive=true;
  setRows([]);setLoading(true);setError('');
  config.fetch().then(data=>{
   if(alive&&tx.getToken()===token)setRows(data);
  }).catch(err=>{
   if(alive&&tx.getToken()===token)setError(err?.message||'加载失败');
  }).finally(()=>{if(alive&&tx.getToken()===token)setLoading(false)});
  return()=>{alive=false};
 },[page,revision]);
 if(!config)return null;
 return <section className="live-data-page" aria-label={config.title}>
  <div className="live-data-heading"><div><span className="eyebrow">{config.eyebrow}</span><h1>{config.title}</h1><p>{config.intro}</p></div>
   <button type="button" className="secondary" disabled={loading} onClick={()=>setRevision(n=>n+1)}><RefreshCcw size={16}/>刷新</button>
  </div>
  <div className="card live-data-card">
   {loading?<p role="status" className="live-data-empty">正在加载{config.title}…</p>:error?<div role="alert" className="live-data-error">加载失败：{error} <button className="secondary" type="button" onClick={()=>setRevision(n=>n+1)}>重试</button></div>:page==='traffic'?<TrafficContent rows={rows} config={atomic.traffic}/>:page==='nodes'?<NodesContent rows={rows} onShop={onShop} config={atomic.nodes}/>:<KnowledgeContent rows={rows} config={atomic.knowledge}/>}
  </div>
 </section>;
}
