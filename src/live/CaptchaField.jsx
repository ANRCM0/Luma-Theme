import React,{forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';

const srcFor=(type,key)=>type==='turnstile'?'https://challenges.cloudflare.com/turnstile/v0/api.js':
  'https://www.google.com/recaptcha/api.js?render='+(type==='recaptcha-v3'?encodeURIComponent(key):'explicit');
const provider=(config)=>String(config?.captcha_type||'recaptcha');
const siteKey=(config,type)=>String(type==='turnstile'?config?.turnstile_site_key:type==='recaptcha-v3'?config?.recaptcha_v3_site_key:config?.recaptcha_site_key||'').trim();
const cache=new Map();
function fetchScript(src){
 if(cache.has(src))return cache.get(src);
 const p=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=src;script.async=true;script.onload=()=>resolve();
  script.onerror=()=>{script.remove();reject(Error('验证码服务加载失败'))};
  document.head.appendChild(script);
 }).catch(err=>{cache.delete(src);throw err});
 cache.set(src,p);return p;
}
const CaptchaField=forwardRef(function CaptchaField({config},ref){
 const enabled=Number(config?.is_captcha||0)===1;
 const type=provider(config),key=siteKey(config,type);
 const valid=['turnstile','recaptcha','recaptcha-v3'].includes(type);
 const holder=useRef(null),widget=useRef(null),typeRef=useRef(null);
 const [ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let alive=true;widget.current=null;typeRef.current=null;setReady(false);setError('');
  if(!enabled)return;
  if(!valid||!key){setError('站点验证码配置不完整，请联系管理员');return}
  (async()=>{
   try{
    await fetchScript(srcFor(type,key));
    if(!alive)return;
    if(type==='turnstile'){
     if(!window.turnstile?.render)throw Error('Turnstile 初始化失败');
     widget.current=window.turnstile.render(holder.current,{sitekey:key,theme:'auto'});
    }else if(type==='recaptcha-v3'){
     if(!window.grecaptcha?.ready)throw Error('reCAPTCHA 初始化失败');
     await new Promise(resolve=>window.grecaptcha.ready(resolve));
     if(!alive)return;
    }else{
     if(!window.grecaptcha?.render)throw Error('reCAPTCHA 初始化失败');
     widget.current=window.grecaptcha.render(holder.current,{sitekey:key});
    }
    typeRef.current=type;
    if(alive)setReady(true);
   }catch(e){if(alive)setError(e?.message||'验证码不可用')}
  })();
  return()=>{alive=false;setReady(false);if(type==='turnstile'&&widget.current!==null)window.turnstile?.remove?.(widget.current);if(holder.current)holder.current.textContent='';widget.current=null};
 },[enabled,type,key,valid]);
 useImperativeHandle(ref,()=>({
  async getPayload(){
   if(!enabled)return {};
   if(!ready||error)throw Error(error||'人机验证尚未就绪，请稍后再试');
   if(typeRef.current==='turnstile'){
    const token=window.turnstile?.getResponse(widget.current);
    if(!token)throw Error('请先完成 Cloudflare 人机验证');
    return {turnstile_token:token};
   }
   if(typeRef.current==='recaptcha-v3'){
    try{
     const token=await window.grecaptcha.execute(key,{action:'submit'});
     if(!token)throw Error('验证码为空');
     return {recaptcha_v3_token:token};
    }catch{throw Error('reCAPTCHA 验证失败，请重试')}
   }
   const token=window.grecaptcha?.getResponse(widget.current);
   if(!token)throw Error('请先完成人机验证');
   return {recaptcha_data:token};
  },
  reset(){
   if(typeRef.current==='turnstile')window.turnstile?.reset?.(widget.current);
   if(typeRef.current==='recaptcha')window.grecaptcha?.reset?.(widget.current);
  }
 }),[enabled,ready,error,key]);
 if(!enabled)return null;
 return <div className="live-captcha" aria-label="人机验证">
  {type!=='recaptcha-v3'&&<div ref={holder} className="live-captcha-widget"/>}
  {type==='recaptcha-v3'&&<p className="muted">{ready?'受 reCAPTCHA v3 保护':'正在连接人机验证服务…'}</p>}
  {error&&<p className="live-extra-error" role="alert">{error}</p>}
 </div>;
});
export default CaptchaField;
