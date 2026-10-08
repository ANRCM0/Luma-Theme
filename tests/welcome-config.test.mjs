import test from 'node:test';
import assert from 'node:assert/strict';
import {GIB,DEFAULT_WELCOME_CONFIG,resolveWelcomeConfig,subscriptionMetrics,classifyWelcome,welcomeContent} from '../src/live/welcome-config.js';

const NOW=1770000000000;
const now=NOW/1000;
const config=DEFAULT_WELCOME_CONFIG;
const account={email:'person@example.test',created_at:now-90*86400,plan_id:1};
const sub=(extra={})=>({plan_id:1,plan:{id:1,name:'基础套餐',transfer_enable:100},transfer_enable:100*GIB,u:5*GIB,d:20*GIB,expired_at:now+30*86400,...extra});
const status=(user=account,subData=sub(),policy=config)=>classifyWelcome(user,subData,policy,NOW).state;

test('welcome settings use live TXBoard theme_config, fall back to server Blade config',()=>{
 const guest={frontend_theme:'vv-theme',theme_config:{welcome_enabled:'0',welcome_new_hours:'24',welcome_expiry_hours:12,welcome_low_traffic_gb:'5',welcome_low_traffic_percent:'20',welcome_secondary_card:'wallet'}};
 assert.deepEqual(resolveWelcomeConfig(guest,{welcome:{enabled:true}}),{enabled:false,newUserHours:24,expiryHours:12,trafficLowGB:5,trafficLowPercent:20,secondaryCard:'wallet'});
 assert.equal(resolveWelcomeConfig({frontend_theme:'TXBoard',theme_config:guest.theme_config},{welcome:{secondaryCard:'usage'}}).secondaryCard,'usage');
 assert.deepEqual(resolveWelcomeConfig({frontend_theme:'vv-theme',theme_config:{welcome_new_hours:-2,welcome_expiry_hours:'Infinity',welcome_low_traffic_percent:900,welcome_secondary_card:'invalid'}}),{
  ...DEFAULT_WELCOME_CONFIG,newUserHours:0,trafficLowPercent:100
 });
});

test('registered users without a subscription become new or not-subscribed',()=>{
 assert.equal(status({email:'new@example.test',created_at:now-3600,plan_id:0},{plan_id:0}), 'new');
 assert.equal(status({email:'old@example.test',created_at:now-30*86400,plan_id:0},{plan_id:0}), 'no_plan');
 assert.equal(status({email:'missing@example.test',plan_id:0},{}),'no_plan');
 assert.equal(status({created_at:now-3600,plan_id:1},sub()),'normal');
 assert.equal(status({created_at:now-3600,plan_id:0},{plan_id:0},{...config,newUserHours:0}), 'no_plan');
});

test('expired subscriptions take precedence over exhausted or low traffic',()=>{
 assert.equal(status(account,sub({expired_at:now-3*3600,u:100*GIB,d:10*GIB})),'expired');
 assert.equal(status(account,sub({expired_at:now,u:0,d:0})),'expired');
 assert.equal(status(account,sub({expired_at:now+3600,u:100*GIB,d:0})),'exhausted');
});

test('expiration window precedes low traffic but never overrides complete exhaustion',()=>{
 assert.equal(status(account,sub({expired_at:now+60*3600,u:95*GIB,d:0})),'expiring');
 assert.equal(status(account,sub({expired_at:now+96*3600,u:95*GIB,d:0})),'low_traffic');
 assert.equal(status(account,sub({expired_at:0,u:95*GIB,d:0})),'low_traffic');
 assert.equal(status(account,sub({expired_at:0,u:5*GIB,d:10*GIB})),'normal');
});

test('small quotas use the lesser of GiB and percentage thresholds',()=>{
 const small=sub({plan:{id:1,name:'small',transfer_enable:5},transfer_enable:5*GIB,u:3*GIB,d:0});
 assert.equal(status(account,small),'normal');
 assert.equal(status(account,{...small,u:4.6*GIB}),'low_traffic');
 assert.equal(status(account,{...small,u:5*GIB}),'exhausted');
 assert.equal(status(account,sub({u:70*GIB,d:0,transfer_enable:100*GIB}),{...config,trafficLowGB:0}),'normal');
 assert.equal(status(account,sub({u:70*GIB,d:0,transfer_enable:100*GIB}),{...config,trafficLowPercent:0}),'normal');
});

test('unknown quotas and perpetual plans do not trigger fabricated warnings',()=>{
 assert.equal(status(account,{plan_id:1,expired_at:0,transfer_enable:null,u:0,d:0}), 'normal');
 assert.equal(subscriptionMetrics(account,{plan_id:1,expired_at:0,transfer_enable:null,u:0,d:0}).remaining,null);
 assert.equal(status(account,sub({expired_at:null,u:0,d:0})),'normal');
});

test('TXBoard uses bytes in subscribe and GiB in plan; timestamps can be seconds or milliseconds',()=>{
 const met=subscriptionMetrics(account,sub({transfer_enable:50*GIB,plan:{transfer_enable:100},u:10*GIB,d:15*GIB}));
 assert.equal(met.total,50*GIB);
 assert.equal(met.used,25*GIB);
 assert.equal(met.remaining,25*GIB);
 const fallback=subscriptionMetrics(account,sub({transfer_enable:0,plan:{id:1,transfer_enable:70},u:0,d:5*GIB}));
 assert.equal(fallback.total,70*GIB);
 assert.equal(subscriptionMetrics({created_at:NOW},sub({expired_at:NOW+24*3600000})).expiry,(NOW+24*3600000)/1000);
});

test('state messages and their actions are consistent, including the generic-off fallback',()=>{
 for(const state of ['new','no_plan','expired','exhausted','expiring','low_traffic','normal']){
  const entry=welcomeContent(state);
  assert.ok(entry.heading.length>0);
  assert.equal(entry.action,'shop');
  assert.ok(['normal','welcome','warning','attention'].includes(entry.tone));
 }
 assert.equal(welcomeContent('expired',false).eyebrow,'WELCOME BACK');
 assert.equal(welcomeContent('nonsense').eyebrow,'WELCOME BACK');
});
