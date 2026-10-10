import test from 'node:test';
import assert from 'node:assert/strict';
import {GIB,DEFAULT_WELCOME_CONFIG,resolveWelcomeConfig,subscriptionMetrics,classifyWelcome,welcomeContent} from '../src/live/welcome-config.js';

const NOW=1770000000000;
const iso=offsetMs=>new Date(NOW+offsetMs).toISOString();
const config=DEFAULT_WELCOME_CONFIG;
// Native GET /me has no created_at, so "new" users are plan-less accounts.
const account={email:'person@example.test',plan_id:1};
const sub=(extra={})=>({plan_id:1,plan:{id:1,name:'基础套餐',traffic_limit_bytes:100*GIB},
 traffic_limit_bytes:100*GIB,upload_bytes:5*GIB,download_bytes:20*GIB,expired_at:iso(30*86400000),...extra});
const status=(user=account,subData=sub(),policy=config)=>classifyWelcome(user,subData,policy,NOW).state;

test('welcome settings use live TXBoard theme_config, fall back to server Blade config',()=>{
 const guest={frontend_theme:'vv-theme',theme_config:{welcome_enabled:'0',welcome_new_hours:'24',welcome_expiry_hours:12,welcome_low_traffic_gb:'5',welcome_low_traffic_percent:'20',welcome_secondary_card:'wallet'}};
 assert.deepEqual(resolveWelcomeConfig(guest,{welcome:{enabled:true}}),{enabled:false,newUserHours:24,expiryHours:12,trafficLowGB:5,trafficLowPercent:20,secondaryCard:'wallet'});
 assert.equal(resolveWelcomeConfig({frontend_theme:'TXBoard',theme_config:guest.theme_config},{welcome:{secondaryCard:'usage'}}).secondaryCard,'usage');
 assert.deepEqual(resolveWelcomeConfig({frontend_theme:'vv-theme',theme_config:{welcome_new_hours:-2,welcome_expiry_hours:'Infinity',welcome_low_traffic_percent:900,welcome_secondary_card:'invalid'}}),{
  ...DEFAULT_WELCOME_CONFIG,newUserHours:0,trafficLowPercent:100
 });
});

test('plan-less accounts are onboarding, since native /me carries no signup date',()=>{
 // GET /me exposes no created_at, so account age cannot be derived. A
 // plan-less account is onboarding while the new-user window is open, and
 // only becomes 'no_plan' when the operator disables that window.
 assert.equal(status({email:'new@example.test',plan_id:0},{plan_id:0}), 'new');
 assert.equal(status({email:'old@example.test',plan_id:0},{plan_id:0}), 'new');
 assert.equal(status({email:'missing@example.test',plan_id:0},{}),'new');
 assert.equal(status({plan_id:1},sub()),'normal');
 assert.equal(status({plan_id:0},{plan_id:0},{...config,newUserHours:0}), 'no_plan');
});

test('expired subscriptions take precedence over exhausted or low traffic',()=>{
 assert.equal(status(account,sub({expired_at:iso(-3*3600000),upload_bytes:100*GIB,download_bytes:10*GIB})),'expired');
 assert.equal(status(account,sub({expired_at:iso(0),upload_bytes:0,download_bytes:0})),'expired');
 assert.equal(status(account,sub({expired_at:iso(3600000),upload_bytes:100*GIB,download_bytes:0})),'exhausted');
});

test('expiration window precedes low traffic but never overrides complete exhaustion',()=>{
 assert.equal(status(account,sub({expired_at:iso(60*3600000),upload_bytes:95*GIB,download_bytes:0})),'expiring');
 assert.equal(status(account,sub({expired_at:iso(96*3600000),upload_bytes:95*GIB,download_bytes:0})),'low_traffic');
 assert.equal(status(account,sub({expired_at:null,upload_bytes:95*GIB,download_bytes:0})),'low_traffic');
 assert.equal(status(account,sub({expired_at:null,upload_bytes:5*GIB,download_bytes:10*GIB})),'normal');
});

test('small quotas use the lesser of GiB and percentage thresholds',()=>{
 const small=sub({plan:{id:1,name:'small',traffic_limit_bytes:5*GIB},traffic_limit_bytes:5*GIB,upload_bytes:3*GIB,download_bytes:0});
 assert.equal(status(account,small),'normal');
 assert.equal(status(account,{...small,upload_bytes:4.6*GIB}),'low_traffic');
 assert.equal(status(account,{...small,upload_bytes:5*GIB}),'exhausted');
 const full=sub({traffic_limit_bytes:100*GIB,plan:{id:1,name:'p',traffic_limit_bytes:100*GIB},upload_bytes:70*GIB,download_bytes:0});
 assert.equal(status(account,full,{...config,trafficLowGB:0}),'normal');
 assert.equal(status(account,full,{...config,trafficLowPercent:0}),'normal');
});

test('unknown quotas and perpetual plans do not trigger fabricated warnings',()=>{
 assert.equal(status(account,{plan_id:1,expired_at:null,traffic_limit_bytes:null,upload_bytes:0,download_bytes:0}), 'normal');
 assert.equal(subscriptionMetrics(account,{plan_id:1,expired_at:null,traffic_limit_bytes:null,upload_bytes:0,download_bytes:0}).remaining,null);
 assert.equal(status(account,sub({expired_at:null,upload_bytes:0,download_bytes:0})),'normal');
});

test('TXBoard reports native byte fields and ISO 8601 timestamps only',()=>{
 const met=subscriptionMetrics(account,sub({traffic_limit_bytes:50*GIB,plan:{id:1,traffic_limit_bytes:100*GIB},upload_bytes:10*GIB,download_bytes:15*GIB}));
 assert.equal(met.total,50*GIB);
 assert.equal(met.used,25*GIB);
 assert.equal(met.remaining,25*GIB);
 assert.equal(met.expiry,NOW+30*86400000);
 // The account DTO carries the same figures nested under traffic.*.
 const fallback=subscriptionMetrics(account,{plan_id:1,traffic_limit_bytes:0,plan:{id:1,traffic_limit_bytes:70*GIB},upload_bytes:0,download_bytes:5*GIB});
 assert.equal(fallback.total,70*GIB);
 // Epoch seconds are not accepted: an ISO string is the only native format.
 assert.equal(subscriptionMetrics(account,{plan_id:1,expired_at:1780000000}).expiry,null);
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
