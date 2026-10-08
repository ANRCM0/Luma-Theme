import React,{useEffect,useState,useCallback,useRef} from 'react';
import {House,ShoppingBag,UserRound,Headphones,Menu,Sun,Moon,ChevronRight,Copy,Eye,EyeOff,PanelLeftOpen,PanelLeftClose,Bell,Mail,QrCode,Gift,ShieldCheck,Wifi,Clock3,RefreshCcw,Search,Plus,LockKeyhole,Ticket,ArrowRight,Info,LogOut,Wallet,Receipt,X,CheckCircle2,AlertCircle} from 'lucide-react';
import QRCode from 'qrcode';
import * as tx from './api.js';
import SubscriptionCenter from './SubscriptionCenter.jsx';
import {resolveSubscriptionConfig,canAttemptReset} from './subscription-center.js';
import {resolveThemeAppearance} from './theme-config.js';
import {resolveNavigationConfig,orderedNavigation,mobileNavigation} from './navigation-config.js';
import {resolveWelcomeConfig,classifyWelcome} from './welcome-config.js';
import {WelcomeBanner,WelcomeSecondaryCard} from './WelcomeCards.jsx';
import ShopCatalog from './ShopCatalog.jsx';
import PurchaseForm from './PurchaseForm.jsx';
import {ExistingOrderDialog,OrderPaymentBody} from './OrderPayment.jsx';
import {firstBlockingOrder,isBlockingOrder,isTerminalOrder,normalizeOrderStatus,MAX_STATUS_POLLS,resolvePaymentConfig} from './order-flow.js';
import {availableCatalogPlans,planPeriods,planPrice,resolveCatalogConfig} from './catalog.js';
import {unseenNotices,markNoticesSeen,noticeVersion,noticePlainText} from './notice.js';
import {resolveNoticeConfig,automaticNotices,recordAutoNotice} from './notice-policy.js';
import './live.css';

