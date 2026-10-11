import {test,expect} from '@playwright/test';

const plan={id:6,name:'基础方案',content:'',tags:[],traffic_limit_bytes:50*1073741824,speed_limit_mbps:null,device_limit:null,capacity_limit:null,reset_traffic_method:null,prices:[{period:'monthly',amount_minor:1200},{period:'yearly',amount_minor:12000}],renewable:true};
const wrap=(data,requestId='req-e2e')=>({data,request_id:requestId});
async function login(page,email){
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill(email);
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'购买套餐'}).click();
 await page.locator('[data-plan-id="6"]').getByRole('button',{name:/立即购买/}).click();
}
function fixtures(email){
 return {
  '/txapi/public/site-config':{app_name:'交易回归',frontend_theme:'vv-theme',theme_config:{notice_popup_enabled:'0',payment_auto_check:'1',payment_poll_seconds:4}},
  '/txapi/auth/login':{auth_data:'Bearer order-test-token'},
  '/txapi/me':{id:560,email,plan_id:0,balance_minor:0,commission_balance_minor:0,expired_at:null,traffic:{upload_bytes:0,download_bytes:0,limit_bytes:0}},
  '/txapi/me/subscription':{plan:null,traffic_limit_bytes:0,upload_bytes:0,download_bytes:0,expired_at:null,next_reset_at:null,subscribe_url:''},
  '/txapi/plans':[plan],
  '/txapi/me/dashboard-stats':[],
  '/txapi/notices':[],
  '/txapi/billing/payment-methods':[{id:8,name:'测试支付',provider:'MockPay',icon:null,fee_fixed_minor:0,fee_percent:0}]
 };
}

test('unpaid order recovery defaults to resuming instead of silently cancelling',async({page})=>{
 const email='resume@example.test',base=fixtures(email);
 let cancellations=0,created=0;
 await page.route('**/txapi/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  let result=base[path]??[];
  if(path==='/txapi/orders')result=[{id:1,trade_no:'OLD-TN',plan_id:6,plan,status:0,type:0,period:'monthly',amount_minor:1200,paid_at:null,created_at:'2026-01-01T00:00:00+00:00'}];
  if(path==='/txapi/orders/OLD-TN/detail')result={id:1,trade_no:'OLD-TN',plan_id:6,plan,period:'monthly',type:0,status:0,amount_minor:1200,payment_id:null,paid_at:null,created_at:'2026-01-01T00:00:00+00:00'};
  if(path==='/txapi/orders'&&route.request().method()==='POST')created++;
  if(path==='/txapi/orders/OLD-TN/cancel')cancellations++;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(result))});
 });
 await login(page,email);
 const purchase=page.getByRole('dialog',{name:'购买 基础方案'});
 await purchase.getByRole('button',{name:/确认并创建订单/}).click();
 const conflict=page.getByRole('dialog',{name:'继续处理已有订单'});
 await expect(conflict).toBeVisible();
 await expect(conflict.getByRole('button',{name:'继续支付原订单'})).toBeVisible();
 expect(created).toBe(0);
 expect(cancellations).toBe(0);
 await conflict.getByRole('button',{name:'继续支付原订单'}).click();
 const detail=page.getByRole('dialog',{name:'订单详情'});
 await expect(detail).toBeVisible();
 await expect(detail).toContainText('OLD-TN');
 await expect(detail.getByRole('button',{name:'立即支付'})).toBeVisible();
 expect(created).toBe(0);
 expect(cancellations).toBe(0);
});

test('changing an existing order requires explicit confirmation and creates only one new order',async({page})=>{
 const email='change-order@example.test',base=fixtures(email);
 let canceled=false,cancellations=0,created=0;
 await page.route('**/txapi/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname,method=route.request().method();
  let result=base[path]??[];
  if(path==='/txapi/orders')result=canceled?[]:[{id:1,trade_no:'OLD-TN',plan_id:6,plan,status:0,type:0,period:'monthly',amount_minor:1200,paid_at:null,created_at:'2026-01-01T00:00:00+00:00'}];
  if(path==='/txapi/orders/OLD-TN')result={id:1,trade_no:'OLD-TN',plan_id:6,status:canceled?2:0,type:0,period:'monthly',amount_minor:1200,plan:{id:6,name:'基础方案'},paid_at:null,created_at:'2026-01-01T00:00:00+00:00'};
  if(path==='/txapi/orders/OLD-TN/detail')result={id:1,trade_no:'OLD-TN',plan_id:6,plan,status:canceled?2:0,amount_minor:1200,period:'monthly',type:0,payment_id:null,paid_at:null,created_at:'2026-01-01T00:00:00+00:00'};
  if(path==='/txapi/orders/NEW-TN')result={id:2,trade_no:'NEW-TN',plan_id:6,status:0,type:0,period:'monthly',amount_minor:1200,plan:{id:6,name:'基础方案'},paid_at:null,created_at:'2026-01-01T00:00:00+00:00'};
  if(path==='/txapi/orders/NEW-TN/detail')result={id:2,trade_no:'NEW-TN',plan_id:6,plan,status:0,amount_minor:1200,period:'monthly',type:0,payment_id:null,paid_at:null,created_at:'2026-01-01T00:00:00+00:00'};
  if(path==='/txapi/orders/OLD-TN/cancel'){cancellations++;canceled=true;result=true}
  if(path==='/txapi/orders'&&method==='POST'){created++;result={trade_no:'NEW-TN'}}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(result))});
 });
 page.on('dialog',dialog=>dialog.accept());
 await login(page,email);
 await page.getByRole('dialog',{name:'购买 基础方案'}).getByRole('button',{name:/确认并创建订单/}).click();
 const conflict=page.getByRole('dialog',{name:'继续处理已有订单'});
 await conflict.getByRole('button',{name:'取消原订单并重新下单'}).click();
 await expect(page.getByRole('dialog',{name:'订单详情'})).toContainText('NEW-TN');
 expect(cancellations).toBe(1);
 expect(created).toBe(1);
});

