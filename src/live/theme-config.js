// TXBoard Theme Package v1: the active theme owns its public appearance.
// Keep the Blade-injected settings as a fallback for older TXBoard versions.
const ACCENTS=new Set(['default','blue','darkblue','black']);

export function safeThemeBackground(value,origin='http://localhost'){
 if(typeof value!=='string'||!value.trim())return '';
 try {
  const url=new URL(value.trim(),origin);
  return (url.protocol==='http:'||url.protocol==='https:')?url.href:'';
 } catch {return ''}
}

export function resolveThemeAppearance(guest={},settings={},origin='http://localhost'){
 const live=guest?.frontend_theme==='vv-theme'&&
  guest?.theme_config&&typeof guest.theme_config==='object'&&!Array.isArray(guest.theme_config)
  ?guest.theme_config:null;
 const config=live||{
  theme_color:settings?.theme?.color,
  background_url:settings?.background_url
 };
 const requested=String(config.theme_color??'default');
 return {
  color:ACCENTS.has(requested)?requested:'default',
  backgroundUrl:safeThemeBackground(config.background_url,origin)
 };
}