const NAV=[['dashboard','我的面板',House],['shop','购买套餐',ShoppingBag],['profile','账号设置',UserRound],['ticket','服务工单',Headphones],['menu','全部菜单',Menu],['orders','我的订单',Receipt]];
const routeNow=()=>((location.hash.replace(/^#\/?/,'').split(/[/?]/)[0])||'dashboard');
const queryNow=()=>new URLSearchParams(location.hash.split('?')[1]||'');
const date=v=>v?new Date(Number(v)*1000).toLocaleString('zh-CN'):'—';
const status=s=>({0:'待支付',1:'开通中',2:'已取消',3:'已完成',4:'已折抵'})[s]||'未知';
const availablePeriods=p=>planPeriods(p).map(({id,label})=>[id,label]);
function Card({children,className=''}){return <section className={'card '+className}>{children}</section>}
function Heading({en,title,children}){return <div className="page-heading"><span className="eyebrow">{en}</span><h1>{title}</h1><p>{children}</p></div>}
function Dialog({title,onClose,children,wide=false}){
 useEffect(()=>{const f=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',f);return()=>document.removeEventListener('keydown',f)},[onClose]);
 return <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section role="dialog" aria-modal="true" aria-label={title} className={'dialog '+(wide?'live-dialog-wide':'')}><button className="close" aria-label="关闭弹窗" onClick={onClose}><X size={20}/></button><h2>{title}</h2>{children}</section></div>
}
function QrDialog({value,title,onClose}){
 const [src,setSrc]=useState('');const [error,setError]=useState('');
 useEffect(()=>{let live=true;QRCode.toDataURL(value,{width:240,margin:2}).then(url=>{if(live)setSrc(url)}).catch(()=>{if(live)setError('二维码生成失败')});return()=>{live=false}},[value]);
 return <Dialog title={title} onClose={onClose}><div className="live-qr">{src?<img src={src} alt={title}/>:<p>{error||'生成中…'}</p>}</div><p className="muted">仅包含当前账号的真实链接，请勿向陌生人分享。</p><button className="secondary wide" onClick={onClose}>关闭</button></Dialog>
}
export default function LiveApp(){
 const [route,setRoute]=useState(routeNow);
 const [sidebarOverride,setSidebarOverride]=useState(null);
 const [dark,setDark]=useState(()=>localStorage.getItem('vv-theme-appearance')==='dark');
 const [ready,setReady]=useState(false),[session,setSession]=useState(false);
 const [busy,setBusy]=useState(false),[toast,setToast]=useState(''),[error,setError]=useState('');
 const [guest,setGuest]=useState({}),[me,setMe]=useState(null),[subscription,setSubscription]=useState(null);
 const [offers,setOffers]=useState([]),[news,setNews]=useState([]),[stats,setStats]=useState([]);
 const [noticeOpen,setNoticeOpen]=useState(false),[selectedNotice,setSelectedNotice]=useState(0),[noticeRevision,setNoticeRevision]=useState(0);
 const [noticeMode,setNoticeMode]=useState('popup'),[noticeFilter,setNoticeFilter]=useState('all');
 const viewedNoticesRef=useRef(new Set()),autoAttemptedRef=useRef(new Set());
 const [rows,setRows]=useState([]),[ticketRows,setTicketRows]=useState([]),[invite,setInvite]=useState(null);
 const [profileTab,setProfileTab]=useState('基本信息'),[search,setSearch]=useState('');
 const [qr,setQr]=useState(null),[dialog,setDialog]=useState(null);
 const [plan,setPlan]=useState(null),[period,setPeriod]=useState(''),[coupon,setCoupon]=useState(''),[discount,setDiscount]=useState(''),[resetMode,setResetMode]=useState(false);
 const [currentOrder,setCurrentOrder]=useState(null),[methods,setMethods]=useState([]),[method,setMethod]=useState('');
 const [blockingOrder,setBlockingOrder]=useState(null),[paying,setPaying]=useState(false),[paymentError,setPaymentError]=useState(''),[paymentLink,setPaymentLink]=useState('');
 const [watchingOrder,setWatchingOrder]=useState(false),[watchExpired,setWatchExpired]=useState(false);
 const createLockRef=useRef(false),payLockRef=useRef(false);
 const [ticket,setTicket]=useState(null),[reply,setReply]=useState(''),[authTab,setAuthTab]=useState(()=>['register','forget'].includes(queryNow().get('tab'))?queryNow().get('tab'):'login');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[emailCode,setEmailCode]=useState(''),[inviteCode,setInviteCode]=useState(()=>queryNow().get('code')||'');
 const [showAuthPassword,setShowAuthPassword]=useState(false);
 const [oldPass,setOldPass]=useState(''),[newPass,setNewPass]=useState(''),[repeatPass,setRepeatPass]=useState('');
 const notify=useCallback(msg=>setToast(String(msg)),[]);
 const fail=useCallback(err=>{setError(err?.message||'请求失败')},[]);
 const logo=guest.logo||window.settings?.logo||'';
 const title=guest.app_name||window.settings?.title||'TXBoard';
 const appearance=resolveThemeAppearance(guest,window.settings,location.origin);
 const themeColor=appearance.color;
 const noticeConfig=resolveNoticeConfig(guest,window.settings);
 const navConfig=resolveNavigationConfig(guest,window.settings);
 const welcomeConfig=resolveWelcomeConfig(guest,window.settings);
 const catalogConfig=resolveCatalogConfig(guest,window.settings);
 const subscriptionConfig=resolveSubscriptionConfig(guest,window.settings);
 const paymentConfig=resolvePaymentConfig(guest,window.settings);
 const sidebarCollapsed=sidebarOverride??navConfig.sidebarCollapsed;
 const visibleNav=orderedNavigation(navConfig.items).map(key=>NAV.find(item=>item[0]===key)).filter(Boolean);
 const mobileNav=mobileNavigation(navConfig.items).map(key=>NAV.find(item=>item[0]===key)).filter(Boolean);
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
    if(section==='profile'){const [inviteData,orderData]=await Promise.all([tx.invites(),tx.orders()]);setInvite(inviteData);setRows(Array.isArray(orderData)?orderData:[])}
   }catch(e){fail(e)}
 },[fail]);
 useEffect(()=>{if(session)void loadSection(route)},[session,route,loadSection]);
 const logout=()=>{tx.clearToken();setSession(false);setMe(null);setSubscription(null);setNews([]);setNoticeOpen(false);viewedNoticesRef.current.clear();setRows([]);setTicketRows([]);go('login');notify('已安全退出')};
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
 async function openBuy(item,preferredPeriod){
   const choices=availablePeriods(item);
   if(!choices.length){notify('当前套餐没有可购买的周期');return}
   const requested=preferredPeriod||catalogConfig.defaultPeriod;
   const initial=choices.some(([id])=>id===requested)?requested:choices[0][0];
   setResetMode(false);setPlan(item);setPeriod(initial);setCoupon('');setDiscount('');setDialog('purchase');
 }
 async function renewCurrent(){
   const id=Number(subscription?.plan_id||me?.plan_id);
   if(!Number.isSafeInteger(id)||id<=0){go('shop');return}
   const current=await act(()=>tx.plan(id));
   if(!current)return;
   const options=availablePeriods(current);
   if(!options.length){notify('当前套餐没有可用续费周期，可查看其他套餐');go('shop');return}
   openBuy(current);
 }
 async function resetTraffic(){
   if(!canAttemptReset(subscription,me)){notify('当前订阅不符合流量重置的基本条件');return}
   const id=Number(subscription?.plan_id||me?.plan_id);
   // The per-user plan endpoint enforces backend purchase eligibility and
   // translates reset_traffic from the stored plan prices to reset_price cents.
   const current=await act(()=>tx.plan(id));
   if(!current)return;
   const price=current?.reset_price;
   if(price===null||price===undefined||!Number.isFinite(Number(price))||Number(price)<0){
     notify('当前套餐没有开放付费流量重置，请查看套餐或联系客服');
     return;
   }
   if(!window.confirm('流量重置会创建一笔新订单，不会延长套餐有效期。继续吗？'))return;
   setResetMode(true);setPlan(current);setPeriod('reset_price');
   setCoupon('');setDiscount('');setDialog('purchase');
 }
 async function refreshSubscription(){
   const response=await act(async()=>{
     const [freshUser,freshSub]=await Promise.all([tx.user(),tx.subscribe()]);
     setMe(freshUser);setSubscription(freshSub);
     return true;
   },'订阅与流量数据已刷新');
   return response;
 }
 async function buy(){
   if(!plan||!period||createLockRef.current||busy)return;
   createLockRef.current=true;
   try{
     const trade=await act(async()=>{
       const existing=firstBlockingOrder(await tx.orders());
       if(existing){
         setBlockingOrder(existing);setDialog('order-conflict');
         return null;
       }
       return tx.createOrder(plan.id,period,coupon.trim());
     });
     if(trade){notify('订单已创建');await showOrder(trade)}
   }finally{createLockRef.current=false}
 }
 async function abandonAndCreate(){
   if(!blockingOrder||normalizeOrderStatus(blockingOrder.status)!==0||createLockRef.current||busy)return;
   if(!window.confirm('确定取消旧订单并创建新订单吗？此操作不能撤销。'))return;
   createLockRef.current=true;
   try{
     const trade=await act(async()=>{
       // Verify the status again before cancellation to avoid racing a payment.
       const current=await tx.orderDetail(blockingOrder.trade_no);
       if(normalizeOrderStatus(current?.status)!==0){
         throw Error('旧订单状态已变化，请先查看原订单');
       }
       await tx.cancelOrder(blockingOrder.trade_no);
       const another=firstBlockingOrder(await tx.orders());
       if(another)throw Error('还有待处理订单，请先完成原订单');
       return tx.createOrder(plan.id,period,coupon.trim());
     });
     if(trade){setBlockingOrder(null);notify('新订单已创建');await showOrder(trade)}
   }finally{createLockRef.current=false}
 }
 async function showOrder(tradeNo){
   setPaymentError('');setPaymentLink('');setWatchingOrder(false);setWatchExpired(false);
   setCurrentOrder(null);setDialog('order');
   const order=await act(()=>tx.orderDetail(tradeNo));
   if(!order){setDialog(null);return}
   setCurrentOrder(order);
   if(normalizeOrderStatus(order.status)===0){
     const paymentList=await tx.payments().catch(()=>[]);
     setMethods(Array.isArray(paymentList)?paymentList:[]);
     setMethod(String(order.payment_id||paymentList?.[0]?.id||''));
   }else{setMethods([]);setMethod('')}
 }
 async function refreshOrderStatus(){
   if(!currentOrder?.trade_no||payLockRef.current)return;
   const trade=currentOrder.trade_no;
   const detail=await act(()=>tx.orderDetail(trade));
   if(!detail)return;
   setCurrentOrder(detail);
   if(isTerminalOrder(detail.status)){
     setWatchingOrder(false);setWatchExpired(false);setPaymentLink('');
     await Promise.all([loadSection('orders'),loadMain()]).catch(()=>{});
   }
 }
 async function cancelCurrentOrder(){
   if(!currentOrder||payLockRef.current||busy||normalizeOrderStatus(currentOrder.status)!==0)return;
   if(!window.confirm('确定取消该订单吗？'))return;
   const check=await act(()=>tx.orderCheck(currentOrder.trade_no));
   if(check===null)return;
   if(normalizeOrderStatus(check)!==0){notify('订单状态已变化，正在刷新');await showOrder(currentOrder.trade_no);return}
   const result=await act(()=>tx.cancelOrder(currentOrder.trade_no),'订单已取消');
   if(result!==null)await showOrder(currentOrder.trade_no);
 }
 async function pay(){
   if(!currentOrder?.trade_no||normalizeOrderStatus(currentOrder.status)!==0||payLockRef.current||busy)return;
   payLockRef.current=true;setPaying(true);setPaymentError('');setPaymentLink('');
   try{
     const trade=currentOrder.trade_no;
     const checked=normalizeOrderStatus(await tx.orderCheck(trade));
     if(checked!==0){
       await showOrder(trade);
       setPaymentError('订单状态已更新，无需重复支付。');
       return;
     }
     const selected=methods.find(x=>String(x.id)===String(method));
     if(selected?.payment==='StripeCredit'){
       window.location.assign('/user-spa/#/order/'+encodeURIComponent(trade));
       return;
     }
     const result=await tx.checkout(trade,method?Number(method):undefined);
     if(result.type===0&&typeof result.data==='string'){
       setQr({title:'支付二维码',value:result.data});
       notify('请扫码支付，系统将自动查询支付状态');
       return;
     }
     if(result.type===1&&typeof result.data==='string'){
       const url=tx.safeExternal(result.data);
       if(!url)throw Error('支付平台返回了不安全的跳转地址');
       setPaymentLink(url);
       const opened=window.open(url,'_blank','noopener,noreferrer');
       if(!opened)notify('如果支付页面未打开，请使用订单中的安全支付链接');
       return;
     }
     await showOrder(trade);
     void loadMain();
   }catch(error){
     setPaymentError(error?.message||'支付请求未成功，请稍后重试');
   }finally{payLockRef.current=false;setPaying(false)}
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
 const unseen=unseenNotices(news,window.localStorage,me);
 const visibleNotices=noticeMode==='center'&&noticeFilter==='unread'?unseen:news;
 const currentNotice=visibleNotices.includes(news[selectedNotice])?news[selectedNotice]:visibleNotices[0];
 const selectedPosition=visibleNotices.indexOf(currentNotice);
 const selectNotice=(item)=>{
  const index=news.indexOf(item);
  if(index<0)return;
  setSelectedNotice(index);
  const version=noticeVersion(item);
  if(version)viewedNoticesRef.current.add(version);
 };
 const openNotice=(mode='center',item=news[0])=>{
  setNoticeMode(mode);
  setNoticeFilter('all');
  viewedNoticesRef.current=new Set();
  if(item)selectNotice(item);
  else setSelectedNotice(0);
  setNoticeOpen(true);
 };
 const closeNotice=()=>{
  const read=news.filter(item=>viewedNoticesRef.current.has(noticeVersion(item)));
  markNoticesSeen(read,window.localStorage,me);
  viewedNoticesRef.current.clear();
  setNoticeRevision(v=>v+1);
  setNoticeOpen(false);
 };
 const markAllNotices=()=>{
  markNoticesSeen(news,window.localStorage,me);
  viewedNoticesRef.current.clear();
  setNoticeRevision(v=>v+1);
  setNoticeFilter('all');
 };
 const switchNoticeFilter=next=>{
  setNoticeFilter(next);
  const first=next==='unread'?unseen[0]:news[0];
  if(first)selectNotice(first);
 };
 useEffect(()=>{
  if(!session||!me||!news.length||noticeOpen||dialog||qr||!noticeConfig.popupEnabled)return;
  if(noticeConfig.scope==='dashboard'&&route!=='dashboard')return;
  const userKey=String(me.id??me.email??'');
  if(!userKey||autoAttemptedRef.current.has(userKey))return;
  const pending=automaticNotices(news,noticeConfig,me,window.localStorage,window.sessionStorage);
  if(!pending.length)return;
  const item=pending[0];
  autoAttemptedRef.current.add(userKey);
  recordAutoNotice(item,noticeConfig,me,window.localStorage,window.sessionStorage);
  openNotice('popup',item);
 },[session,me,news,noticeOpen,dialog,qr,route,noticeRevision,
    noticeConfig.popupEnabled,noticeConfig.scope,noticeConfig.tag,noticeConfig.frequency]);
 // Bounded, read-only status checks. Never re-submit checkout or order-save.
 useEffect(()=>{
   if(!session||!paymentConfig.autoCheck||dialog!=='order'||!currentOrder?.trade_no||!isBlockingOrder(currentOrder.status)){
     setWatchingOrder(false);
     return;
   }
   let alive=true,running=false,attempts=0;
   const trade=currentOrder.trade_no;
   setWatchingOrder(true);setWatchExpired(false);
   const check=async()=>{
     if(!alive||running||document.visibilityState==='hidden')return;
     if(attempts>=MAX_STATUS_POLLS){
       if(alive){setWatchingOrder(false);setWatchExpired(true)}
       clearInterval(timer);
       return;
     }
     attempts++;running=true;
     try{
       const result=normalizeOrderStatus(await tx.orderCheck(trade));
       if(!alive||result===null)return;
       if(result!==normalizeOrderStatus(currentOrder.status)){
         const detail=await tx.orderDetail(trade).catch(()=>null);
         if(!alive)return;
         setCurrentOrder(prev=>prev?.trade_no===trade?(detail||{...prev,status:result}):prev);
         if(isTerminalOrder(result)){
           setWatchingOrder(false);setWatchExpired(false);setPaymentLink('');
           void loadSection('orders');void loadMain();
         }
       }
     }catch{
       // Network problems do not imply payment failure. Manual refresh stays available.
     }finally{running=false}
   };
   const timer=setInterval(()=>void check(),paymentConfig.pollMs);
   return ()=>{alive=false;clearInterval(timer)};
 },[session,dialog,currentOrder?.trade_no,currentOrder?.status,loadMain,loadSection,paymentConfig.autoCheck,paymentConfig.pollMs]);
 const header=<header className="top"><div className="head-inner"><a className="brand" href="#/dashboard" onClick={e=>{e.preventDefault();go('dashboard')}}>{logo?<img src={logo} alt="站点 Logo"/>:<ShieldCheck size={32}/>} {title}</a>{session&&navConfig.layout==='top'&&<nav className="desktop-nav" aria-label="主导航">{visibleNav.map(([id,label,Icon])=><button key={id} className={route===id?'selected':''} onClick={()=>go(id)}><Icon size={18}/>{label}</button>)}</nav>}<div className="head-actions">{session&&noticeConfig.centerEnabled&&<button className="live-notice-trigger" aria-label="查看通知" title="查看公告" onClick={()=>openNotice('center')}><Bell size={20}/>{unseen.length>0&&<span className="live-notice-indicator" aria-hidden="true"/>}</button>}<button aria-label="切换主题" onClick={()=>setDark(x=>!x)}>{dark?<Sun size={20}/>:<Moon size={20}/>}</button>{session&&<button aria-label="退出登录" title="退出登录" onClick={logout}><LogOut size={20}/></button>}</div></div></header>;
 if(!ready)return <div className="app live-portal">{header}<main className="container"><Card>正在验证登录状态…</Card></main></div>;
 if(!session)return <div className="app live-portal live-login" style={appearance.backgroundUrl?{backgroundImage:"linear-gradient(#10252d99,#10252d99),url("+JSON.stringify(appearance.backgroundUrl)+")",backgroundSize:"cover"}:{}}>
  {header}
  <main className="login-card live-auth-card" aria-labelledby="live-auth-title">
   <div className="live-auth-intro">
    <div className="live-auth-symbol" aria-hidden="true"><ShieldCheck size={28} strokeWidth={1.8}/></div>
    <div className="live-auth-eyebrow">{title} · 账户中心</div>
    <h1 id="live-auth-title">{authTab==='login'?'欢迎回来':authTab==='register'?'创建您的账号':'找回账号密码'}</h1>
    <p className="live-auth-description">{authTab==='login'?'登录后即可管理订阅、订单与服务支持。':authTab==='register'?'填写以下信息，开启您的服务体验。':'通过邮箱验证码重置您的登录密码。'}</p>
   </div>
   {error&&<p role="alert" className="live-error">{error}</p>}
   {Number(guest.is_captcha)===1
    ?<div className="live-auth-captcha"><p>本站启用了安全验证码，请前往受保护的登录页面完成验证。</p><a className="primary wide live-link" href={'/user-spa/#/login'+(authTab==='register'?'?tab=register':authTab==='forget'?'?tab=forget':'')}>前往安全登录 / 注册 <ArrowRight size={17}/></a></div>
    :<form className="live-auth-form" onSubmit={signIn}>
      <label className="live-auth-field">
       <span className="live-auth-label">邮箱地址</span>
       <span className="live-auth-input-wrap"><Mail size={19} aria-hidden="true"/><input aria-label="邮箱地址" value={email} type="email" inputMode="email" autoComplete="username" required onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></span>
      </label>
      <label className="live-auth-field">
       <span className="live-auth-label">{authTab==='forget'?'新密码':'登录密码'}</span>
       <span className="live-auth-input-wrap"><LockKeyhole size={19} aria-hidden="true"/><input aria-label={authTab==='forget'?'新密码':'登录密码'} type={showAuthPassword?'text':'password'} autoComplete={authTab==='login'?'current-password':'new-password'} minLength={authTab==='login'?1:8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={authTab==='forget'?'至少 8 位字符':'请输入密码'}/><button className="live-auth-reveal" type="button" aria-label={showAuthPassword?'隐藏密码':'显示密码'} aria-pressed={showAuthPassword} onClick={()=>setShowAuthPassword(v=>!v)}>{showAuthPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></span>
      </label>
      {authTab!=='login'&&<label className="live-auth-field"><span className="live-auth-label">确认密码</span><span className="live-auth-input-wrap"><LockKeyhole size={19} aria-hidden="true"/><input type="password" aria-label="确认密码" autoComplete="new-password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="请再次输入密码"/></span></label>}
      {authTab==='register'&&Number(guest.is_invite_force)===1&&<label className="live-auth-field"><span className="live-auth-label">邀请码</span><span className="live-auth-input-wrap"><Gift size={19} aria-hidden="true"/><input aria-label="邀请码" value={inviteCode} required onChange={e=>setInviteCode(e.target.value)} placeholder="请输入邀请码"/></span></label>}
      {(authTab==='forget'||(authTab==='register'&&Number(guest.is_email_verify)===1))&&<label className="live-auth-field"><span className="live-auth-label">邮箱验证码</span><span className="live-auth-input-wrap live-auth-code"><input aria-label="邮箱验证码" required value={emailCode} onChange={e=>setEmailCode(e.target.value)} placeholder="请输入验证码"/><button type="button" className="live-auth-send-code" disabled={busy||!email.trim()} onClick={()=>act(()=>tx.sendVerify(email.trim(),authTab==='forget'?'forget':'register'),'验证码已发送')}>发送验证码</button></span></label>}
      {authTab==='register'&&guest.tos_url&&<p className="live-auth-terms">注册即表示你已阅读并同意 <a href={tx.safeExternal(guest.tos_url)||'#'} target="_blank" rel="noopener noreferrer">服务条款</a></p>}
      <button type="submit" disabled={busy} className="primary wide live-auth-submit">{busy?'提交中…':authTab==='login'?'登录':authTab==='register'?'注册账号':'重置密码'} {!busy&&<ArrowRight size={18}/>}</button>
     </form>}
   <div className="live-auth-options">
    {authTab!=='login'&&<button type="button" onClick={()=>{setError('');setAuthTab('login');setShowAuthPassword(false)}}> <ArrowRight className="live-auth-back-icon" size={15}/> 返回登录</button>}
    {authTab==='login'&&<><button type="button" onClick={()=>{setError('');setAuthTab('forget');setShowAuthPassword(false)}}>忘记密码？</button>{Number(guest.register_enable)!==0&&Number(guest.stop_register)!==1&&<button type="button" onClick={()=>{setError('');setAuthTab('register');setShowAuthPassword(false)}}>注册新账号 <ArrowRight size={15}/></button>}</>}
   </div>
  </main>
  <p className="live-auth-footnote"><ShieldCheck size={15} aria-hidden="true"/> 您的账号信息通过安全连接传输</p>
 </div>;
 const overview=classifyWelcome(me,subscription,welcomeConfig);
 const planName=subscription?.plan?.name||'Free';
 const activePlans=availableCatalogPlans(offers);
 const featured=activePlans.find(p=>catalogConfig.featuredIds.has(String(p.id)))||activePlans[0];
 const inviteCodeValue=invite?.codes?.[0]?.code;
 const inviteLink=inviteCodeValue?(guest.app_url||location.origin).replace(/\/$/,'')+'/#/login?tab=register&code='+encodeURIComponent(inviteCodeValue):'';
 return <div className={'app live-portal '+(navConfig.layout==='sidebar'?'live-layout-sidebar':'live-layout-top')+(sidebarCollapsed?' live-sidebar-collapsed':'')}>{header}
 {navConfig.layout==='sidebar'&&<aside className="live-sidebar" aria-label="桌面侧边栏">
  <div className="live-sidebar-heading"><span>{sidebarCollapsed?'菜单':'快速导航'}</span>
   <button type="button" aria-label={sidebarCollapsed?'展开侧边栏':'收起侧边栏'} onClick={()=>setSidebarOverride(v=>!(v??navConfig.sidebarCollapsed))}>{sidebarCollapsed?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>}</button>
  </div>
  <nav aria-label="侧边栏导航">{visibleNav.map(([id,label,Icon])=><button key={id} title={sidebarCollapsed?label:undefined} aria-label={label} className={route===id?'selected':''} onClick={()=>go(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>
 </aside>}
 <main className="container page-transition" key={route}>
 {error&&<div className="live-error" role="alert">{error} <button onClick={()=>setError('')}>×</button></div>}
 {route==='dashboard'&&<>
  <div className="dashboard-grid">
   <WelcomeBanner user={me} subscription={subscription} overview={overview} config={welcomeConfig} formatBytes={tx.bytes} formatDate={date} onNavigate={go}/>
   <div className="dashboard-side"><WelcomeSecondaryCard mode={welcomeConfig.secondaryCard} featured={featured} subscription={subscription} user={me} overview={overview} formatBytes={tx.bytes} formatMoney={tx.money} availablePeriods={availablePeriods} onBuy={openBuy} onNavigate={go}/></div>
  </div><div className="section-head"><h2>订阅管理</h2><p>管理你的真实订阅信息和客户端</p></div><SubscriptionCenter subscription={subscription} user={me} siteTitle={title} config={subscriptionConfig} formatBytes={tx.bytes}
   onQr={url=>setQr({title:'订阅二维码',value:url})}
   onCopy={copy}
   onImport={client=>{if(client?.href)window.location.href=client.href}}
   onRenew={renewCurrent} onReset={resetTraffic} onShop={()=>go('shop')}
   onRefresh={refreshSubscription} busy={busy}/>
 </>}
 {route==='shop'&&<><Heading en="SUBSCRIPTION PLANS" title="购买套餐">挑选适合自己的订阅方案，订单金额由 TXBoard 服务器确认。</Heading>
  <ShopCatalog plans={activePlans} config={catalogConfig} money={tx.money} onBuy={openBuy}/>
 </>}
 {route==='orders'&&<><Heading en="ORDER HISTORY" title="我的订单">查看真实订单与支付状态。</Heading><Card><div className="ticket-toolbar"><h3>订单记录（{rows.length}）</h3><button className="secondary" onClick={()=>loadSection('orders')}>刷新</button></div>{rows.length?rows.map(o=><button className="live-list-row" key={o.trade_no} onClick={()=>showOrder(o.trade_no)}><div><strong>{o.plan?.name||'套餐 #'+o.plan_id}</strong><p className="muted">{o.trade_no} · {date(o.created_at)}</p></div><div>{tx.money(o.total_amount)} · {status(o.status)} <ChevronRight size={15}/></div></button>):<p className="muted">暂无订单</p>}</Card></>}
 {route==='profile'&&<><Heading en="ACCOUNT CENTER" title="账号设置">账户信息、安全设置与邀请管理。</Heading><div className="tabs">{['基本信息','安全设置','邀请管理','财务记录'].map(t=><button key={t} className={profileTab===t?'active':''} onClick={()=>setProfileTab(t)}>{t}</button>)}</div>{profileTab==='基本信息'&&<div className="profile-grid"><Card><h3>个人信息</h3><div className="field"><label>邮箱地址</label><input readOnly value={me?.email||''}/></div><div className="field"><label>当前套餐</label><input readOnly value={planName}/></div></Card><Card><h3>账户余额</h3><div className="account-balance">{tx.money(me?.balance)}</div><p className="muted">可用余额，金额由 TXBoard 返回</p><button className="secondary wide" onClick={()=>go('orders')}>查看订单</button></Card></div>}
 {profileTab==='安全设置'&&<Card className="form-card"><h3>修改密码</h3><form onSubmit={async e=>{e.preventDefault();if(newPass.length<8||newPass!==repeatPass){setError('请确认新密码至少 8 位且两次一致');return}const result=await act(()=>tx.changePassword(oldPass,newPass),'密码修改成功');if(result!==null){setOldPass('');setNewPass('');setRepeatPass('')}}}><div className="field"><label>当前密码</label><input type="password" required value={oldPass} onChange={e=>setOldPass(e.target.value)}/></div><div className="field"><label>新密码</label><input type="password" minLength="8" required value={newPass} onChange={e=>setNewPass(e.target.value)}/></div><div className="field"><label>确认新密码</label><input type="password" minLength="8" required value={repeatPass} onChange={e=>setRepeatPass(e.target.value)}/></div><button className="primary" disabled={busy}>修改密码</button></form></Card>}
 {profileTab==='邀请管理'&&<Card><h3>邀请管理</h3><div className="finance-summary"><div><span>邀请码</span><strong>{invite?.codes?.length||0}</strong></div><div><span>有效佣金</span><strong>{tx.money(invite?.stat?.[1])}</strong></div><div><span>佣金余额</span><strong>{tx.money(me?.commission_balance)}</strong></div></div><div className="subscription"><span className="live-break">{inviteLink||'尚未生成邀请码'}</span><button disabled={!inviteLink} aria-label="复制邀请链接" onClick={()=>copy(inviteLink)}><Copy size={16}/></button></div><button className="secondary" disabled={busy} onClick={async()=>{const result=await act(tx.createInvite,'邀请码已生成');if(result!==null)await loadSection('profile')}}>生成邀请码</button></Card>}
 {profileTab==='财务记录'&&<Card><h3>财务概览</h3><div className="finance-summary"><div><span>余额</span><strong>{tx.money(me?.balance)}</strong></div><div><span>佣金余额</span><strong>{tx.money(me?.commission_balance)}</strong></div><div><span>订单数量</span><strong>{rows.length}</strong></div></div><button className="secondary" onClick={()=>go('orders')}>查看订单明细</button><button className="secondary" onClick={()=>window.location.assign('/user-spa/#/profile')}>查看完整账户管理</button></Card>}</>}
 {route==='ticket'&&<><div className="live-ticket-header"><Heading en="SUPPORT CENTER" title="服务工单">与客服交流，所有内容均提交至真实 TXBoard 工单接口。</Heading><button className="primary" onClick={()=>setDialog('ticket-create')}><Plus size={18}/> 创建工单</button></div><Card><div className="ticket-toolbar"><h3>我的工单（{ticketRows.length}）</h3><div className="search"><Search size={17}/><input placeholder="搜索工单…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div>{ticketRows.filter(x=>String(x.subject||'').includes(search)).map(t=><button key={t.id} className="live-list-row" onClick={()=>viewTicket(t)}><div><strong>{t.subject}</strong><p className="muted">#{t.id} · {date(t.updated_at)} · {t.status===1?'已关闭':'处理中'}</p></div><ChevronRight size={18}/></button>)}{!ticketRows.length&&<p className="muted">暂无工单</p>}</Card></>}
 {route==='menu'&&<><Heading en="QUICK ACCESS" title="全部菜单">快速访问常用功能。</Heading><div className="menu-grid">{[...NAV.slice(0,4),['orders','我的订单',Receipt],['invite','邀请管理',Gift],['nodes','节点列表',Wifi],['traffic','流量记录',RefreshCcw],['knowledge','帮助中心',Info],['logout','退出登录',LogOut]].map(([key,name,Icon])=><button key={key} className="card menu-item" onClick={()=>key==='logout'?logout():key==='invite'?(setProfileTab('邀请管理'),go('profile')):['nodes','traffic','knowledge'].includes(key)?window.location.assign('/user-spa/#/'+({nodes:'node',traffic:'traffic',knowledge:'knowledge'})[key]):go(key)}><Icon size={24}/><strong>{name}</strong><ChevronRight size={17}/></button>)}</div></>}
 {!NAV.some(x=>x[0]===route)&&route!=='orders'&&<Card><p>页面不存在</p><button className="primary" onClick={()=>go('dashboard')}>返回面板</button></Card>}
 </main><footer>© {new Date().getFullYear()} {title} · Powered by TXBoard {window.settings?.version&&<small>v{window.settings.version}</small>} <span>真实账户数据由服务器提供</span></footer><nav className="mobile-nav" aria-label="移动端导航">{mobileNav.map(([key,name,Icon])=><button key={key} className={route===key?'selected':''} onClick={()=>go(key)}><Icon size={21}/><span>{name}</span></button>)}</nav>
 {toast&&<div className="toast" role="status" aria-live="polite"><CheckCircle2 size={18}/>{toast}</div>}
 {noticeOpen&&<Dialog title={noticeMode==='popup'?'重要通知':'公告中心'} onClose={closeNotice} wide>
  <div className={'live-notice-modal live-notice-style-'+(noticeMode==='popup'?noticeConfig.style:'classic')}>
   {noticeMode==='popup'
    ?<p className="live-notice-intro">请查看这条站点公告。后续可通过右上角通知入口浏览历史公告。</p>
    :<><p className="live-notice-intro">站点公告与通知记录</p><div className="live-notice-tabs"><button type="button" aria-label="筛选全部公告" aria-pressed={noticeFilter==='all'} className={noticeFilter==='all'?'active':''} onClick={()=>switchNoticeFilter('all')}>全部公告 <span>{news.length}</span></button><button type="button" aria-label="筛选未读公告" aria-pressed={noticeFilter==='unread'} className={noticeFilter==='unread'?'active':''} onClick={()=>switchNoticeFilter('unread')}>未读 <span>{unseen.length}</span></button></div></>}
   {visibleNotices.length>0?<div className="live-notice-content-grid">
    {visibleNotices.length>1&&<div className="live-notice-list" aria-label="公告列表">{visibleNotices.map((item,index)=><button type="button" key={noticeVersion(item)||index} className={currentNotice===item?'active':''} aria-pressed={currentNotice===item} onClick={()=>selectNotice(item)}><span>{item.title||'站点公告'}</span><small>{date(item.created_at).split(' ')[0]}{unseen.includes(item)?' · 未读':''}</small></button>)}</div>}
    {currentNotice&&<article className="live-notice-article">
      <div className="live-notice-category"><Bell size={15}/> {noticeMode==='popup'?'重要通知':'站点公告'} {visibleNotices.length>1&&<span>· {selectedPosition+1}/{visibleNotices.length}</span>}</div>
      <h3>{currentNotice.title||'站点公告'}</h3>
      {currentNotice.created_at&&<time>{date(currentNotice.created_at)}</time>}
      {Array.isArray(currentNotice.tags)&&currentNotice.tags.length>0&&<div className="live-notice-tags">{currentNotice.tags.map((tag,i)=><span key={i}>{String(tag)}</span>)}</div>}
      <p className="live-notice-body">{noticePlainText(currentNotice.content)||'暂无详细内容'}</p>
      {tx.safeExternal(currentNotice.img_url)&&<img className="live-notice-image" src={tx.safeExternal(currentNotice.img_url)} loading="lazy" alt="公告配图"/>}
     </article>}
   </div>:<p className="live-notice-empty">{noticeFilter==='unread'?'已查看全部公告':'暂无公告'}</p>}
   <div className="live-notice-footer">
    {noticeMode==='center'&&news.length>0&&unseen.length>0&&<button type="button" className="secondary" onClick={markAllNotices}>全部标为已读</button>}
    <button type="button" className="primary" onClick={closeNotice}>{noticeMode==='popup'?'我知道了':'关闭'}</button>
   </div>
  </div>
 </Dialog>}
 {qr&&<QrDialog title={qr.title} value={qr.value} onClose={()=>setQr(null)}/>}
 {dialog==='purchase'&&plan&&<Dialog title={'购买 '+plan.name} onClose={()=>setDialog(null)} wide>
  <PurchaseForm resetMode={resetMode} plan={plan} period={period} setPeriod={setPeriod} coupon={coupon} setCoupon={setCoupon} discount={discount} setDiscount={setDiscount} busy={busy} formatMoney={tx.money} onVerify={async()=>{
   const result=await act(()=>tx.checkCoupon(coupon.trim(),plan.id,period));
   if(result)setDiscount(result.type===2?String(result.value)+'%':tx.money(result.value));
  }} onSubmit={buy}/>
 </Dialog>}
 {dialog==='order-conflict'&&blockingOrder&&<Dialog title="继续处理已有订单" onClose={()=>setDialog('purchase')} wide>
  <ExistingOrderDialog order={blockingOrder} busy={busy} onContinue={()=>showOrder(blockingOrder.trade_no)}
    onCancel={abandonAndCreate} onDismiss={()=>setDialog('purchase')}/>
 </Dialog>}
 {dialog==='order'&&currentOrder&&<Dialog title="订单详情" onClose={()=>{setDialog(null);void loadSection('orders')}} wide>
  <OrderPaymentBody order={currentOrder} methods={methods} method={method} onMethod={value=>{setMethod(value);setPaymentError('');setPaymentLink('')}}
   paying={paying} busy={busy} watching={watchingOrder} watchExpired={watchExpired} paymentError={paymentError} paymentLink={paymentLink}
   onPay={pay} onCancel={cancelCurrentOrder} onRefresh={refreshOrderStatus} money={tx.money} statusLabel={status}/>
 </Dialog>}
 {dialog==='ticket-create'&&<Dialog title="创建工单" onClose={()=>setDialog(null)}><form onSubmit={createTicket}><div className="field"><label>工单主题</label><input name="title" required maxLength="100"/></div><div className="field"><label>优先级</label><select name="level" defaultValue="1"><option value="0">低</option><option value="1">普通</option><option value="2">高</option></select></div><div className="field"><label>问题描述</label><textarea name="description" minLength="5" maxLength="2000" rows="5" required/></div><button className="primary wide" disabled={busy}>提交工单</button></form></Dialog>}
 {dialog==='ticket-detail'&&ticket&&<Dialog title={ticket.subject} onClose={()=>setDialog(null)} wide><p className="muted">工单 #{ticket.id} · {ticket.status===1?'已关闭':'处理中'}</p><div className="live-thread">{(ticket.message||[]).map(m=><div key={m.id} className={'live-message '+(m.is_me?'mine':'')}><strong>{m.is_me?'我':'客服'}</strong><p>{m.message}</p><small>{date(m.created_at)}</small></div>)}</div>{ticket.status===0&&<form onSubmit={sendReply}><div className="field"><label>回复</label><textarea rows="3" value={reply} required onChange={e=>setReply(e.target.value)}/></div><button className="primary" disabled={busy||!reply.trim()}>发送回复</button><button className="secondary" type="button" disabled={busy} onClick={closeCurrent}>关闭工单</button></form>}</Dialog>}
 </div>
}
