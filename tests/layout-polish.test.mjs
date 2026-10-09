import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groupedCatalogPlans} from '../src/live/catalog.js';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('shop remains title-free, centered, and renames traffic packs as pay-as-you-go',()=>{
 const app=source('src/live/LiveApp.jsx');
 const shop=source('src/live/ShopCatalog.jsx');
 const css=source('src/live/live.css');
 assert.match(app,/route==='shop'&&atomicPageVisible\(atomicConfig,'shop'\)&&<ShopCatalog/);
 assert.doesNotMatch(app,/route==='shop'[^\n]*<Heading/);
 assert.match(shop,/id:'traffic',title:'按量付费'/);
 assert.match(css,/\.live-portal \.live-shop-category-title\{justify-content:center\}/);
 assert.match(css,/\.live-portal \.live-shop-grid\s*\{[\s\S]*?justify-content:center/);
});

test('onetime category only shows when sellable onetime offers exist',()=>{
 const grouped=groupedCatalogPlans([{id:1,show:true,sell:true,month_price:1000},{id:2,show:false,sell:true,onetime_price:500}]);
 assert.equal(grouped.recurring.length,1);
 assert.equal(grouped.traffic.length,0);
 const shop=source('src/live/ShopCatalog.jsx');
 assert.match(shop,/grouped\[section\.id\]\.length>0\|\|\(section\.id==='recurring'/);
});

test('dashboard drops redundant subscription heading and uses compact header rhythm',()=>{
 const app=source('src/live/LiveApp.jsx');
 const css=source('src/live/live.css');
 assert.doesNotMatch(app,/live-subscription-section-head/);
 assert.match(css,/height:56px/);
 assert.match(css,/\.dashboard-grid\+\.live-subscription-center\{margin-top:10px\}/);
});
