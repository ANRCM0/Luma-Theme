import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ATOMIC_DEFAULTS,atomicPageVisible,resolveAtomicConfig} from '../src/live/atomic-config.js';

const remote=config=>({frontend_theme:'vv-theme',theme_config:config});
test('safe defaults retain current Luma menus, both shop groups and QR',()=>{
 const cfg=resolveAtomicConfig();
 assert.equal(cfg.density,'comfortable');
 assert.equal(cfg.cardRadius,16);
 assert.equal(cfg.showFooter,true);
 assert.equal(cfg.pages.shop,true);
 assert.equal(cfg.pages.invite,true);
 assert.equal(cfg.shop.cycle,true);
 assert.equal(cfg.shop.traffic,true);
 assert.equal(cfg.shop.cycleFeatureLimit,0);
 assert.equal(cfg.shop.showSavings,false);
 assert.equal(cfg.subscription.showQr,true);
 assert.equal(cfg.auth.showOptionalInvite,false);
 assert.equal(atomicPageVisible(cfg,'dashboard'),true);
 assert.equal(atomicPageVisible(cfg,'menu'),true);
});
test('all atomic switches accept 0 and false; bounded values reject unsafe input',()=>{
 const cfg=resolveAtomicConfig(remote({
  ui_density:'compact',ui_card_radius:9999,ui_show_eyebrow:'0',ui_show_footer:'false',
  page_shop_visible:'0',page_nodes_visible:0,page_profile_visible:'false',
  shop_cycle_visible:'0',shop_section_order:'traffic',shop_cycle_feature_limit:200,
  shop_traffic_featured_id:15,shop_year_savings_visible:1,
  subscription_qr_visible:'0',node_rate_visible:'false',traffic_upload_visible:0,
  knowledge_search_visible:'0',auth_optional_invite_visible:'1'
 }));
 assert.equal(cfg.density,'compact');
 assert.equal(cfg.cardRadius,28);
 assert.equal(cfg.showEyebrow,false);
 assert.equal(cfg.showFooter,false);
 assert.equal(atomicPageVisible(cfg,'shop'),false);
 assert.equal(atomicPageVisible(cfg,'nodes'),false);
 assert.equal(atomicPageVisible(cfg,'profile'),false);
 assert.equal(atomicPageVisible(cfg,'dashboard'),true);
 assert.equal(cfg.shop.cycle,false);
 assert.equal(cfg.shop.order,'traffic');
 assert.equal(cfg.shop.cycleFeatureLimit,20);
 assert.equal(cfg.shop.trafficFeaturedId,15);
 assert.equal(cfg.shop.showSavings,true);
 assert.equal(cfg.subscription.showQr,false);
 assert.equal(cfg.nodes.showRate,false);
 assert.equal(cfg.traffic.showUpload,false);
 assert.equal(cfg.knowledge.showSearch,false);
 assert.equal(cfg.auth.showOptionalInvite,true);
 const invalid=resolveAtomicConfig(remote({ui_density:'<script>',ui_card_radius:'Infinity',shop_section_order:'unknown',shop_cycle_featured_id:-4}));
 assert.equal(invalid.density,'comfortable');
 assert.equal(invalid.cardRadius,16);
 assert.equal(invalid.shop.order,'recurring');
 assert.equal(invalid.shop.cycleFeaturedId,0);
});
test('unrelated theme settings cannot override the active Luma theme',()=>{
 const cfg=resolveAtomicConfig({frontend_theme:'other-theme',theme_config:{page_shop_visible:'0',ui_density:'compact'}});
 assert.equal(cfg.pages.shop,true);
 assert.equal(cfg.density,'comfortable');
});
test('older TXBoard Blade fallbacks remain supported, but current remote values take precedence',()=>{
 const legacy={atomic:{ui_density:'compact',page_orders_visible:'0',subscription_link_visible:'0'}};
 assert.equal(resolveAtomicConfig({},legacy).density,'compact');
 assert.equal(resolveAtomicConfig({},legacy).pages.orders,false);
 assert.equal(resolveAtomicConfig({},legacy).subscription.showLink,false);
 assert.equal(resolveAtomicConfig(remote({ui_density:'comfortable'}),legacy).density,'comfortable');
 assert.equal(resolveAtomicConfig(remote({ui_density:'comfortable'}),legacy).pages.orders,true);
});
test('theme manifest registers all atomic controls with supported TXBoard widgets',()=>{
 const build=readFileSync(new URL('../scripts/package-txboard.mjs',import.meta.url),'utf8');
 const keys=[
  'ui_density','ui_card_radius','ui_show_eyebrow','ui_show_footer',
  'page_shop_visible','page_traffic_visible','page_invite_visible',
  'shop_section_order','shop_cycle_visible','shop_traffic_visible',
  'shop_cycle_feature_limit','shop_traffic_feature_limit',
  'subscription_link_visible','subscription_qr_visible','node_rate_visible',
  'traffic_download_visible','knowledge_search_visible','auth_optional_invite_visible'
 ];
 for(const key of keys){
  assert.ok(build.includes(`field_name:${JSON.stringify(key)}`),`missing admin field ${key}`);
  assert.ok(build.includes(`$theme_config[\\"${key}\\"]`),`missing legacy Blade fallback ${key}`);
 }
 assert.equal(ATOMIC_DEFAULTS.pages.shop,true);
});
