import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG_PERIODS,planPrice,resetPrice,planPeriods,parseFeatured,resolveCatalogConfig,availableCatalogPlans,groupedCatalogPlans,catalogPriceFor,annualSavings,planFeatures,normalizedDescription,catalogCompare} from '../src/live/catalog.js';

// Native GET /plans DTO: prices:[{period,amount_minor}] with native period
// keys (monthly, quarterly, ...) and amounts in minor units (cents).
const prices=entries=>Object.entries(entries).map(([period,amount_minor])=>({period,amount_minor}));
const basic={id:1,name:'Basic',show:true,sell:true,traffic_limit_bytes:100*1073741824,device_limit:3,speed_limit_mbps:100,
 prices:prices({monthly:1000,quarterly:2700,yearly:9000,reset_traffic:200}),renewable:true};
const annualOnly={id:2,name:'Annual',show:true,sell:true,traffic_limit_bytes:200*1073741824,
 prices:prices({yearly:15000}),renewable:true};
const oneTime={id:3,name:'One-time',show:true,sell:true,traffic_limit_bytes:1073741824,
 prices:prices({onetime:3000}),renewable:true};

test('TXBoard plan prices are returned in minor units and reset_traffic is not a subscription period',()=>{
 assert.equal(planPrice(basic,'yearly'),9000);
 assert.equal(planPrice(basic,'monthly'),1000);
 assert.equal(resetPrice(basic),200);
 assert.equal(planPrice(basic,'reset_traffic'),null);
 assert.equal(planPrice({prices:prices({monthly:0})},'monthly'),null);
 assert.equal(planPrice({prices:prices({monthly:null})},'monthly'),null);
 assert.equal(planPrice({prices:prices({monthly:-2})},'monthly'),null);
 assert.equal(planPrice({prices:prices({monthly:'not-money'})},'monthly'),null);
 assert.equal(planPrice({},'monthly'),null);
 assert.deepEqual(planPeriods(basic).map(x=>x.id),['monthly','quarterly','yearly']);
 assert.equal(CATALOG_PERIODS.length,7);
});

test('catalog filters unpriced products and supports one-time and annual-only plans',()=>{
 const all=availableCatalogPlans([basic,annualOnly,oneTime,
  {...basic,id:4,prices:[]},
  {...basic,id:5,prices:prices({monthly:0})},
  {id:6,show:true,sell:true,prices:prices({reset_traffic:100})}]);
 assert.deepEqual(all.map(x=>x.id),[1,2,3]);
 assert.deepEqual(catalogPriceFor(annualOnly,'all'),{period:'yearly',price:15000});
 assert.deepEqual(catalogPriceFor(oneTime,'all'),{period:'onetime',price:3000});
 assert.equal(catalogPriceFor(oneTime,'monthly'),null);
 assert.deepEqual(catalogPriceFor(basic,'yearly'),{period:'yearly',price:9000});
});

test('savings are only displayed for verifiable savings against the same monthly plan',()=>{
 const saving=annualSavings(basic,'yearly');
 assert.deepEqual(saving,{saved:3000,percent:25,months:12,comparison:12000});
 assert.equal(annualSavings(basic,'onetime'),null);
 assert.equal(annualSavings(annualOnly),null);
 assert.equal(annualSavings({...basic,prices:prices({monthly:1000,yearly:12000})}),null);
 assert.equal(annualSavings({...basic,prices:prices({monthly:1000,yearly:12500})}),null);
 assert.equal(annualSavings({...basic,prices:prices({quarterly:2700,yearly:9000})}),null);
});

test('featured plans are explicit operator choices; legacy config is respected',()=>{
 const g={frontend_theme:'vv-theme',theme_config:{shop_default_period:'yearly',shop_featured_ids:'1,3,not-a-number,1',shop_compare_enabled:'0',shop_show_savings:0,shop_show_description:'false'}};
 const config=resolveCatalogConfig(g,{catalog:{featuredIds:'2',defaultPeriod:'monthly'}});
 assert.equal(config.defaultPeriod,'yearly');
 assert.deepEqual([...config.featuredIds],['1','3']);
 assert.equal(config.compareEnabled,false);
 assert.equal(config.showSavings,false);
 assert.equal(config.showDescription,false);
 const legacy=resolveCatalogConfig({frontend_theme:'TXBoard',theme_config:g.theme_config},{catalog:{defaultPeriod:'monthly',featuredIds:'2'}});
 assert.equal(legacy.defaultPeriod,'monthly');
 assert.equal(legacy.featuredIds.has('2'),true);
 assert.equal(resolveCatalogConfig({frontend_theme:'vv-theme',theme_config:{shop_default_period:'javascript:()'}}).defaultPeriod,'all');
 assert.equal(parseFeatured('1,3').has('3'),true);
});

test('features, comparisons and descriptions remain constrained to real plan fields',()=>{
 assert.deepEqual(planFeatures(basic).slice(0,3),[
  {label:'套餐流量',value:'100 GB'},{label:'设备限制',value:'3 台'},{label:'速度上限',value:'100 Mbps'}
 ]);
 const comparison=catalogCompare([basic,annualOnly,oneTime],['2','1'],'yearly');
 assert.equal(comparison.length,2);
 assert.deepEqual(comparison[0].price,{period:'yearly',price:9000});
 assert.equal(comparison[1].traffic,200*1073741824);
 assert.equal(normalizedDescription('<p>高速<br>网络 &amp; 稳定</p>'),'高速 网络 & 稳定');
 assert.equal(normalizedDescription(null),'');
});

test('shop categories separate recurring from one-time prices without treating reset fees as traffic packages',()=>{
 const hybrid={id:8,name:'Hybrid',show:true,sell:true,
  prices:prices({monthly:1200,onetime:3600}),renewable:true};
 const groups=groupedCatalogPlans([basic,annualOnly,oneTime,hybrid,
  {id:9,show:true,sell:true,prices:prices({reset_traffic:400}),renewable:true},
  {id:10,show:true,sell:false,prices:prices({onetime:0}),renewable:true}]);
 assert.deepEqual(groups.recurring.map(entry=>entry.plan.id),[1,2,8]);
 assert.deepEqual(groups.traffic.map(entry=>entry.plan.id),[3,8]);
 assert.deepEqual(groups.recurring.map(entry=>entry.price),[
  {period:'monthly',price:1000},{period:'yearly',price:15000},{period:'monthly',price:1200}
 ]);
 assert.deepEqual(groups.traffic.map(entry=>entry.price),[
  {period:'onetime',price:3000},{period:'onetime',price:3600}
 ]);
 assert.deepEqual(groupedCatalogPlans([{id:11,show:true,sell:true,prices:prices({onetime:0}),renewable:true}]).traffic.length,0);
});