test('checkout errors are retryable, safe external link remains available and status auto-completes',async({page})=>{
 const email='retry@example.test',base=fixtures(email);
 let checkouts=0,saved=0,serverStatus=0,paidAt=0;
 await page.route('**/txapi/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  let result=base[path]??[];
  if(path==='/txapi/orders')result=[];
  if(path==='/txapi/orders'&&route.request().method()==='POST'){saved++;result={trade_no:'ORDER-PAY-01'}}
  // orderCheck reads the lightweight projection; the mock advances its status
  // once a payment has started, exactly like the detail projection does.
  if(path==='/txapi/orders/ORDER-PAY-01'){
   if(paidAt&&Date.now()-paidAt>800)serverStatus=3;
   result={id:3,trade_no:'ORDER-PAY-01',plan_id:6,status:serverStatus,type:0,period:'monthly',amount_minor:900,plan:{id:6,name:'基础方案'},paid_at:null,created_at:'2026-01-01T00:00:00+00:00'};
  }
  if(path==='/txapi/orders/ORDER-PAY-01/detail'){
   if(paidAt&&Date.now()-paidAt>800)serverStatus=3;
   result={id:3,trade_no:'ORDER-PAY-01',plan_id:6,plan,period:'monthly',type:0,status:serverStatus,amount_minor:900,payment_id:null,paid_at:null,created_at:'2026-01-01T00:00:00+00:00'};
  }
  if(path==='/txapi/orders/ORDER-PAY-01/checkout'){
   checkouts++;
   if(checkouts===1){
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({error:{code:'PAYMENT_UNAVAILABLE',message:'支付网关暂时无法连接'},request_id:'req-fail'})});
    return;
   }
   paidAt=Date.now();
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap({type:1,data:'https://pay.example.test/order'},'req-redirect'))});
   return;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(result))});
 });
 await login(page,email);
 await page.getByRole('dialog',{name:'购买 基础方案'}).getByRole('button',{name:/确认并创建订单/}).click();
 const detail=page.getByRole('dialog',{name:'订单详情'});
 await expect(detail).toBeVisible();
 await detail.getByRole('button',{name:'立即支付'}).click();
 await expect(detail.getByRole('alert')).toContainText('支付网关暂时无法连接');
 await detail.getByRole('button',{name:'立即支付'}).click();
 await expect(detail.getByRole('link',{name:/手动打开安全支付链接/})).toHaveAttribute('href','https://pay.example.test/order');
 await expect(detail.getByText('订单已完成',{exact:true})).toBeVisible({timeout:16000});
 await expect(detail.getByRole('button',{name:'立即支付'})).toHaveCount(0);
 expect(checkouts).toBe(2);
 expect(saved).toBe(1);
});

test('processing orders cannot be cancelled or paid again',async({page})=>{
 const email='processing@example.test',base=fixtures(email);
 let canceled=0,created=0;
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let result=base[path]??[];
  if(path==='/txapi/orders')result=[{id:4,trade_no:'PROCESS-TN',status:1,plan_id:6,plan,type:0,period:'monthly',amount_minor:500,paid_at:null,created_at:'2026-01-01T00:00:00+00:00'}];
  if(path==='/txapi/orders/PROCESS-TN')result={id:4,trade_no:'PROCESS-TN',status:1,plan_id:6,type:0,period:'monthly',amount_minor:500,plan:{id:6,name:'基础方案'},paid_at:null,created_at:'2026-01-01T00:00:00+00:00'};
  if(path==='/txapi/orders/PROCESS-TN/detail')result={id:4,trade_no:'PROCESS-TN',status:1,plan_id:6,plan,type:0,period:'monthly',amount_minor:500,payment_id:null,paid_at:null,created_at:'2026-01-01T00:00:00+00:00'};
  if(path==='/txapi/orders'&&route.request().method()==='POST')created++;
  if(path==='/txapi/orders/PROCESS-TN/cancel')canceled++;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(result))});
 });
 await login(page,email);
 await page.getByRole('dialog',{name:'购买 基础方案'}).getByRole('button',{name:/确认并创建订单/}).click();
 const conflict=page.getByRole('dialog',{name:'继续处理已有订单'});
 await expect(conflict.getByRole('button',{name:'查看订单进度'})).toBeVisible();
 await expect(conflict.getByRole('button',{name:'取消原订单并重新下单'})).toHaveCount(0);
 await conflict.getByRole('button',{name:'查看订单进度'}).click();
 const detail=page.getByRole('dialog',{name:'订单详情'});
 await expect(detail).toContainText('正在开通');
 await expect(detail.getByRole('button',{name:'立即支付'})).toHaveCount(0);
 expect(canceled).toBe(0);
 expect(created).toBe(0);
});
