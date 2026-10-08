import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {markNoticesSeen} from '../src/live/notice.js';
import {DEFAULT_NOTICE_CONFIG,resolveNoticeConfig,matchesPopupTag,automaticNotices,recordAutoNotice} from '../src/live/notice-policy.js';

const store=()=>({map:new Map(),getItem(key){return this.map.get(key)??null},setItem(key,value){this.map.set(key,String(value))}});
const account={id:42,email:'user@example.test'};
const announcements=[
 {id:10,title:'维护',tags:['important','service'],created_at:100,updated_at:100},
 {id:9,title:'活动',tags:['promotion'],created_at:90,updated_at:90},
 {id:8,title:'普通',tags:[],created_at:80}
];

test('theme config overrides Blade, supports all switches and validates enum values',()=>{
 const config=resolveNoticeConfig({
  frontend_theme:'vv-theme',
  theme_config:{
   notice_popup_enabled:'0',notice_center_enabled:0,notice_popup_tag:'IMPORTANT, PROMOTION',
   notice_popup_frequency:'daily',notice_popup_scope:'dashboard',notice_popup_style:'feature'
  }
 },{notice:{popupEnabled:true,frequency:'once'}});
 assert.deepEqual(config,{popupEnabled:false,centerEnabled:false,tag:'important, promotion',frequency:'daily',scope:'dashboard',style:'feature'});
 assert.deepEqual(resolveNoticeConfig({frontend_theme:'TXBoard',theme_config:{notice_popup_enabled:'0'}},{notice:{popupEnabled:'1',style:'compact'}}),{
  ...DEFAULT_NOTICE_CONFIG,style:'compact'
 });
 assert.deepEqual(resolveNoticeConfig({frontend_theme:'vv-theme',theme_config:{
  notice_popup_frequency:'never',notice_popup_scope:'url()',notice_popup_style:'strange'
 }}),DEFAULT_NOTICE_CONFIG);
});

test('tag matching is exact and case-insensitive, with comma-separated alternatives',()=>{
 assert.equal(matchesPopupTag(announcements[0],''),true);
 assert.equal(matchesPopupTag(announcements[0],'IMportant'),true);
 assert.equal(matchesPopupTag(announcements[1],'important, promotion'),true);
 assert.equal(matchesPopupTag(announcements[1],'promo'),false);
 assert.equal(matchesPopupTag(announcements[2],'important'),false);
 assert.equal(matchesPopupTag({tags:'important'},'important'),false);
 assert.deepEqual(automaticNotices([{...announcements[0],popup:0}],DEFAULT_NOTICE_CONFIG,account,store(),store()),[]);
 assert.equal(automaticNotices([{...announcements[0],popup:1}],DEFAULT_NOTICE_CONFIG,account,store(),store()).length,1);
});

test('once per version respects read history; disabled popup suppresses all auto prompts',()=>{
 const local=store(),session=store(),config={...DEFAULT_NOTICE_CONFIG,tag:'important'};
 assert.deepEqual(automaticNotices(announcements,config,account,local,session),[announcements[0]]);
 markNoticesSeen([announcements[0]],local,account);
 assert.deepEqual(automaticNotices(announcements,config,account,local,session),[]);
 assert.deepEqual(automaticNotices([{...announcements[0],updated_at:101}],config,account,local,session).map(x=>x.updated_at),[101]);
 assert.deepEqual(automaticNotices(announcements,{...config,popupEnabled:false},account,local,session),[]);
});

test('session frequency runs once per browser session, independent of read history',()=>{
 const local=store(),session=store(),nextSession=store(),config={...DEFAULT_NOTICE_CONFIG,frequency:'session',tag:'important'};
 assert.equal(automaticNotices(announcements,config,account,local,session).length,1);
 recordAutoNotice(announcements[0],config,account,local,session);
 assert.equal(automaticNotices(announcements,config,account,local,session).length,0);
 assert.equal(automaticNotices(announcements,config,account,local,nextSession).length,1);
});

test('daily frequency uses 24h throttle and ignores clock rollback',()=>{
 const local=store(),session=store(),config={...DEFAULT_NOTICE_CONFIG,frequency:'daily',tag:'important'};
 const time=1700000000000;
 recordAutoNotice(announcements[0],config,account,local,session,time);
 assert.equal(automaticNotices(announcements,config,account,local,session,time+1000).length,0);
 assert.equal(automaticNotices(announcements,config,account,local,session,time-30000).length,1);
 assert.equal(automaticNotices(announcements,config,account,local,session,time+86400000).length,1);
});

test('always frequency repeats on a new page visit regardless of previous viewed state',()=>{
 const local=store(),session=store(),config={...DEFAULT_NOTICE_CONFIG,frequency:'always',tag:'important'};
 markNoticesSeen([announcements[0]],local,account);
 assert.deepEqual(automaticNotices(announcements,config,account,local,session),[announcements[0]]);
});

test('public notice field names and version are packaged as independent theme settings',()=>{
 const src=readFileSync(new URL('../scripts/package-txboard.mjs',import.meta.url),'utf8');
 for(const field of ['notice_popup_enabled','notice_center_enabled','notice_popup_tag','notice_popup_frequency','notice_popup_scope','notice_popup_style']){
  assert.ok(src.includes("field_name:'"+field+"'"),field);
 }
 assert.match(src,/THEME_VERSION\|\|'0\.9\.0'/);
});
