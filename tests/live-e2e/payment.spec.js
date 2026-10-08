import {test,expect} from '@playwright/test';

const plan={id:6,name:'基础方案',show:true,sell:true,month_price:1200,year_price:12000,transfer_enable:50};
const wrap=data=>({status:'success',data});
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
  '/api/v1/guest/comm/config':{app_name:'交易回归',frontend_theme:'vv-theme',theme_config:{notice_popup_enabled:'0',payment_auto_check:'1',payment_poll_seconds:4}},
  '/api/v1/passport/auth/login':{auth_data:'order-test-token'},
  '/api/v1/user/checkLogin':{is_login:true},
  '/api/v1/user/info':{id:560,email,plan_id:0},
  '/api/v1/user/getSubscribe':{plan_id:0},
  '/api/v1/user/plan/fetch':[plan],
  '/api/v1/user/getStat':[],
  '/api/v1/user/notice/fetch':{data:[],total:0},
  '/api/v1/user/order/getPaymentMethod':[{id:8,name:'测试支付',payment:'MockPay'}]
 };
}

test('unpaid order recovery defaults to resuming instead of silently cancelling',async({page})=>{
 const email='resume@example.test',base=fixtures(email);
 let cancellations=0,created=0;
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let result=base[path]??[];
  if(path==='/api/v1/user/order/fetch')result=[{trade_no:'OLD-TN',plan_id:6,plan,status:0,total_amount:1200}];
  if(path==='/api/v1/user/order/detail')result={trade_no:'OLD-TN',plan_id:6,plan,period:'month_price',status:0,total_amount:1200};
  if(path==='/api/v1/user/order/save')created++;
  if(path==='/api/v1/user/order/cancel')cancellations++;
  if(path==='/api/v1/user/order/check')result=0;
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
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let result=base[path]??[];
  if(path==='/api/v1/user/order/fetch')result=canceled?[]:[{trade_no:'OLD-TN',plan_id:6,plan,status:0}];
  if(path==='/api/v1/user/order/detail'){
   const trade=new URL(route.request().url()).searchParams.get('trade_no');
   result={trade_no:trade,plan_id:6,plan,status:trade==='OLD-TN'?(canceled?2:0):0,total_amount:1200,period:'month_price'};
  }
  if(path==='/api/v1/user/order/cancel'){cancellations++;canceled=true;result=true}
  if(path==='/api/v1/user/order/save'){created++;result='NEW-TN'}
  if(path==='/api/v1/user/order/check')result=0;
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
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let result=base[path]??[];
  if(path==='/api/v1/user/order/fetch')result=[];
  if(path==='/api/v1/user/order/save'){saved++;result='ORDER-PAY-01'}
  if(path==='/api/v1/user/order/detail')result={trade_no:'ORDER-PAY-01',plan_id:6,plan,period:'month_price',status:serverStatus,total_amount:900};
  if(path==='/api/v1/user/order/check'){
   if(paidAt&&Date.now()-paidAt>800)serverStatus=3;
   result=serverStatus;
  }
  if(path==='/api/v1/user/order/checkout'){
   checkouts++;
   if(checkouts===1){
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'fail',message:'支付网关暂时无法连接',data:false})});
    return;
   }
   paidAt=Date.now();
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({type:1,data:'https://pay.example.test/order'})});
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
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let result=base[path]??[];
  if(path==='/api/v1/user/order/fetch')result=[{trade_no:'PROCESS-TN',status:1,plan_id:6,plan}];
  if(path==='/api/v1/user/order/detail')result={trade_no:'PROCESS-TN',status:1,plan_id:6,plan,total_amount:500};
  if(path==='/api/v1/user/order/save')created++;
  if(path==='/api/v1/user/order/cancel')canceled++;
  if(path==='/api/v1/user/order/check')result=1;
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
