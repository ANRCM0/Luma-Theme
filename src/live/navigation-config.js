// vv-theme presentation-only navigation, backed by TXBoard theme package fields.
// Hiding a navigation item never changes TXBoard permissions or API access.
import {liveThemeConfig} from './theme-config.js';
export const NAV_DEFINITIONS=Object.freeze([
 {id:'dashboard',label:'我的面板'},
 {id:'shop',label:'购买套餐'},
 {id:'profile',label:'账号设置'},
 {id:'ticket',label:'服务工单'},
 {id:'menu',label:'全部菜单'},
 {id:'orders',label:'我的订单'}
]);
export const DEFAULT_NAV_ITEMS='dashboard,shop,profile,ticket,menu,!orders';
const MANDATORY=new Set(['dashboard','menu']);
const KNOWN=new Set(NAV_DEFINITIONS.map(x=>x.id));

export function parseNavItems(raw=DEFAULT_NAV_ITEMS){
 const value=typeof raw==='string'&&raw.trim()?raw:DEFAULT_NAV_ITEMS;
 const parts=value.split(',');
 const result=[],seen=new Set();
 for(const item of parts){
  const token=item.trim(),hidden=token.startsWith('!');
  const id=hidden?token.slice(1):token;
  if(!KNOWN.has(id)||seen.has(id))continue;
  seen.add(id);
  result.push({id,visible:MANDATORY.has(id)||!hidden});
 }
 for(const {id} of NAV_DEFINITIONS){
  if(!seen.has(id))result.push({id,visible:MANDATORY.has(id)});
 }
 return result;
}

export function serializeNavItems(items){
 const seen=new Set();
 const values=[];
 for(const item of Array.isArray(items)?items:[]){
  const id=String(item?.id||'');
  if(!KNOWN.has(id)||seen.has(id))continue;
  seen.add(id);
  values.push((MANDATORY.has(id)||item.visible?'':'!')+id);
 }
 for(const {id} of NAV_DEFINITIONS){
  if(!seen.has(id))values.push((MANDATORY.has(id)?'':'!')+id);
 }
 return values.join(',');
}

const flag=(raw,fallback=false)=>raw==null?fallback:!(raw===false||raw===0||raw==='0'||raw==='false');
export function resolveNavigationConfig(guest={},settings={}){
 const values=liveThemeConfig(guest)||settings?.navigation||{};
 const requested=String(values.layout_mode??values.mode??'top');
 return {
  layout:requested==='sidebar'?'sidebar':'top',
  sidebarCollapsed:flag(values.sidebar_collapsed_default??values.sidebarCollapsed,false),
  items:parseNavItems(values.nav_items??values.items??DEFAULT_NAV_ITEMS)
 };
}

export function orderedNavigation(items){
 return (Array.isArray(items)?items:[]).filter(item=>item.visible).map(item=>item.id);
}
export function mobileNavigation(items,max=5){
 const visible=orderedNavigation(items);
 // A menu escape hatch always remains visible even with a long custom order.
 const prioritized=visible.filter(id=>id!=='menu').slice(0,Math.max(0,max-1));
 return [...prioritized,'menu'];
}
