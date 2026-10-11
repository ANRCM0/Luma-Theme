import {test,expect} from '@playwright/test';

const wrap=(data,meta)=>({data,...(meta?{meta}:{}),request_id:'req-recharge-poll'});
const recharge={trade_no:'WRPOLL123',payment_method_id:3,amount_minor:2500,fee_minor:0,total_minor:2500,status:0,created_at:1760000000,paid_at:null};

async function pendingRecharge(page,{paidAfter=Infinity}={}){
 const calls={create:0,checkout:0,status:0};
 const fixtures={
  '/txapi/public/site-config':{frontend_theme:'vv-theme',app_name:'Recharge Poll QA',is_captcha:0,theme_config:{notice_popup_enabled:'0'}},
  '/txapi/auth/login':{auth_data:'Bearer recharge-poll-test'},
  '/txapi/me':{id:311,email:'poll@example.test',plan_id:0,balance_minor:0},
  '/txapi/me/subscription':{plan:null,subscribe_url:'',traffic_limit_bytes:0,upload_bytes:0,download_bytes:0,expired_at:null},
  '/txapi/plans':[],
  '/txapi/notices':[],
  '/txapi/me/dashboard-stats':[],
  '/txapi/me/site-config':{},
  '/txapi/invites':{codes:[],stat:[0,0,0,0,0]},
  '/txapi/orders':[],
  '/txapi/billing/commissions':[],
  '/txapi/billing/wallet':{balance_minor:0,commission_balance_minor:0},
  '/txapi/billing/recharge-payment-methods':[{id:3,name:'模拟支付方式',payment:'EPay'}]
 };
 await page.route('**/txapi/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,method=req.method();
  let data=fixtures[path]??[],meta;
  if(path==='/txapi/billing/recharges'&&method==='GET'){
   data=[];meta={page:1,per_page:20,total:0,last_page:1};
  }else if(path==='/txapi/billing/recharges'&&method==='POST'){
   calls.create++;data={...recharge};
  }else if(path==='/txapi/billing/recharges/WRPOLL123/checkout'&&method==='POST'){
   calls.checkout++;data={type:-1,data:null};
  }else if(path==='/txapi/billing/recharges/WRPOLL123'&&method==='GET'){
   calls.status++;
   if(calls.status<paidAfter){
    await route.fulfill({status:503,contentType:'application/json',
     body:JSON.stringify({error:{code:'TEMP_UNAVAILABLE',message:'temporary gateway error'},request_id:'req-failed'})});
    return;
   }
   data={...recharge,status:1,paid_at:1760000100};
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(data,meta))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('poll@example.test');
 await page.getByLabel('登录密码').fill('password123');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.getByRole('region',{name:'账户欢迎卡片'})).toBeVisible();
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'账号设置'}).click();
 await page.getByRole('button',{name:'财务记录',exact:true}).click();
 const wallet=page.getByRole('region',{name:'钱包充值'});
 await expect(wallet).toBeVisible();
 await wallet.getByLabel('充值金额（元）').fill('25.00');
 await wallet.getByRole('button',{name:'创建充值订单并支付'}).click();
 await expect(wallet.locator('.live-extra-stack')).toContainText('WRPOLL123');
 await expect(wallet.getByRole('status')).toContainText('正在等待后台确认');
 expect(calls.create).toBe(1);expect(calls.checkout).toBe(1);
 return {wallet,calls};
}

test('recharge polling stops after 20 consecutive network errors and manual checking remains available',async({page})=>{
 test.setTimeout(90_000);
 await page.clock.install();
 const {wallet,calls}=await pendingRecharge(page);
 // Advance each interval separately so intercepted fetch promises settle
 // between ticks; a single 92-second clock leap can skip in-flight polls.
 for(let n=1;n<=20;n++){
  await page.clock.runFor(4_000);
  await expect.poll(()=>calls.status).toBe(n);
  await page.clock.runFor(50);
 }
 await expect(wallet.getByText('自动查询已暂停，可手动刷新充值状态')).toBeVisible();
 expect(calls.status).toBe(20);
 await page.clock.runFor(4_000*5);
 expect(calls.status).toBe(20);
 expect(calls.create).toBe(1);
 expect(calls.checkout).toBe(1);
 await wallet.getByRole('button',{name:'核对充值状态'}).click();
 await expect(wallet.getByRole('alert')).toContainText('temporary gateway error');
 expect(calls.status).toBe(21);
});

test('recharge watcher recovers from two network errors and stops when server confirms payment',async({page})=>{
 test.setTimeout(60_000);
 await page.clock.install();
 const {wallet,calls}=await pendingRecharge(page,{paidAfter:3});
 await page.clock.runFor(4_000*5);
 await expect(wallet.getByText('后端已确认充值到账')).toBeVisible();
 await expect(wallet.locator('.live-extra-stack')).toContainText('已到账');
 expect(calls.status).toBe(3);
 await page.clock.runFor(4_000*5);
 expect(calls.status).toBe(3);
 expect(calls.create).toBe(1);expect(calls.checkout).toBe(1);
});

test('recharge watcher stops after leaving the wallet screen',async({page})=>{
 test.setTimeout(60_000);
 await page.clock.install();
 const {wallet,calls}=await pendingRecharge(page);
 await page.clock.runFor(4_000);
 await expect.poll(()=>calls.status).toBe(1);
 await page.clock.runFor(50);
 await page.clock.runFor(4_000);
 await expect.poll(()=>calls.status).toBe(2);
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'我的面板'}).click();
 await expect(wallet).toHaveCount(0);
 await page.clock.runFor(4_000*5);
 expect(calls.status).toBe(2);
});
