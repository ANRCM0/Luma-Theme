import test from 'node:test';
import assert from 'node:assert/strict';
import {NAV_DEFINITIONS,DEFAULT_NAV_ITEMS,parseNavItems,serializeNavItems,resolveNavigationConfig,orderedNavigation,mobileNavigation} from '../src/live/navigation-config.js';

test('legacy defaults keep the existing five-tab navigation and hide orders from primary nav',()=>{
 const entries=parseNavItems(DEFAULT_NAV_ITEMS);
 assert.deepEqual(orderedNavigation(entries),['dashboard','shop','profile','ticket','menu']);
 assert.deepEqual(mobileNavigation(entries),['dashboard','shop','profile','ticket','menu']);
 assert.equal(entries.find(x=>x.id==='orders').visible,false);
 assert.equal(NAV_DEFINITIONS.length,6);
});

test('theme config overrides legacy Blade and supports desktop sidebar and collapse',()=>{
 const guest={frontend_theme:'vv-theme',theme_config:{
  layout_mode:'sidebar',sidebar_collapsed_default:'1',
  nav_items:'ticket,!shop,orders,menu,dashboard,!profile'
 }};
 const resolved=resolveNavigationConfig(guest,{navigation:{mode:'top',items:DEFAULT_NAV_ITEMS}});
 assert.equal(resolved.layout,'sidebar');
 assert.equal(resolved.sidebarCollapsed,true);
 assert.deepEqual(orderedNavigation(resolved.items),['ticket','orders','menu','dashboard']);
 assert.deepEqual(mobileNavigation(resolved.items),['ticket','orders','dashboard','menu']);
 const legacy=resolveNavigationConfig({frontend_theme:'TXBoard',theme_config:guest.theme_config},{navigation:{mode:'sidebar',sidebarCollapsed:'0',items:'dashboard,menu,!shop'}});
 assert.equal(legacy.layout,'sidebar');
 assert.equal(legacy.sidebarCollapsed,false);
 assert.deepEqual(orderedNavigation(legacy.items),['dashboard','menu']);
});

test('navigation parser rejects unrecognized and duplicate routes and protects dashboard/menu',()=>{
 const values=parseNavItems('!menu,!dashboard,shop,shop,evil,__proto__,!orders');
 assert.deepEqual(orderedNavigation(values),['menu','dashboard','shop']);
 assert.equal(values.length,6);
 assert.equal(serializeNavItems(values).includes('!menu'),false);
 assert.equal(serializeNavItems(values).includes('!dashboard'),false);
 assert.deepEqual(orderedNavigation(parseNavItems('!, ,unknown')),['dashboard','menu']);
});

test('mobile tabs never exceed five and always end with the menu safety hatch',()=>{
 const items=parseNavItems('orders,profile,ticket,shop,dashboard,menu');
 assert.deepEqual(mobileNavigation(items),['orders','profile','ticket','shop','menu']);
 assert.deepEqual(mobileNavigation(parseNavItems('!orders,!ticket,!profile,dashboard,menu,!shop')),['dashboard','menu']);
});

test('invalid layout values are normalized and hidden flags survive roundtrip',()=>{
 const config=resolveNavigationConfig({frontend_theme:'vv-theme',theme_config:{layout_mode:'script',sidebar_collapsed_default:'0',nav_items:'dashboard,!shop,menu'}});
 assert.equal(config.layout,'top');
 assert.equal(config.sidebarCollapsed,false);
 const serialized=serializeNavItems(config.items);
 assert.deepEqual(parseNavItems(serialized),config.items);
});
