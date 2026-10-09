// Fine-grained PRESENTATION settings for Luma. All flags are opt-in overrides
// on the existing TXBoard theme_config mechanism, never API permissions.
// Defaults intentionally preserve the current simplified Luma experience.
const isObject=value=>value&&typeof value==='object'&&!Array.isArray(value);
const bool=(raw,fallback)=>raw==null||raw===''?fallback:!([false,0,'0','false','off'].includes(raw));
const integer=(raw,fallback,min,max)=>{
 if(raw==null||raw==='')return fallback;
 const n=Number(raw);
 return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback;
};
const choice=(raw,allowed,fallback)=>allowed.includes(String(raw))?String(raw):fallback;
export const ATOMIC_DEFAULTS=Object.freeze({
 density:'comfortable',cardRadius:16,showEyebrow:true,showPageDescription:true,
 showFooter:true,showNavIcons:true,showThemeToggle:true,showHeaderLogout:true,
 welcomeDescription:true,welcomeDecoration:true,showDashboardSubscription:true,
 pages:Object.freeze({shop:true,profile:true,ticket:true,orders:true,nodes:true,traffic:true,knowledge:true,invite:true,gift:true}),
 shop:Object.freeze({
  order:'recurring',cycle:true,traffic:true,showGroupDescription:true,
  cycleFeaturedId:0,trafficFeaturedId:0,cycleFeatureLimit:0,trafficFeatureLimit:0,
  showTags:true,showFeatures:true,showSavings:false,showEmptySections:true
 }),
 subscription:Object.freeze({showLink:true,showQr:true,showCaution:true}),
 nodes:Object.freeze({showRate:true,showTags:true}),
 traffic:Object.freeze({showRate:true,showUpload:true,showDownload:true}),
 knowledge:Object.freeze({showSearch:true,showCategories:true}),
 auth:Object.freeze({showOptionalInvite:false})
});
export function resolveAtomicConfig(guest={},settings={}){
 const remote=guest?.frontend_theme==='vv-theme'&&isObject(guest?.theme_config)?guest.theme_config:null;
 const legacy=isObject(settings?.atomic)?settings.atomic:{};
 const pick=(key,oldKey)=>remote?remote[key]:legacy[oldKey||key];
 const flag=(key,defaultValue,oldKey)=>bool(pick(key,oldKey),defaultValue);
 const visibility={};
 for(const page of Object.keys(ATOMIC_DEFAULTS.pages)){
  visibility[page]=flag('page_'+page+'_visible',true,'page_'+page+'_visible');
 }
 return {
  density:choice(pick('ui_density'),['comfortable','compact'],'comfortable'),
  cardRadius:integer(pick('ui_card_radius'),16,8,28),
  showEyebrow:flag('ui_show_eyebrow',true),
  showPageDescription:flag('ui_show_page_description',true),
  showFooter:flag('ui_show_footer',true),
  showNavIcons:flag('ui_show_nav_icons',true),
  showThemeToggle:flag('ui_show_theme_toggle',true),
  showHeaderLogout:flag('ui_show_header_logout',true),
  welcomeDescription:flag('ui_welcome_description',true),
  welcomeDecoration:flag('ui_welcome_decoration',true),
  showDashboardSubscription:flag('ui_dashboard_subscription',true),
  pages:visibility,
  shop:{
   order:choice(pick('shop_section_order'),['recurring','traffic'],'recurring'),
   cycle:flag('shop_cycle_visible',true),traffic:flag('shop_traffic_visible',true),
   showGroupDescription:flag('shop_group_description',true),
   cycleFeaturedId:integer(pick('shop_cycle_featured_id'),0,0,999999999),
   trafficFeaturedId:integer(pick('shop_traffic_featured_id'),0,0,999999999),
   cycleFeatureLimit:integer(pick('shop_cycle_feature_limit'),0,0,20),
   trafficFeatureLimit:integer(pick('shop_traffic_feature_limit'),0,0,20),
   showTags:flag('shop_tags_visible',true),
   showFeatures:flag('shop_features_visible',true),
   showSavings:flag('shop_year_savings_visible',false),
   showEmptySections:flag('shop_empty_sections_visible',true)
  },
  subscription:{
   showLink:flag('subscription_link_visible',true),
   showQr:flag('subscription_qr_visible',true),
   showCaution:flag('subscription_caution_visible',true)
  },
  nodes:{showRate:flag('node_rate_visible',true),showTags:flag('node_tags_visible',true)},
  traffic:{
   showRate:flag('traffic_rate_visible',true),showUpload:flag('traffic_upload_visible',true),showDownload:flag('traffic_download_visible',true)
  },
  knowledge:{showSearch:flag('knowledge_search_visible',true),showCategories:flag('knowledge_categories_visible',true)},
  auth:{showOptionalInvite:flag('auth_optional_invite_visible',false)}
 };
}
// Navigation may hide an entry, but authenticated API permissions remain server-owned.
export function atomicPageVisible(config,page){
 return page==='dashboard'||page==='menu'||config?.pages?.[page]!==false;
}
export function atomicVisibleRoutes(config){
 return Object.keys(ATOMIC_DEFAULTS.pages).filter(page=>atomicPageVisible(config,page));
}
