import React,{useEffect,useState,useCallback} from 'react';
import {House,ShoppingBag,UserRound,Headphones,Menu,Sun,Moon,ChevronRight,Copy,Eye,EyeOff,QrCode,Gift,ShieldCheck,Wifi,Clock3,RefreshCcw,Search,Plus,LockKeyhole,Ticket,ArrowRight,Info,LogOut,Wallet,Receipt,X,CheckCircle2,AlertCircle} from 'lucide-react';
import QRCode from 'qrcode';
import * as tx from './api.js';
import {clientsFor} from './import.js';
import './live.css';

const NAV=[['dashboard','我的面板',House],['shop','购买套餐',ShoppingBag],['profile','账号设置',UserRound],['ticket','服务工单',Headphones],['menu','全部菜单',Menu]];
const routeNow=()=>((location.hash.replace(/^#\/?/,'').split(/[/?]/)[0])||'dashboard');
const queryNow=()=>new URLSearchParams(location.hash.split('?')[1]||'');
const date=v=>v?new Date(Number(v)*1000).toLocaleString('zh-CN'):'—';
const status=s=>({0:'待支付',1:'开通中',2:'已取消',3:'已完成',4:'已折抵'})[s]||'未知';
const orderPrice=(p,key)=>Number(p?.[key]||0);
const availablePeriods=p=>tx.PERIODS.filter(([key])=>orderPrice(p,key)>0);
function Card({children,className=''}){return <section className={'card '+className}>{children}</section>}
function Heading({en,title,children}){return <div className="page-heading"><span className="eyebrow">{en}</span><h1>{title}</h1><p>{children}</p></div>}
function Dialog({title,onClose,children,wide=false}){
 useEffect(()=>{const f=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',f);return()=>document.removeEventListener('keydown',f)},[onClose]);
 return <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section role="dialog" aria-modal="true" aria-label={title} className={'dialog '+(wide?'live-dialog-wide':'')}><button className="close" aria-label="关闭" onClick={onClose}><X size={20}/></button><h2>{title}</h2>{children}</section></div>
}
function QrDialog({value,title,onClose}){
 const [src,setSrc]=useState('');const [error,setError]=useState('');
 useEffect(()=>{let live=true;QRCode.toDataURL(value,{width:240,margin:2}).then(url=>{if(live)setSrc(url)}).catch(()=>{if(live)setError('二维码生成失败')});return()=>{live=false}},[value]);
 return <Dialog title={title} onClose={onClose}><div className="live-qr">{src?<img src={src} alt={title}/>:<p>{error||'生成中…'}</p>}</div><p className="muted">仅包含当前账号的真实链接，请勿向陌生人分享。</p><button className="secondary wide" onClick={onClose}>关闭</button></Dialog>
}
export default function LiveApp(){
 const [route,setRoute]=useState(routeNow);
 const [dark,setDark]=useState(()=>localStorage.getItem('vv-theme-appearance')==='dark');
 const [ready,setReady]=useState(false),[session,setSession]=useState(false);
 const [busy,setBusy]=useState(false),[toast,setToast]=useState(''),[error,setError]=useState('');
 const [guest,setGuest]=useState({}),[me,setMe]=useState(null),[subscription,setSubscription]=useState(null);
 const [offers,setOffers]=useState([]),[news,setNews]=useState([]),[stats,setStats]=useState([]);
 const [rows,setRows]=useState([]),[ticketRows,setTicketRows]=useState([]),[invite,setInvite]=useState(null);
 const [filter,setFilter]=useState('全部'),[profileTab,setProfileTab]=useState('基本信息'),[search,setSearch]=useState('');
 const [visibleSub,setVisibleSub]=useState(false),[qr,setQr]=useState(null),[dialog,setDialog]=useState(null);
 const [plan,setPlan]=useState(null),[period,setPeriod]=useState(''),[coupon,setCoupon]=useState(''),[discount,setDiscount]=useState('');
 const [currentOrder,setCurrentOrder]=useState(null),[methods,setMethods]=useState([]),[method,setMethod]=useState('');
 const [ticket,setTicket]=useState(null),[reply,setReply]=useState(''),[authTab,setAuthTab]=useState(()=>['register','forget'].includes(queryNow().get('tab'))?queryNow().get('tab'):'login');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[emailCode,setEmailCode]=useState(''),[inviteCode,setInviteCode]=useState(()=>queryNow().get('code')||'');
 const [oldPass,setOldPass]=useState(''),[newPass,setNewPass]=useState(''),[repeatPass,setRepeatPass]=useState('');
 const notify=useCallback(msg=>setToast(String(msg)),[]);
 const fail=useCallback(err=>{setError(err?.message||'请求失败')},[]);
 const logo=guest.logo||window.settings?.logo||'';
 const title=guest.app_name||window.settings?.title||'TXBoard';
 const themeColor=window.settings?.theme?.color;
 const go=useCallback(next=>{setError('');setDialog(null);setQr(null);location.hash='/'+next;setRoute(next);window.scrollTo({top:0,behavior:'instant'})},[]);
 useEffect(()=>{const cb=()=>{setRoute(routeNow());setError('')};window.addEventListener('hashchange',cb);return()=>window.removeEventListener('hashchange',cb)},[]);
 useEffect(()=>{const expire=()=>{setSession(false);setMe(null);setSubscription(null);go('login');notify('登录已过期，请重新登录')};window.addEventListener('txboard:unauthorized',expire);return()=>window.removeEventListener('txboard:unauthorized',expire)},[go,notify]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('vv-theme-appearance',dark?'dark':'light')},[dark]);
 useEffect(()=>{document.title=title;document.documentElement.dataset.vvAccent=themeColor||'default'},[title,themeColor]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),4000);return()=>clearTimeout(t)},[toast]);
 const loadMain=useCallback(async()=>{
   const info=await tx.user();
   setMe(info);
   const [sub,p,ann,s]=await Promise.allSettled([tx.subscribe(),tx.plans(),tx.notices(),tx.stat()]);
   if(sub.status==='fulfilled')setSubscription(sub.value);
   if(p.status==='fulfilled')setOffers(Array.isArray(p.value)?p.value:[]);
   if(ann.status==='fulfilled')setNews(ann.value);
   if(s.status==='fulfilled')setStats(s.value);
 },[]);
 useEffect(()=>{
   let alive=true;
   (async()=>{
     const config=await tx.guest().catch(()=>({}));
     if(alive)setGuest(config||{});
     const verify=queryNow().get('verify');
     if(verify && routeNow()==='login'){
       try{await tx.tokenLogin(verify)}catch(e){if(alive)setError(e.message||'快捷登录失败')}
     }
     if(!tx.getToken()){if(alive){setSession(false);setReady(true)}return}
     try{
       const checked=await tx.verifySession();
       if(!checked?.is_login)throw new tx.ApiError('登录已失效',401);
       if(!alive)return;
       await loadMain();
       if(alive){setSession(true);if(routeNow()==='login')go('dashboard')}
     }catch(e){
       if(e.status===401||e.status===403){tx.clearToken();if(alive)setSession(false)}
       else if(alive)setError('加载用户数据失败：'+(e.message||'网络异常'));
     }finally{if(alive)setReady(true)}
   })();
   return()=>{alive=false};
 },[loadMain,go]);
 const loadSection=useCallback(async(section)=>{
   try{
    if(section==='orders')setRows((await tx.orders())||[]);
    if(section==='ticket')setTicketRows((await tx.tickets())||[]);
    if(section==='profile')setInvite(await tx.invites());
   }catch(e){fail(e)}
 },[fail]);
 useEffect(()=>{if(session)void loadSection(route)},[session,route,loadSection]);
 const logout=()=>{tx.clearToken();setSession(false);setMe(null);setSubscription(null);setRows([]);setTicketRows([]);go('login');notify('已安全退出')};
 const act=async(fn,success)=>{
   setBusy(true);setError('');
   try{const result=await fn();if(success)notify(success);return result}
   catch(e){fail(e);return null}
   finally{setBusy(false)}
 };
 async function signIn(e){
   e.preventDefault();
   const mode=authTab;
   const data={email:email.trim(),password,...(emailCode?{email_code:emailCode}:{}),...(inviteCode?{invite_code:inviteCode}:{})};
   const result=await act(async()=>{
     if(mode==='login')return tx.login(email.trim(),password);
     if(mode==='register'){if(password!==confirm)throw Error('两次输入的密码不一致');return tx.register(data)}
     if(password!==confirm)throw Error('两次输入的密码不一致');
     await tx.forgetPassword(email.trim(),password,emailCode);return true;
   });
   if(!result)return;
   if(mode==='forget'){setAuthTab('login');setPassword('');notify('密码已重置，请重新登录');return}
   await loadMain().catch(fail);
   try{const user=await tx.user();setMe(user);setSession(true);go('dashboard');notify('登录成功')}
   catch(e){fail(e)}
 }
 async function openBuy(item){
   setPlan(item);const options=availablePeriods(item);setPeriod(options[0]?.[0]||'');setCoupon('');setDiscount('');setDialog('purchase')
 }
 async function buy(){
   if(!plan||!period)return;
   const trade=await act(async()=>{
     const all=await tx.orders();
     const blocking=Array.isArray(all)?all.find(o=>o.status===0||o.status===1):null;
     if(blocking){
       if(blocking.status===1)throw Error('有正在开通中的订单，请稍后');
       if(!window.confirm('存在未支付订单，取消旧订单并继续吗？'))return null;
       await tx.cancelOrder(blocking.trade_no);
     }
     return tx.createOrder(plan.id,period,coupon.trim());
   },'订单已创建');
   if(trade){setDialog(null);await showOrder(trade)}
 }
 async function showOrder(tradeNo){
   setDialog('order');
   const order=await act(()=>tx.orderDetail(tradeNo));
   if(!order)return;
   setCurrentOrder(order);
   if(order.status===0){
     const paymentList=await tx.payments().catch(()=>[]);
     setMethods(paymentList||[]);
     setMethod(String(order.payment_id||paymentList?.[0]?.id||''));
   }else{setMethods([]);setMethod('')}
 }
 async function pay(){
   if(!currentOrder)return;
   const selected=methods.find(x=>String(x.id)===method);
   if(selected?.payment==='StripeCredit'){
     window.location.assign('/user-spa/#/order/'+encodeURIComponent(currentOrder.trade_no));
     return;
   }
   const result=await act(()=>tx.checkout(currentOrder.trade_no,method?Number(method):undefined));
   if(!result)return;
   if(result.type===0 && typeof result.data==='string'){setQr({title:'支付二维码',value:result.data});notify('请在支付完成后刷新订单状态');return}
   if(result.type===1 && typeof result.data==='string'){
     const url=tx.safeExternal(result.data);
     if(!url){fail(Error('支付平台返回了不安全的跳转地址'));return}
     const page=window.open(url,'_blank','noopener,noreferrer');
     if(!page)notify('支付页面可能被弹窗拦截，请在订单中重试');
     return;
   }
   await showOrder(currentOrder.trade_no);
   void loadMain();
 }
 async function createTicket(e){
   e.preventDefault();const data=new FormData(e.currentTarget);
   const subject=String(data.get('title')||'').trim(),message=String(data.get('description')||'').trim(),level=Number(data.get('level')||1);
   if(!subject||message.length<5){setError('请填写标题及至少 5 字的问题描述');return}
   const result=await act(()=>tx.createTicket(subject,level,message),'工单已提交');
   if(result!==null){setDialog(null);await loadSection('ticket')}
 }
 async function viewTicket(item){
   const detail=await act(()=>tx.ticketDetail(item.id));
   if(detail){setTicket(detail);setDialog('ticket-detail')}
 }
 async function sendReply(e){
   e.preventDefault();if(!ticket||!reply.trim())return;
   const result=await act(()=>tx.replyTicket(ticket.id,reply.trim()),'回复成功');
   if(result!==null){setReply('');await viewTicket(ticket);await loadSection('ticket')}
 }
 async function closeCurrent(){
   if(!ticket||!window.confirm('确定关闭此工单吗？'))return;
   const result=await act(()=>tx.closeTicket(ticket.id),'已关闭工单');
   if(result!==null){await viewTicket(ticket);await loadSection('ticket')}
 }
 async function copy(value){
   if(!value)return;
   try{await navigator.clipboard.writeText(value);notify('已复制到剪贴板')}
   catch{fail(Error('复制失败，请检查剪贴板权限'))}
 }
 const header=<header className="top"><div className="head-inner"><a className="brand" href="#/dashboard" onClick={e=>{e.preventDefault();go('dashboard')}}>{logo?<img src={logo} alt="站点 Logo"/>:<ShieldCheck size={32}/>} {title}</a>{session&&<nav className="desktop-nav" aria-label="主导航">{NAV.map(([id,label,Icon])=><button key={id} className={route===id?'selected':''} onClick={()=>go(id)}><Icon size={18}/>{label}</button>)}</nav>}<div className="head-actions"><button aria-label="切换主题" onClick={()=>setDark(x=>!x)}>{dark?<Sun size={20}/>:<Moon size={20}/>}</button>{session&&<button aria-label="退出登录" title="退出登录" onClick={logout}><LogOut size={20}/></button>}</div></div></header>;
 if(!ready)return <div className="app live-portal">{header}<main className="container"><Card>正在验证登录状态…</Card></main></div>;
 if(!session)return <div className="app live-portal live-login" style={window.settings?.background_url?{backgroundImage:"linear-gradient(#10252daa,#10252daa),url("+JSON.stringify(window.settings.background_url)+")",backgroundSize:"cover"}:{}}>{header}<main className="login-card"><h1>{authTab==='login'?'登录 ':authTab==='register'?'注册 ':'重置密码 '}{title}</h1><p>{guest.app_description||window.settings?.description||'欢迎使用 TXBoard'}</p>{error&&<p role="alert" className="live-error">{error}</p>}
   {Number(guest.is_captcha)===1?<><p className="muted">站点已启用验证码，请使用 TXBoard 原生登录界面完成安全验证。登录成功后可返回本主题。</p><a className="primary wide live-link" href={'/user-spa/#/login'+(authTab==='register'?'?tab=register':authTab==='forget'?'?tab=forget':'')}>前往安全登录 / 注册</a></>:
   <form onSubmit={signIn}><label>邮箱地址<input value={email} type="email" autoComplete="username" required onChange={e=>setEmail(e.target.value)} placeholder="请输入邮箱"/></label><label>{authTab==='forget'?'新密码':'密码'}<input type="password" autoComplete={authTab==='login'?'current-password':'new-password'} minLength={authTab==='login'?1:8} required value={password} onChange={e=>setPassword(e.target.value)}/></label>{authTab!=='login'&&<label>确认密码<input type="password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>}{authTab==='register'&&Number(guest.is_invite_force)===1&&<label>邀请码<input value={inviteCode} required onChange={e=>setInviteCode(e.target.value)}/></label>}{(authTab==='forget'||(authTab==='register'&&Number(guest.is_email_verify)===1))&&<label>邮箱验证码<div className="live-row"><input required value={emailCode} onChange={e=>setEmailCode(e.target.value)}/><button type="button" className="secondary" disabled={busy||!email.trim()} onClick={()=>act(()=>tx.sendVerify(email.trim(),authTab==='forget'?'forget':'register'),'验证码已发送')}>发送验证码</button></div></label>}{authTab==='register'&&guest.tos_url&&<p className="muted">注册即表示你已阅读 <a href={tx.safeExternal(guest.tos_url)||'#'} target="_blank" rel="noopener noreferrer">服务条款</a></p>}<button type="submit" disabled={busy} className="primary wide">{busy?'提交中…':authTab==='login'?'登录':authTab==='register'?'注册账号':'重置密码'}</button></form>}
   <p className="live-auth-options">{authTab!=='login'&&<button onClick={()=>{setError('');setAuthTab('login')}}>返回登录</button>}{authTab==='login'&&<><button onClick={()=>{setError('');setAuthTab('forget')}}>忘记密码？</button>{Number(guest.register_enable)!==0&&Number(guest.stop_register)!==1&&<button onClick={()=>{setError('');setAuthTab('register')}}>立即注册</button>}</>}</p>
 </main></div>;
 const planName=subscription?.plan?.name||'Free';
 const used=Number(subscription?.u||me?.u||0)+Number(subscription?.d||me?.d||0);
 const quota=Number(subscription?.transfer_enable||0)||Number(subscription?.plan?.transfer_enable||0)*1073741824||Number(me?.transfer_enable||0);
 const remaining=Math.max(0,quota-used);
 const activePlans=offers.filter(p=>p.show!==0&&p.show!==false);
 const featured=activePlans.find(p=>p.month_price>0)||activePlans[0];
 const subUrl=subscription?.subscribe_url;
 const inviteCodeValue=invite?.codes?.[0]?.code;
 const inviteLink=inviteCodeValue?(guest.app_url||location.origin).replace(/\/$/,'')+'/#/login?tab=register&code='+encodeURIComponent(inviteCodeValue):'';
 return <div className="app live-portal">{header}<main className="container page-transition" key={route}>
 {error&&<div className="live-error" role="alert">{error} <button onClick={()=>setError('')}>×</button></div>}
 {route==='dashboard'&&<>
  <div className="dashboard-grid">
   <div className="welcome card"><div className="welcome-text"><span className="eyebrow">WELCOME BACK</span><h1>Halo, {me?.email?.split('@')[0]||'用户'} 👋</h1><p>欢迎回来，查看你的订阅与流量信息。</p><div className="status-pill">{planName}<span>{subscription?.plan?'当前套餐':'暂无订阅'}</span></div><div className="welcome-actions"><button className="secondary" onClick={()=>go('shop')}>浏览套餐 <ArrowRight size={15}/></button><button className="welcome-help" onClick={()=>go('ticket')}>获取帮助</button></div><div className="stats"><div><span>到期时间</span><strong>{subscription?.expired_at?date(subscription.expired_at).split(' ')[0]:'长期有效'}</strong></div><div><span>流量重置</span><strong>{subscription?.reset_day?subscription.reset_day+' 天':'—'}</strong></div><div><span>剩余流量</span><strong>{tx.bytes(remaining)}</strong></div></div></div><div className="welcome-decor"><Wifi size={108} strokeWidth={1.1}/></div></div>
   <div className="dashboard-side"><Card className="notice-card"><div className="section-title"><div><Info size={20}/><h3>重要通知</h3></div></div>{news.length?<><h4>{news[0].title}</h4><p className="muted clamp">{String(news[0].content||'').replace(/<[^>]*>/g,' ').slice(0,160)}</p></>:<p className="muted">暂无公告</p>}</Card><Card className="recommend-card"><div className="small-label">为你推荐</div>{featured?<><div className="plan-side"><div><strong>{featured.name}</strong><p>{featured.transfer_enable} GB 流量</p></div><div className="price">{tx.money(availablePeriods(featured)[0]&&featured[availablePeriods(featured)[0][0]])}</div></div><button className="primary wide" onClick={()=>openBuy(featured)}>查看套餐 <ArrowRight size={16}/></button></>:<p className="muted">暂无在售套餐</p>}</Card></div>
  </div><div className="section-head"><h2>订阅管理</h2><p>管理你的真实订阅信息和客户端</p></div><div className="content-grid"><Card className="subscribe-card"><div className="section-title"><div><ShieldCheck size={21}/><h3>订阅链接</h3></div><button className="link" disabled={!subUrl} onClick={()=>setQr({title:'订阅二维码',value:subUrl})}><QrCode size={16}/> 二维码</button></div><p className="muted">订阅链接属于敏感凭证，请勿公开分享。</p><div className="subscription"><span className="live-break">{subUrl?(visibleSub?subUrl:'https://••••••••••••••••'):'暂无订阅链接'}</span><button aria-label="显示或隐藏订阅链接" onClick={()=>setVisibleSub(v=>!v)} disabled={!subUrl}>{visibleSub?<EyeOff size={17}/>:<Eye size={17}/>}</button><button aria-label="复制订阅链接" onClick={()=>copy(subUrl)} disabled={!subUrl}><Copy size={17}/></button></div><div className="subhint">已用 {tx.bytes(used)} / {quota?tx.bytes(quota):'—'}</div><div className="live-traffic"><div style={{width:(quota?Math.min(100,used/quota*100):0)+'%'}}/></div><h3 className="client-heading">一键导入客户端</h3><div className="clients"><button disabled={!subUrl} onClick={()=>copy(subUrl)}><div className="client-icon"><Copy size={17}/></div><span>复制链接</span></button>{clientsFor(subUrl,title).map((client,i)=><button key={client.name} onClick={()=>{window.location.href=client.href}}><div className={"client-icon icon"+(i%6)}>{client.name.charAt(0)}</div><span>{client.name}</span></button>)}</div></Card><Card className="my-plan"><div className="section-title"><div><Gift size={21}/><h3>我的套餐</h3></div></div>{subscription?.plan?<div className="empty-plan"><ShieldCheck size={36}/><h3>{subscription.plan.name}</h3><p className="muted">到期时间：{date(subscription.expired_at)}</p><p className="muted">已使用 {tx.bytes(used)} / {quota?tx.bytes(quota):'—'}</p><button className="primary" onClick={()=>go('shop')}>续费或升级</button></div>:<div className="empty-plan"><ShoppingBag size={36}/><h3>暂无有效套餐</h3><button className="primary" onClick={()=>go('shop')}>前往购买</button></div>}</Card></div>
 </>}
 {route==='shop'&&<><Heading en="SUBSCRIPTION PLANS" title="购买套餐">以下套餐、价格与销售状态实时读取自 TXBoard。</Heading><div className="filters">{['全部','月付','季付','半年付','年付','一次性'].map(label=><button key={label} className={filter===label?'active':''} onClick={()=>setFilter(label)}>{label}</button>)}</div><div className="plans">{activePlans.flatMap(p=>{const options=availablePeriods(p);const matches=filter==='全部'||options.some(([,label])=>label===filter);return matches?[<Card key={p.id} className="product"><div className="plan-name">{p.name}</div><div className="product-price"><strong>{tx.money(options[0]&&p[options[0][0]])}</strong><span> 起</span></div><p className="muted">{p.transfer_enable} GB · {p.content?String(p.content).replace(/<[^>]+>/g,' ').slice(0,80):'套餐服务'}</p><hr/><div className="feature"><Wifi size={18}/>套餐流量<strong>{p.transfer_enable} GB</strong></div><div className="feature"><RefreshCcw size={18}/>可选周期<strong>{options.length} 种</strong></div><div className="plan-actions"><button className="primary wide" disabled={!options.length} onClick={()=>openBuy(p)}>选择套餐 <ArrowRight size={16}/></button></div></Card>]:[]})}</div>{!activePlans.length&&<Card>当前没有可购买的套餐。</Card>}</>}
 {route==='orders'&&<><Heading en="ORDER HISTORY" title="我的订单">查看真实订单与支付状态。</Heading><Card><div className="ticket-toolbar"><h3>订单记录（{rows.length}）</h3><button className="secondary" onClick={()=>loadSection('orders')}>刷新</button></div>{rows.length?rows.map(o=><button className="live-list-row" key={o.trade_no} onClick={()=>showOrder(o.trade_no)}><div><strong>{o.plan?.name||'套餐 #'+o.plan_id}</strong><p className="muted">{o.trade_no} · {date(o.created_at)}</p></div><div>{tx.money(o.total_amount)} · {status(o.status)} <ChevronRight size={15}/></div></button>):<p className="muted">暂无订单</p>}</Card></>}
 {route==='profile'&&<><Heading en="ACCOUNT CENTER" title="账号设置">账户信息、安全设置与邀请管理。</Heading><div className="tabs">{['基本信息','安全设置','邀请管理','财务记录'].map(t=><button key={t} className={profileTab===t?'active':''} onClick={()=>setProfileTab(t)}>{t}</button>)}</div>{profileTab==='基本信息'&&<div className="profile-grid"><Card><h3>个人信息</h3><div className="field"><label>邮箱地址</label><input readOnly value={me?.email||''}/></div><div className="field"><label>当前套餐</label><input readOnly value={planName}/></div></Card><Card><h3>账户余额</h3><div className="account-balance">{tx.money(me?.balance)}</div><p className="muted">可用余额，金额由 TXBoard 返回</p><button className="secondary wide" onClick={()=>go('orders')}>查看订单</button></Card></div>}
 {profileTab==='安全设置'&&<Card className="form-card"><h3>修改密码</h3><form onSubmit={async e=>{e.preventDefault();if(newPass.length<8||newPass!==repeatPass){setError('请确认新密码至少 8 位且两次一致');return}const result=await act(()=>tx.changePassword(oldPass,newPass),'密码修改成功');if(result!==null){setOldPass('');setNewPass('');setRepeatPass('')}}}><div className="field"><label>当前密码</label><input type="password" required value={oldPass} onChange={e=>setOldPass(e.target.value)}/></div><div className="field"><label>新密码</label><input type="password" minLength="8" required value={newPass} onChange={e=>setNewPass(e.target.value)}/></div><div className="field"><label>确认新密码</label><input type="password" minLength="8" required value={repeatPass} onChange={e=>setRepeatPass(e.target.value)}/></div><button className="primary" disabled={busy}>修改密码</button></form></Card>}
 {profileTab==='邀请管理'&&<Card><h3>邀请管理</h3><div className="finance-summary"><div><span>邀请码</span><strong>{invite?.codes?.length||0}</strong></div><div><span>有效佣金</span><strong>{tx.money(invite?.stat?.[1])}</strong></div><div><span>佣金余额</span><strong>{tx.money(me?.commission_balance)}</strong></div></div><div className="subscription"><span className="live-break">{inviteLink||'尚未生成邀请码'}</span><button disabled={!inviteLink} aria-label="复制邀请链接" onClick={()=>copy(inviteLink)}><Copy size={16}/></button></div><button className="secondary" disabled={busy} onClick={async()=>{const result=await act(tx.createInvite,'邀请码已生成');if(result!==null)await loadSection('profile')}}>生成邀请码</button></Card>}
 {profileTab==='财务记录'&&<Card><h3>财务概览</h3><div className="finance-summary"><div><span>余额</span><strong>{tx.money(me?.balance)}</strong></div><div><span>佣金余额</span><strong>{tx.money(me?.commission_balance)}</strong></div><div><span>订单数量</span><strong>{rows.length}</strong></div></div><button className="secondary" onClick={()=>go('orders')}>查看订单明细</button><button className="secondary" onClick={()=>window.location.assign('/user-spa/#/profile')}>查看完整账户管理</button></Card>}</>}
 {route==='ticket'&&<><div className="live-ticket-header"><Heading en="SUPPORT CENTER" title="服务工单">与客服交流，所有内容均提交至真实 TXBoard 工单接口。</Heading><button className="primary" onClick={()=>setDialog('ticket-create')}><Plus size={18}/> 创建工单</button></div><Card><div className="ticket-toolbar"><h3>我的工单（{ticketRows.length}）</h3><div className="search"><Search size={17}/><input placeholder="搜索工单…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div>{ticketRows.filter(x=>String(x.subject||'').includes(search)).map(t=><button key={t.id} className="live-list-row" onClick={()=>viewTicket(t)}><div><strong>{t.subject}</strong><p className="muted">#{t.id} · {date(t.updated_at)} · {t.status===1?'已关闭':'处理中'}</p></div><ChevronRight size={18}/></button>)}{!ticketRows.length&&<p className="muted">暂无工单</p>}</Card></>}
 {route==='menu'&&<><Heading en="QUICK ACCESS" title="全部菜单">快速访问常用功能。</Heading><div className="menu-grid">{[...NAV.slice(0,4),['orders','我的订单',Receipt],['invite','邀请管理',Gift],['nodes','节点列表',Wifi],['traffic','流量记录',RefreshCcw],['knowledge','帮助中心',Info],['logout','退出登录',LogOut]].map(([key,name,Icon])=><button key={key} className="card menu-item" onClick={()=>key==='logout'?logout():key==='invite'?(setProfileTab('邀请管理'),go('profile')):['nodes','traffic','knowledge'].includes(key)?window.location.assign('/user-spa/#/'+({nodes:'node',traffic:'traffic',knowledge:'knowledge'})[key]):go(key)}><Icon size={24}/><strong>{name}</strong><ChevronRight size={17}/></button>)}</div></>}
 {!NAV.some(x=>x[0]===route)&&route!=='orders'&&<Card><p>页面不存在</p><button className="primary" onClick={()=>go('dashboard')}>返回面板</button></Card>}
 </main><footer>© {new Date().getFullYear()} {title} · Powered by TXBoard {window.settings?.version&&<small>v{window.settings.version}</small>} <span>真实账户数据由服务器提供</span></footer><nav className="mobile-nav" aria-label="移动端导航">{NAV.map(([key,name,Icon])=><button key={key} className={route===key?'selected':''} onClick={()=>go(key)}><Icon size={21}/><span>{name}</span></button>)}</nav>
 {toast&&<div className="toast" role="status" aria-live="polite"><CheckCircle2 size={18}/>{toast}</div>}
 {qr&&<QrDialog title={qr.title} value={qr.value} onClose={()=>setQr(null)}/>}
 {dialog==='purchase'&&plan&&<Dialog title={'购买 '+plan.name} onClose={()=>setDialog(null)}><p className="muted">{plan.content?String(plan.content).replace(/<[^>]+>/g,' '):'选择支付周期'}</p><div className="live-periods">{availablePeriods(plan).map(([key,label])=><label key={key} className={period===key?'live-period selected':'live-period'}><input type="radio" name="period" value={key} checked={period===key} onChange={()=>{setPeriod(key);setDiscount('')}}/>{label} <strong>{tx.money(plan[key])}</strong></label>)}</div><div className="field"><label>优惠码（可选）</label><div className="live-row"><input value={coupon} onChange={e=>setCoupon(e.target.value)}/><button className="secondary" disabled={!coupon.trim()||busy} onClick={async()=>{const result=await act(()=>tx.checkCoupon(coupon.trim(),plan.id,period));if(result)setDiscount(result.type===2?result.value+'%':tx.money(result.value))}}>验证</button></div></div>{discount&&<p className="muted">优惠码有效：{discount}</p>}<button className="primary wide" disabled={busy||!period} onClick={buy}>{busy?'处理中…':'创建真实订单'}</button></Dialog>}
 {dialog==='order'&&currentOrder&&<Dialog title="订单详情" onClose={()=>{setDialog(null);loadSection('orders')}} wide><div className="live-order"><p>订单号：<strong className="live-break">{currentOrder.trade_no}</strong></p><p>套餐：{currentOrder.plan?.name||currentOrder.plan_id}</p><p>周期：{currentOrder.period}</p><p>金额：<strong>{tx.money(currentOrder.total_amount)}</strong></p><p>状态：{status(currentOrder.status)}</p></div>{currentOrder.status===0&&<><div className="field"><label>支付方式</label><select value={method} onChange={e=>setMethod(e.target.value)} disabled={Boolean(currentOrder.payment_id)}>{!methods.length&&<option value="">无在线支付方式（尝试余额支付）</option>}{methods.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}</select></div>{methods.find(m=>String(m.id)===method)?.payment==='StripeCredit'&&<p className="muted">Stripe 信用卡支付将由 TXBoard 安全支付组件完成。</p>}<button className="primary wide" disabled={busy} onClick={pay}>立即支付</button><button className="secondary wide" onClick={async()=>{if(!window.confirm('确定取消该订单吗？'))return;const result=await act(()=>tx.cancelOrder(currentOrder.trade_no),'订单已取消');if(result!==null)await showOrder(currentOrder.trade_no)}}>取消订单</button></>}<button className="secondary wide" onClick={()=>showOrder(currentOrder.trade_no)}>刷新订单状态</button></Dialog>}
 {dialog==='ticket-create'&&<Dialog title="创建工单" onClose={()=>setDialog(null)}><form onSubmit={createTicket}><div className="field"><label>工单主题</label><input name="title" required maxLength="100"/></div><div className="field"><label>优先级</label><select name="level" defaultValue="1"><option value="0">低</option><option value="1">普通</option><option value="2">高</option></select></div><div className="field"><label>问题描述</label><textarea name="description" minLength="5" maxLength="2000" rows="5" required/></div><button className="primary wide" disabled={busy}>提交工单</button></form></Dialog>}
 {dialog==='ticket-detail'&&ticket&&<Dialog title={ticket.subject} onClose={()=>setDialog(null)} wide><p className="muted">工单 #{ticket.id} · {ticket.status===1?'已关闭':'处理中'}</p><div className="live-thread">{(ticket.message||[]).map(m=><div key={m.id} className={'live-message '+(m.is_me?'mine':'')}><strong>{m.is_me?'我':'客服'}</strong><p>{m.message}</p><small>{date(m.created_at)}</small></div>)}</div>{ticket.status===0&&<form onSubmit={sendReply}><div className="field"><label>回复</label><textarea rows="3" value={reply} required onChange={e=>setReply(e.target.value)}/></div><button className="primary" disabled={busy||!reply.trim()}>发送回复</button><button className="secondary" type="button" disabled={busy} onClick={closeCurrent}>关闭工单</button></form>}</Dialog>}
 </div>
}
