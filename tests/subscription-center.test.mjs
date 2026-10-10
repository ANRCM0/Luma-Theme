import test from 'node:test';
import assert from 'node:assert/strict';
import {subscriptionUsage,nextResetLabel,subscriptionState,canAttemptReset,canAttemptRenew,resolveSubscriptionConfig,displayDate} from '../src/live/subscription-center.js';
import {PLATFORMS,detectPlatform,validSubscriptionUrl,allImportClients,clientsFor} from '../src/live/import.js';

const G=1073741824,NOW=1780000000000;
const NOW_ISO=new Date(NOW).toISOString();
const EXPIRY_ISO=new Date(NOW+86400*20*1000).toISOString();
const PAST_ISO=new Date(NOW/1000-1).toISOString();
// Native GET /me: no created_at, bytes under traffic.*, ISO timestamps.
const user={id:12,email:'me@example.test',plan_id:7,traffic:{upload_bytes:20*G,download_bytes:50*G,limit_bytes:120*G}};
// Native GET /me/subscription: plan has no renew/reset_traffic_method.
const sub={plan_id:7,plan:{id:7,name:'Plus',traffic_limit_bytes:120*G},
 traffic_limit_bytes:120*G,upload_bytes:20*G,download_bytes:50*G,
 expired_at:EXPIRY_ISO,reset_day:13};
const url='https://panel.example.test/api/v1/client/subscribe?token=a%2Bbc';

test('usage respects TXBoard native byte fields and falls back to the account traffic object only when needed',()=>{
 assert.deepEqual(subscriptionUsage(sub,user),{
  total:120*G,used:70*G,remaining:50*G,uploaded:20*G,downloaded:50*G,usedPercent:58
 });
 assert.equal(subscriptionUsage({...sub,upload_bytes:120*G,download_bytes:50*G},user).remaining,0);
 assert.equal(subscriptionUsage({traffic_limit_bytes:null,upload_bytes:0,download_bytes:0},{traffic:{limit_bytes:5*G}}).total,5*G);
 assert.equal(subscriptionUsage({},{traffic:{}}).remaining,null);
 assert.equal(subscriptionUsage({traffic_limit_bytes:0},{}).usedPercent,null);
});

test('expired, unlimited and missing subscription conditions are classified without made-up dates',()=>{
 assert.deepEqual(subscriptionState({}, {}, NOW).hasPlan,false);
 assert.equal(subscriptionState(sub,user,NOW).expired,false);
 assert.equal(subscriptionState({...sub,expired_at:PAST_ISO},user,NOW).expired,true);
 assert.equal(subscriptionState({...sub,expired_at:null},user,NOW).expired,false);
 assert.equal(nextResetLabel({reset_day:4}).kind,'days');
 assert.equal(nextResetLabel({next_reset_at:NOW_ISO,reset_day:4}).kind,'timestamp');
 assert.equal(nextResetLabel({reset_day:null}),null);
 assert.equal(displayDate(null),'长期有效');
});

test('reset and renewal shortcuts respect basic client state while backend remains authoritative',()=>{
 // Renewal ability comes from the native /plans renewable flag, not the
 // subscription DTO, so only an explicit false disables the shortcut.
 assert.equal(canAttemptReset(sub,user,NOW),true);
 assert.equal(canAttemptReset({...sub,expired_at:PAST_ISO},user,NOW),false);
 assert.equal(canAttemptReset({...sub,traffic_limit_bytes:0,plan:{...sub.plan,traffic_limit_bytes:null}}, {},NOW),false);
 assert.equal(canAttemptReset({plan_id:0}, {},NOW),false);
 assert.equal(canAttemptRenew(sub,user),true);
 assert.equal(canAttemptRenew({...sub,plan:{renewable:false}},user),false);
});

test('subscription preferences use only current active theme config and validate boolean switches',()=>{
 const guest={frontend_theme:'vv-theme',theme_config:{
  subscription_client_guide:'0',subscription_reset_action:0,subscription_renew_action:'false',subscription_show_next_reset:'1'
 }};
 assert.deepEqual(resolveSubscriptionConfig(guest),{clientGuide:false,resetAction:false,renewalAction:false,showNextReset:true});
 assert.deepEqual(resolveSubscriptionConfig({frontend_theme:'TXBoard',theme_config:guest.theme_config},{subscriptionCenter:{resetAction:'0'}}),{
  clientGuide:true,resetAction:false,renewalAction:true,showNextReset:true
 });
});

test('client deep links validate server URL before embedding credentials and are OS-specific',()=>{
 assert.equal(validSubscriptionUrl('javascript:alert(1)'),null);
 assert.equal(validSubscriptionUrl('data:text/html,hello'),null);
 assert.equal(validSubscriptionUrl('https://user:password@panel.example.test/a'),null);
 assert.equal(validSubscriptionUrl('https://panel.example.test/a'), 'https://panel.example.test/a');
 assert.equal(allImportClients('javascript:bad').length,0);
 assert.deepEqual(PLATFORMS.map(x=>x.id),['windows','mac','ios','android']);
 assert.equal(detectPlatform('iPhone Safari'),'ios');
 assert.equal(detectPlatform('Android Chrome'),'android');
 assert.equal(detectPlatform('Windows NT 10'),'windows');
 assert.equal(detectPlatform('Macintosh OS X'),'mac');
 assert.equal(clientsFor(url,'站点','ios').some(x=>x.name==='Shadowrocket'),true);
 assert.equal(clientsFor(url,'站点','android').some(x=>x.name==='Shadowrocket'),false);
 assert.equal(clientsFor(url,'站点','windows').some(x=>x.name==='Hiddify'),true);
 const link=clientsFor(url,'站点','ios').find(x=>x.name==='Hiddify').href;
 assert.ok(link.startsWith('hiddify://import/'));
 assert.ok(link.includes(encodeURIComponent(url)));
 for(const c of allImportClients(url,'站点'))assert.ok(!c.href.startsWith('javascript:'));
});
