import React,{forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import * as tx from './api.js';

// Use Stripe's official hosted JS: card data never touches our server or React.
let stripePromise;
function loadStripeScript(){
 if(typeof window.Stripe==='function')return Promise.resolve();
 if(!stripePromise){
  stripePromise=new Promise((resolve,reject)=>{
   const existing=document.querySelector('script[data-luma-stripe]');
   const script=existing||document.createElement('script');
   if(!existing){script.src='https://js.stripe.com/v3/';script.async=true;script.dataset.lumaStripe='true';document.head.appendChild(script)}
   script.addEventListener('load',()=>typeof window.Stripe==='function'?resolve():reject(Error('Stripe.js 未能加载')));
   script.addEventListener('error',()=>reject(Error('Stripe.js 加载失败，请检查网络连接')));
  }).catch(err=>{stripePromise=null;throw err});
 }
 return stripePromise;
}
const StripeCard=forwardRef(function StripeCard({paymentId},ref){
 const mountRef=useRef(null),stripe=useRef(null),card=useRef(null);
 const [ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let alive=true,element=null;
  setReady(false);setError('');
  (async()=>{
   try{
    const publicKey=await tx.stripePublicKey(Number(paymentId));
    if(!alive)return;
    if(typeof publicKey!=='string'||!/^pk_(?:live|test)_/.test(publicKey))throw Error('Stripe 公钥无效');
    await loadStripeScript();
    if(!alive)return;
    const instance=window.Stripe(publicKey);
    if(!instance)throw Error('Stripe 初始化失败');
    stripe.current=instance;
    element=instance.elements().create('card',{hidePostalCode:true,style:{base:{color:document.documentElement.dataset.theme==='dark'?'#e9f6f8':'#21313c'}}});
    card.current=element;
    element.mount(mountRef.current);
    element.on('ready',()=>{if(alive)setReady(true)});
    element.on('change',event=>{if(alive)setError(event.error?.message||'')});
   }catch(e){if(alive)setError(e?.message||'信用卡表单加载失败')}
  })();
  return()=>{alive=false;setReady(false);element?.destroy();card.current=null;stripe.current=null};
 },[paymentId]);
 useImperativeHandle(ref,()=>({
  async createToken(){
   if(!ready||!stripe.current||!card.current)throw Error(error||'信用卡表单尚未就绪');
   const result=await stripe.current.createToken(card.current);
   if(result.error||!result.token?.id)throw Error(result.error?.message||'支付令牌创建失败');
   return result.token.id;
  }
 }),[ready,error]);
 return <div className="live-stripe-card" aria-label="信用卡安全支付">
  <div ref={mountRef} className="live-stripe-element"/>
  {error&&<p role="alert" className="live-extra-error">{error}</p>}
  {!ready&&!error&&<p className="muted">正在安全加载信用卡表单…</p>}
 </div>;
});
export default StripeCard;
