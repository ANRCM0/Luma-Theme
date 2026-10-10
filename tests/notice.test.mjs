import test from 'node:test';
import assert from 'node:assert/strict';
import {
 noticeStorageKey,noticeVersion,readSeenNotices,unseenNotices,markNoticesSeen,noticePlainText
} from '../src/live/notice.js';

const memory=()=>({
 values:new Map(),
 getItem(key){return this.values.get(key)??null},
 setItem(key,value){this.values.set(key,String(value))}
});

test('TXBoard announcements are only shown once per version and account',()=>{
 const storage=memory(),accountA={id:21,email:'a@example.test'},accountB={id:22};
 // Native /notices returns no updated_at, so the seen-version key is the id
 // plus created_at; there is no second timestamp to compare against.
 const first={id:4,title:'公告 A',created_at:100};
 const another={id:5,title:'公告 B',created_at:110};
 assert.equal(unseenNotices([first,another],storage,accountA).length,2);
 markNoticesSeen([first,another],storage,accountA);
 assert.deepEqual(unseenNotices([first,another],storage,accountA),[]);
 assert.equal(unseenNotices([first,another],storage,accountB).length,2);
 const changed={...first,created_at:121};
 assert.deepEqual(unseenNotices([changed,another],storage,accountA),[changed]);
 assert.equal(noticeVersion(changed),'4:121');
 assert.match(noticeStorageKey(accountA),/21/);
 assert.equal(noticeStorageKey({}),null);
});

test('corrupted or unavailable browser storage never blocks notifications',()=>{
 const account={id:9},item={id:99};
 const storage=memory();
 storage.setItem(noticeStorageKey(account),'not json');
 assert.deepEqual(readSeenNotices(storage,account),[]);
 assert.deepEqual(unseenNotices([item],storage,account),[item]);
 markNoticesSeen([item],storage,account);
 assert.deepEqual(unseenNotices([item],storage,account),[]);
 const privateStorage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
 assert.deepEqual(unseenNotices([item],privateStorage,account),[item]);
 assert.doesNotThrow(()=>markNoticesSeen([item],privateStorage,account));
});

test('rendering notices removes HTML markup but keeps readable line breaks',()=>{
 assert.equal(noticePlainText('<p>第一段</p><div>第二段<br/>下一行</div>'), '第一段\n第二段\n下一行');
 assert.equal(noticePlainText('<strong>安全提示</strong> &amp; 更新'),'安全提示 & 更新');
 assert.equal(noticePlainText(null),'');
});
