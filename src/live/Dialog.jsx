import React,{useEffect,useRef} from 'react';
import {X} from 'lucide-react';

// Retain focus inside the topmost dialog (e.g. an order QR above the order
// dialog), restore focus after closing and lock background scroll.
let openDialogCount=0;
let originalOverflow='';
const focusables='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function Dialog({title,onClose,children,wide=false}){
 const nodeRef=useRef(null),closeRef=useRef(onClose);
 closeRef.current=onClose;
 const isTop=()=> {
  const nodes=document.querySelectorAll('[role="dialog"]');
  return nodes[nodes.length-1]===nodeRef.current;
 };
 useEffect(()=>{
  const before=document.activeElement;
  if(openDialogCount++===0){
   originalOverflow=document.body.style.overflow;
   document.body.style.overflow='hidden';
  }
  const focus=()=>{if(isTop())nodeRef.current?.querySelector('.close')?.focus()};
  focus();
  const keyboard=event=>{
   if(!isTop())return;
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeRef.current();return}
   if(event.key!=='Tab')return;
   const targets=Array.from(nodeRef.current?.querySelectorAll(focusables)||[])
    .filter(item=>item.getClientRects().length>0);
   if(!targets.length){event.preventDefault();nodeRef.current?.focus();return}
   const first=targets[0],last=targets[targets.length-1];
   if(event.shiftKey&&(document.activeElement===first||!nodeRef.current?.contains(document.activeElement))){
    event.preventDefault();last.focus();
   }else if(!event.shiftKey&&(document.activeElement===last||!nodeRef.current?.contains(document.activeElement))){
    event.preventDefault();first.focus();
   }
  };
  const focusGuard=event=>{
   if(isTop()&&nodeRef.current&&!nodeRef.current.contains(event.target)){
    nodeRef.current.querySelector('.close')?.focus();
   }
  };
  document.addEventListener('keydown',keyboard);
  document.addEventListener('focusin',focusGuard);
  return ()=>{
   document.removeEventListener('keydown',keyboard);
   document.removeEventListener('focusin',focusGuard);
   if(--openDialogCount===0)document.body.style.overflow=originalOverflow;
   if(before?.isConnected&&typeof before.focus==='function')before.focus();
  };
 },[]);
 return <div className="overlay" onMouseDown={event=>{
   if(event.target===event.currentTarget&&isTop())closeRef.current();
 }}>
  <section role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={nodeRef}
   className={'dialog '+(wide?'live-dialog-wide':'')}>
   <button type="button" className="close" aria-label="关闭弹窗" onClick={()=>closeRef.current()}><X size={20}/></button>
   <h2>{title}</h2>{children}
  </section>
 </div>;
}
