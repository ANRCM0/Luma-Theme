import {test,expect} from '@playwright/test';

const wrap=data=>({status:'success',data});
async function mock(page,{captcha=false,stripe=false}={}){
 const calls=[];
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname,method=route.request().method();
  const body=method==='POST'?(route.request().postDataJSON()||{}):null;
  calls.push({path,body});
  const payload={
   '/api/v1/guest/comm/config':{
    app_name:'Luma 迁移回归',frontend_theme:'vv-theme',
    is_captcha:captcha?1:0,captcha_type:captcha?'recaptcha-v3':undefined,
    recaptcha_v3_site_key:captcha?'site-key-test':undefined,
    invite_enable:1,gift_card_enable:1,theme_config:{notice_popup_enabled:'0'}
   },
   '/api/v1/passport/auth/login':{auth_data:'native-migration-token'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{email:'native@example.test',plan_id:0,balance:900,commission_balance:5000},
   '/api/v1/user/comm/config':{
    invite_enable:1,commission_enable:1,commission_transfer_limit:1,commission_withdraw_limit:10,
    withdraw_close:0,withdraw_methods:['支付宝'],gift_card_enable:1
   },
   '/api/v1/user/getSubscribe':{plan_id:0},
   '/api/v1/user/plan/fetch':[{id:6,name:'基础方案',show:true,sell:true,month_price:1200,transfer_enable:50}],
   '/api/v1/user/getStat':[],
   '/api/v1/user/notice/fetch':{data:[],total:0},
   '/api/v1/user/invite/fetch':{codes:[{code:'ABCD1234',pv:7}],stat:[2,1200,300,10,5000]},
   '/api/v1/user/invite/details':{data:[],total:0},
   '/api/v1/user/order/fetch':[],
   '/api/v1/user/getActiveSession':[{id:3,name:'iPhone',created_at:'2026-10-09 00:00:00',last_used_at:'2026-10-09 00:01:00'}],
   '/api/v1/user/gift-card/history':{data:[],pagination:{current_page:1,last_page:1,per_page:20,total:0}},
   '/api/v1/user/gift-card/check':{
    code_info:{code:'GC-ABC',template:{name:'流量奖励',type_name:'流量包'}},
    reward_preview:{transfer_enable:1073741824},can_redeem:true
   },
   '/api/v1/user/gift-card/redeem':{message:'兑换成功',template_name:'流量奖励',rewards:{transfer_enable:1073741824}},
   '/api/v1/user/order/getPaymentMethod':[{id:7,name:'信用卡',payment:stripe?'StripeCredit':'MockPay'}],
   '/api/v1/user/order/save':'STRIPE-ORDER',
   '/api/v1/user/order/detail':{trade_no:'STRIPE-ORDER',status:0,plan_id:6,period:'month_price',total_amount:1200,plan:{name:'基础方案'}},
   '/api/v1/user/order/check':0,
   '/api/v1/user/comm/getStripePublicKey':'pk_test_mockable',
   '/api/v1/user/resetSecurity':'https://example.test/new-subscription',
   '/api/v1/user/getQuickLoginUrl':'https://example.test/quick-login',
   '/api/v1/user/transfer':true,
   '/api/v1/user/ticket/withdraw':true,
   '/api/v1/user/removeActiveSession':true,
   '/api/v1/user/update':true
  };
  if(path==='/api/v1/user/order/checkout'){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',type:2,data:true})});
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
 expect(calls.find(x=>x.path==='/api/v1/user/transfer')?.body).toEqual({transfer_amount:1234});
 await page.getByRole('button',{name:'安全设置',exact:true}).click();
 const security=page.getByRole('region',{name:'账户安全管理'});
 await expect(security).toContainText('iPhone');
 await security.getByRole('button',{name:'移除'}).click();
 await expect(security).toContainText('会话已移除');
 expect(calls.find(x=>x.path==='/api/v1/user/removeActiveSession')?.body).toEqual({session_id:'3'});
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
 expect(calls.some(x=>x.path==='/api/v1/user/gift-card/redeem')).toBe(false);
 await section.getByRole('button',{name:'确认兑换'}).click();
 await expect(section).toContainText('兑换成功');
 expect(calls.filter(x=>x.path==='/api/v1/user/gift-card/redeem')).toHaveLength(1);
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
 expect(calls.find(x=>x.path==='/api/v1/passport/auth/login')?.body?.recaptcha_v3_token).toBe('real-provider-token');
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
 await expect.poll(()=>calls.find(x=>x.path==='/api/v1/user/order/checkout')?.body?.token).toBe('tok_stripe_test');
 expect(await page.evaluate(()=>location.pathname)).toBe('/');
});
