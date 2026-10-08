// Lightweight magnetic hover: no React rerenders or global pointer tracking.
export function attachMagnetic(root=document){
  const media=window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const items=[...root.querySelectorAll('.top .desktop-nav button,.top .head-actions>button')];
  if(!media.matches||reduced.matches)return ()=>{};
  const cleanups=items.map(el=>{
    const move=e=>{
      const rect=el.getBoundingClientRect();
      const x=(e.clientX-rect.left-rect.width/2)/rect.width;
      const y=(e.clientY-rect.top-rect.height/2)/rect.height;
      el.style.setProperty('--magnetic-x',Math.max(-1,Math.min(1,x))*5+'px');
      el.style.setProperty('--magnetic-y',Math.max(-1,Math.min(1,y))*4+'px');
    };
    const reset=()=>{el.style.removeProperty('--magnetic-x');el.style.removeProperty('--magnetic-y')};
    el.addEventListener('pointermove',move,{passive:true});
    el.addEventListener('pointerleave',reset);
    el.addEventListener('blur',reset);
    return ()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',reset);el.removeEventListener('blur',reset);reset()};
  });
  return ()=>cleanups.forEach(fn=>fn());
}
