import test from 'node:test';
import assert from 'node:assert/strict';
import {subscriptionUsage,epochTime,nextResetLabel,subscriptionState,canAttemptReset,canAttemptRenew,resolveSubscriptionConfig,displayDate} from '../src/live/subscription-center.js';
import {PLATFORMS,detectPlatform,validSubscriptionUrl,allImportClients,clientsFor} from '../src/live/import.js';

const G=1073741824,NOW=1780000000000;
const user={id:12,email:'me@example.test',plan_id:7,transfer_enable:120*G};
const sub={plan_id:7,plan:{id:7,name:'Plus',renew:true,reset_traffic_method:1,transfer_enable:120},
 transfer_enable:120*G,u:20*G,d:50*G,expired_at:NOW/1000+86400*20,reset_day:13};
const url='https://panel.example.test/api/v1/client/subscribe?token=a%2Bbc';

test('usage respects TXBoard byte fields and falls back to plan GiB only when needed',()=>{
 assert.deepEqual(subscriptionUsage(sub,user),{
  total:120*G,used:70*G,remaining:50*G,uploaded:20*G,downloaded:50*G,usedPercent:58
 });
 assert.equal(subscriptionUsage({...sub,u:120*G,d:50*G},user).remaining,0);
 assert.equal(subscriptionUsage({transfer_enable:null,u:0,d:0,plan:{transfer_enable:5}},{}).total,5*G);
 assert.equal(subscriptionUsage({plan:{}},{}).remaining,null);
 assert.equal(subscriptionUsage({transfer_enable:0},{}).usedPercent,null);
});

test('expired, unlimited and missing subscription conditions are classified without made-up dates',()=>{
 assert.deepEqual(subscriptionState({}, {}, NOW).hasPlan,false);
 assert.equal(subscriptionState(sub,user,NOW).expired,false);
 assert.equal(subscriptionState({...sub,expired_at:NOW/1000-1},user,NOW).expired,true);
 assert.equal(epochTime(null),null);
 assert.equal(epochTime(0),null);
 assert.equal(epochTime(NOW),NOW);
 assert.equal(epochTime(NOW/1000),NOW);
 assert.equal(nextResetLabel({reset_day:4}).kind,'days');
 assert.equal(nextResetLabel({next_reset_at:NOW/1000,reset_day:4}).kind,'timestamp');
 assert.equal(nextResetLabel({reset_day:null}),null);
 assert.equal(displayDate(null),'长期有效');
});

test('reset and renewal shortcuts respect basic client state while backend remains authoritative',()=>{
 assert.equal(canAttemptReset(sub,user,NOW),true);
 assert.equal(canAttemptReset({...sub,plan:{...sub.plan,reset_traffic_method:2}},user,NOW),false);
 assert.equal(canAttemptReset({...sub,expired_at:NOW/1000-1},user,NOW),false);
 assert.equal(canAttemptReset({...sub,transfer_enable:0,plan:{reset_traffic_method:1,transfer_enable:null}}, {},NOW),false);
 assert.equal(canAttemptReset({plan_id:0}, {},NOW),false);
 assert.equal(canAttemptRenew(sub,user),true);
 assert.equal(canAttemptRenew({...sub,plan:{renew:false}},user),false);
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
