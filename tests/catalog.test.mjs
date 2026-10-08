import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG_PERIODS,planPrice,planPeriods,parseFeatured,resolveCatalogConfig,availableCatalogPlans,groupedCatalogPlans,catalogPriceFor,annualSavings,planFeatures,normalizedDescription,catalogCompare} from '../src/live/catalog.js';

const basic={id:1,name:'Basic',show:true,sell:true,transfer_enable:100,device_limit:3,speed_limit:100,month_price:1000,quarter_price:2700,year_price:9000,reset_price:200};
const annualOnly={id:2,name:'Annual',show:true,sell:true,transfer_enable:200,year_price:15000};
const oneTime={id:3,name:'One-time',show:true,sell:true,onetime_price:3000};
test('TXBoard plan prices are returned in cents and do not include reset as a new subscription period',()=>{
 assert.equal(planPrice(basic,'year_price'),9000);
 assert.equal(planPrice(basic,'reset_price'),null);
 assert.equal(planPrice({month_price:0},'month_price'),0);
 assert.equal(planPrice({month_price:null},'month_price'),null);
 assert.equal(planPrice({month_price:-2},'month_price'),null);
 assert.equal(planPrice({month_price:'not-money'},'month_price'),null);
 assert.deepEqual(planPeriods(basic).map(x=>x.id),['month_price','quarter_price','year_price']);
 assert.equal(CATALOG_PERIODS.length,7);
});
test('catalog filters non-sellable hidden products and supports one-time and annual-only plans',()=>{
 const all=availableCatalogPlans([basic,annualOnly,oneTime,{...basic,id:4,show:false},{...basic,id:5,sell:false},{id:6,show:true,sell:true,reset_price:100}]);
 assert.deepEqual(all.map(x=>x.id),[1,2,3]);
 assert.deepEqual(catalogPriceFor(annualOnly,'all'),{period:'year_price',price:15000});
 assert.deepEqual(catalogPriceFor(oneTime,'all'),{period:'onetime_price',price:3000});
 assert.equal(catalogPriceFor(oneTime,'month_price'),null);
 assert.deepEqual(catalogPriceFor(basic,'year_price'),{period:'year_price',price:9000});
});
test('savings are only displayed for verifiable savings against the same monthly plan',()=>{
 const saving=annualSavings(basic,'year_price');
 assert.deepEqual(saving,{saved:3000,percent:25,months:12,comparison:12000});
 assert.equal(annualSavings(basic,'onetime_price'),null);
 assert.equal(annualSavings(annualOnly),null);
 assert.equal(annualSavings({...basic,year_price:12000}),null);
 assert.equal(annualSavings({...basic,year_price:12500}),null);
 assert.equal(annualSavings({...basic,month_price:0}),null);
});
test('featured plans are explicit operator choices; legacy config is respected',()=>{
 const g={frontend_theme:'vv-theme',theme_config:{shop_default_period:'year_price',shop_featured_ids:'1,3,not-a-number,1',shop_compare_enabled:'0',shop_show_savings:0,shop_show_description:'false'}};
 const config=resolveCatalogConfig(g,{catalog:{featuredIds:'2',defaultPeriod:'month_price'}});
 assert.equal(config.defaultPeriod,'year_price');
 assert.deepEqual([...config.featuredIds],['1','3']);
 assert.equal(config.compareEnabled,false);
 assert.equal(config.showSavings,false);
 assert.equal(config.showDescription,false);
 const legacy=resolveCatalogConfig({frontend_theme:'TXBoard',theme_config:g.theme_config},{catalog:{defaultPeriod:'month_price',featuredIds:'2'}});
 assert.equal(legacy.defaultPeriod,'month_price');
 assert.equal(legacy.featuredIds.has('2'),true);
 assert.equal(resolveCatalogConfig({frontend_theme:'vv-theme',theme_config:{shop_default_period:'javascript:()'}}).defaultPeriod,'all');
 assert.equal(parseFeatured('1,3').has('3'),true);
});
test('features, comparisons and descriptions remain constrained to real plan fields',()=>{
 assert.deepEqual(planFeatures(basic).slice(0,3),[
  {label:'套餐流量',value:'100 GB'},{label:'设备限制',value:'3 台'},{label:'速度上限',value:'100 Mbps'}
 ]);
 const comparison=catalogCompare([basic,annualOnly,oneTime],['2','1'],'year_price');
 assert.equal(comparison.length,2);
 assert.deepEqual(comparison[0].price,{period:'year_price',price:9000});
 assert.equal(comparison[1].traffic,200);
 assert.equal(normalizedDescription('<p>高速<br>网络 &amp; 稳定</p>'),'高速 网络 & 稳定');
 assert.equal(normalizedDescription(null),'');
});

test('shop categories separate recurring from one-time prices without treating reset fees as traffic packages',()=>{
 const hybrid={id:8,name:'Hybrid',show:true,sell:true,month_price:1200,onetime_price:3600};
 const groups=groupedCatalogPlans([basic,annualOnly,oneTime,hybrid,{id:9,show:true,sell:true,reset_price:400},{id:10,show:true,sell:false,onetime_price:0}]);
 assert.deepEqual(groups.recurring.map(entry=>entry.plan.id),[1,2,8]);
 assert.deepEqual(groups.traffic.map(entry=>entry.plan.id),[3,8]);
 assert.deepEqual(groups.recurring.map(entry=>entry.price),[
  {period:'month_price',price:1000},{period:'year_price',price:15000},{period:'month_price',price:1200}
 ]);
 assert.deepEqual(groups.traffic.map(entry=>entry.price),[
  {period:'onetime_price',price:3000},{period:'onetime_price',price:3600}
 ]);
 assert.deepEqual(groupedCatalogPlans([{id:11,show:true,sell:true,onetime_price:0}]).traffic[0].price,{period:'onetime_price',price:0});
});
