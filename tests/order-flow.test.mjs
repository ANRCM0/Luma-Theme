import test from 'node:test';
import assert from 'node:assert/strict';
import {ORDER_STATUS,MAX_STATUS_POLLS,firstBlockingOrder,isBlockingOrder,isTerminalOrder,normalizeOrderStatus,shouldPollOrder,orderStateText,resolvePaymentConfig} from '../src/live/order-flow.js';
import {readFileSync} from 'node:fs';

test('TXBoard order statuses cover unpaid, processing and terminal cases',()=>{
 assert.deepEqual(ORDER_STATUS,{UNPAID:0,PROCESSING:1,CANCELED:2,COMPLETED:3,DISCOUNTED:4});
 assert.equal(normalizeOrderStatus('0'),0);
 assert.equal(normalizeOrderStatus('3'),3);
 for(const value of [null,'',-1,5,'NaN','not-a-status',[],{},false,true])assert.equal(normalizeOrderStatus(value),null);
 assert.equal(isBlockingOrder(0),true);
 assert.equal(isBlockingOrder('1'),true);
 assert.equal(isBlockingOrder(2),false);
 assert.equal(isTerminalOrder(2),true);
 assert.equal(isTerminalOrder(3),true);
 assert.equal(isTerminalOrder(4),true);
 assert.equal(isTerminalOrder(0),false);
 assert.ok(orderStateText(3).includes('完成'));
});

test('pending order selection never treats settled orders as a payment blocker',()=>{
 const list=[
  {trade_no:'DONE',status:3},{trade_no:'CANCELED',status:2},
  {trade_no:'PENDING',status:0},{trade_no:'PROCESSING',status:'1'}
 ];
 assert.equal(firstBlockingOrder(list).trade_no,'PENDING');
 assert.equal(firstBlockingOrder(list.filter(x=>x.status!==0)).trade_no,'PROCESSING');
 assert.equal(firstBlockingOrder([{status:0}, {trade_no:'DONE',status:3}]),null);
 assert.equal(shouldPollOrder({trade_no:'X',status:0}),true);
 assert.equal(shouldPollOrder({trade_no:'X',status:1}),true);
 assert.equal(shouldPollOrder({trade_no:'X',status:3}),false);
 assert.equal(shouldPollOrder({status:0}),false);
 assert.equal(MAX_STATUS_POLLS,20);
});

test('theme settings clamp status intervals and use current theme values only',()=>{
 const config=resolvePaymentConfig({frontend_theme:'vv-theme',theme_config:{payment_auto_check:'0',payment_poll_seconds:300}});
 assert.deepEqual(config,{autoCheck:false,pollMs:15000});
 assert.deepEqual(resolvePaymentConfig({frontend_theme:'vv-theme',theme_config:{payment_poll_seconds:1}}),{autoCheck:true,pollMs:4000});
 assert.deepEqual(resolvePaymentConfig({frontend_theme:'vv-theme',theme_config:{payment_poll_seconds:'NaN'}}),{autoCheck:true,pollMs:4000});
 assert.deepEqual(resolvePaymentConfig({frontend_theme:'TXBoard',theme_config:{payment_auto_check:'0'}},{payment:{autoCheck:'1',pollSeconds:8}}),{autoCheck:true,pollMs:8000});
});

test('CI runs only Node.js 22 and preserves real-mode browser tests',()=>{
 const ci=readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
 assert.match(ci,/node-version: '22'/);
 assert.doesNotMatch(ci,/matrix\.node|node-version: '20'|node: \['20'/);
 for(const name of ['Run tests','Browser end-to-end tests','Real-mode browser smoke tests','Build live TXBoard theme bundle'])assert.ok(ci.includes(name));
 const pkg=readFileSync(new URL('../scripts/package-txboard.mjs',import.meta.url),'utf8');
 assert.match(pkg,/THEME_VERSION\|\|'0\.8\.0'/);
 for(const key of ['payment_auto_check','payment_poll_seconds'])assert.ok(pkg.includes("field_name:'"+key+"'"));
});
