import {test,expect} from '@playwright/test';

const wrap=(data,requestId='req-e2e')=>({data,request_id:requestId});
async function mock(page,{captcha=false,stripe=false}={}){
 const calls=[];
 await page.route('**/txapi/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname,method=route.request().method();
  const body=method==='POST'||method==='DELETE'?(route.request().postDataJSON()||{}):null;
  calls.push({path,body});
  const payload={
   '/txapi/public/site-config':{
    app_name:'Luma 迁移回归',frontend_theme:'vv-theme',
    is_captcha:captcha?1:0,captcha_type:captcha?'recaptcha-v3':undefined,
    recaptcha_v3_site_key:captcha?'site-key-test':undefined,
    invite_enable:1,gift_card_enable:1,theme_config:{notice_popup_enabled:'0'}
   },
   '/txapi/auth/login':{auth_data:'Bearer native-migration-token'},
   '/txapi/me':{id:1,email:'native@example.test',plan_id:0,balance_minor:900,commission_balance_minor:5000,expired_at:null,traffic:{upload_bytes:0,download_bytes:0,limit_bytes:0}},
   '/txapi/invites':{codes:[{code:'ABCD1234',pv:7}],stat:[2,1200,300,10,5000]},
   '/txapi/me/subscription':{plan:null,traffic_limit_bytes:0,upload_bytes:0,download_bytes:0,expired_at:null,next_reset_at:null,subscribe_url:''},
   '/txapi/plans':[{id:6,name:'基础方案',content:'',tags:[],traffic_limit_bytes:50*1073741824,speed_limit_mbps:null,device_limit:null,capacity_limit:null,reset_traffic_method:null,prices:[{period:'monthly',amount_minor:1200}],renewable:true}],
   '/txapi/me/dashboard-stats':[],
   '/txapi/notices':[],
   '/txapi/orders':[],
   '/txapi/auth/sessions':[{id:3,name:'iPhone',abilities:['*'],created_at:'2026-10-09T00:00:00+00:00',updated_at:'2026-10-09T00:00:00+00:00',last_used_at:'2026-10-09T00:01:00+00:00',expires_at:null}],
   '/txapi/gift-cards/history':[],
   '/txapi/billing/payment-methods':[{id:7,name:'信用卡',provider:stripe?'StripeCredit':'MockPay',icon:null,fee_fixed_minor:0,fee_percent:0}],
   '/txapi/billing/stripe-public-key':'pk_test_mockable',
   '/txapi/me/subscription-credentials/rotate':{subscribe_url:'https://example.test/new-subscription'},
   '/txapi/auth/quick-login':'https://example.test/quick-login',
   '/txapi/billing/commission-transfer':true,
   '/txapi/billing/withdrawals':true,
   '/txapi/auth/sessions/3':true,
   '/txapi/me/preferences':true,
   '/txapi/orders/STRIPE-ORDER':{id:1,trade_no:'STRIPE-ORDER',status:0,plan_id:6,type:0,period:'monthly',amount_minor:1200,plan:{id:6,name:'基础方案'},paid_at:null,created_at:'2026-01-01T00:00:00+00:00'},
   '/txapi/orders/STRIPE-ORDER/detail':{id:1,trade_no:'STRIPE-ORDER',status:0,plan_id:6,period:'monthly',type:0,amount_minor:1200,plan:{id:6,name:'基础方案',traffic_limit_bytes:50*1073741824},payment_id:null,paid_at:null,created_at:'2026-01-01T00:00:00+00:00'},
   '/txapi/gift-cards/check':{
    code_info:{code:'GC-ABC',template:{name:'流量奖励',type_name:'流量包'}},
    reward_preview:{transfer_enable:1073741824},can_redeem:true
   },
   '/txapi/gift-cards/redeem':{message:'兑换成功',template_name:'流量奖励',rewards:{transfer_enable:1073741824}}
  };
  if(path==='/txapi/orders/STRIPE-ORDER/checkout'){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({type:2,data:true,request_id:'req-checkout'})});
   return;
  }
  if(path==='/txapi/orders'&&method==='POST'){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap({trade_no:'STRIPE-ORDER'}))});
   return;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(payload[path]??true))});
 });
 return calls;
}
async function signIn(page){
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('native@example.test');
 await page.getByLabel('登录密码').fill('passw0rd');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.getByRole('region',{name:'账户欢迎卡片'})).toBeVisible();
}
test('account finances and active sessions stay inside Luma and send native API payloads',async({page})=>{
 const calls=await mock(page);
 page.on('dialog',dialog=>dialog.accept());
 await signIn(page);
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'账号设置'}).click();
 await page.getByRole('button',{name:'邀请管理',exact:true}).click();
 const invite=page.getByRole('region',{name:'邀请与佣金'});
 await expect(invite).toContainText('ABCD1234');
 await invite.getByRole('textbox',{name:'划转金额（元）'}).fill('12.34');
 await invite.getByRole('button',{name:'确认划转'}).click();
 await expect(invite).toContainText('佣金已划转到余额');
 expect(calls.find(x=>x.path==='/txapi/billing/commission-transfer')?.body).toEqual({transfer_amount:1234});
 await page.getByRole('button',{name:'安全设置',exact:true}).click();
 const security=page.getByRole('region',{name:'账户安全管理'});
 await expect(security).toContainText('iPhone');
 await security.getByRole('button',{name:'移除'}).click();
 await expect(security).toContainText('会话已移除');
 const revoke=calls.find(x=>x.path==='/txapi/auth/sessions/3');
 expect(revoke).toBeTruthy();
 expect(await page.evaluate(()=>location.pathname)).toBe('/');
});
test('gift card checks before redeeming and stays in Luma',async({page})=>{
 const calls=await mock(page);
 page.on('dialog',dialog=>dialog.accept());
 await signIn(page);
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'全部菜单'}).click();
 await page.getByRole('button',{name:'礼品卡'}).click();
 const section=page.getByRole('region',{name:'礼品卡'});
 await section.getByRole('textbox',{name:'礼品卡兑换码'}).fill('GC-ABC');
 await section.getByRole('button',{name:'查询礼品卡'}).click();
 await expect(section).toContainText('流量奖励');
 expect(calls.some(x=>x.path==='/txapi/gift-cards/redeem')).toBe(false);
 await section.getByRole('button',{name:'确认兑换'}).click();
 await expect(section).toContainText('兑换成功');
 expect(calls.filter(x=>x.path==='/txapi/gift-cards/redeem')).toHaveLength(1);
 expect(await page.evaluate(()=>location.pathname)).toBe('/');
});
test('captcha protected login obtains v3 token without redirecting to original SPA',async({page})=>{
 await page.route('https://www.google.com/recaptcha/api.js?render=**',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:"window.grecaptcha={ready:fn=>fn(),execute:async()=> 'real-provider-token'};"
 }));
 const calls=await mock(page,{captcha:true});
 await page.goto('/');
 await expect(page.getByText('受 reCAPTCHA v3 保护')).toBeVisible();
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('native@example.test');
 await page.getByLabel('登录密码').fill('passw0rd');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.getByRole('region',{name:'账户欢迎卡片'})).toBeVisible();
 expect(calls.find(x=>x.path==='/txapi/auth/login')?.body?.recaptcha_v3_token).toBe('real-provider-token');
 expect(await page.evaluate(()=>location.pathname)).toBe('/');
});
test('Stripe credit card checkout passes token to TXBoard inside Luma',async({page})=>{
 await page.route('https://js.stripe.com/v3/',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:`window.Stripe=function(){return {elements:()=>({create:()=>({mount:()=>{},on:(event,cb)=>{if(event==='ready')setTimeout(cb,1)},destroy:()=>{}})}),createToken:async()=>({token:{id:'tok_stripe_test'}})}}`
 }));
 const calls=await mock(page,{stripe:true});
 await signIn(page);
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'购买套餐'}).click();
 await page.locator('[data-plan-id="6"]').getByRole('button',{name:/立即购买/}).click();
 await page.getByRole('dialog',{name:'购买 基础方案'}).getByRole('button',{name:/确认并创建订单/}).click();
 const order=page.getByRole('dialog',{name:'订单详情'});
 await expect(order).toBeVisible();
 await order.getByRole('button',{name:'立即支付'}).click();
 await expect.poll(()=>calls.find(x=>x.path==='/txapi/orders/STRIPE-ORDER/checkout')?.body?.token).toBe('tok_stripe_test');
 expect(await page.evaluate(()=>location.pathname)).toBe('/');
});
