// TXBoard Theme Package: the active theme owns its public appearance.
import {safeImageUrl} from './browser-safety.js';
// theme_config is served by GET /txapi/public/site-config. Keep the
// Blade-injected settings as a fallback for older TXBoard versions.
const ACCENTS=new Set(['default','blue','darkblue','black']);
export const isObject=value=>value&&typeof value==='object'&&!Array.isArray(value);
// Only trust a theme_config that TXBoard reported as belonging to this theme.
export function liveThemeConfig(guest={}){
 return guest?.frontend_theme==='vv-theme'&&isObject(guest?.theme_config)?guest.theme_config:null;
}

export function safeThemeBackground(value,origin='http://localhost'){
 return safeImageUrl(value,origin)||'';
}

export function resolveThemeAppearance(guest={},settings={},origin='http://localhost'){
 const config=liveThemeConfig(guest)||{
  theme_color:settings?.theme?.color,
  background_url:settings?.background_url
 };
 const requested=String(config.theme_color??'default');
 return {
  color:ACCENTS.has(requested)?requested:'default',
  backgroundUrl:safeThemeBackground(config.background_url,origin)
 };
}
