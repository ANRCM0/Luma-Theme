import {test,expect} from '@playwright/test';
// TXBoard native protocol: /txapi prefix, {data,meta?,request_id} envelope.
const wrap=(data,requestId='req-e2e')=>({data,request_id:requestId});

test('theme requires the actual login endpoint and rejects login failures',async({page})=>{
 const paths=[];
 await page.route('**/txapi/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   paths.push(path);
   const body=path==='/txapi/public/site-config'
     ? {data:{app_name:'测试站点',is_captcha:0,register_enable:1},request_id:'req-config'}
     : {error:{code:'INVALID_CREDENTIALS',message:'账户或密码错误'},request_id:'req-login-fail'};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });await page.goto('/');
 await page.locator('input[type=email]').fill('sample@example.com');
 await page.locator('input[type=password]').fill('sample-password');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('账户或密码错误');
 expect(paths).toContain('/txapi/auth/login');
 await expect(page.getByText('WELCOME BACK')).toHaveCount(0);
});


test('mobile authentication keeps input text visible in light and dark themes',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  await route.fulfill({
   status:200,contentType:'application/json',
   body:JSON.stringify(path==='/txapi/public/site-config'
    ?wrap({app_name:'测试站点',is_captcha:0,register_enable:1,is_email_verify:1})
    :{error:{code:'TEST',message:'仅供测试'},request_id:'req-auth'})
  });
 });
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'欢迎回来'})).toBeVisible();
 const email=page.getByRole('textbox',{name:'邮箱地址'});
 const password=page.getByLabel('登录密码');
 await email.fill('hello@example.com');
 await password.fill('visible-password');
 await expect(email).toHaveValue('hello@example.com');
 await expect(password).toHaveValue('visible-password');
 await expect(email).toHaveCSS('color','rgb(33, 49, 60)');
 await expect(password).toHaveCSS('color','rgb(33, 49, 60)');
 await expect(email).toHaveCSS('-webkit-text-fill-color','rgb(33, 49, 60)');
 await expect(email).toHaveCSS('font-size','16px');
 await expect(page.locator('.live-auth-input-wrap').first()).toHaveCSS('background-color','rgb(248, 251, 252)');
 await page.getByRole('button',{name:'显示密码'}).click();
 await expect(page.getByLabel('登录密码')).toHaveAttribute('type','text');
 await page.getByRole('button',{name:'隐藏密码'}).click();
 await expect(page.getByLabel('登录密码')).toHaveAttribute('type','password');
 await page.getByRole('button',{name:'切换主题'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await expect(email).toHaveCSS('color','rgb(242, 247, 250)');
 await expect(page.locator('.live-auth-input-wrap').first()).toHaveCSS('background-color','rgb(21, 35, 43)');
 await expect(page.locator('.live-login .login-card')).toHaveCSS('background-color','rgb(29, 43, 52)');
 await expect(email).toHaveCSS('-webkit-text-fill-color','rgb(242, 247, 250)');
 await expect(password).toHaveCSS('color','rgb(242, 247, 250)');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
 await page.getByRole('button',{name:/注册新账号/}).click();
 await expect(page.getByRole('heading',{name:'创建您的账号'})).toBeVisible();
 await expect(page.getByLabel('确认密码')).toBeVisible();
 await expect(page.getByLabel('邮箱验证码')).toBeVisible();
 await page.getByRole('button',{name:/返回登录/}).click();
 await page.getByRole('button',{name:'忘记密码？'}).click();
 await expect(page.getByRole('heading',{name:'找回账号密码'})).toBeVisible();
 await expect(page.getByLabel('新密码')).toBeVisible();
 await expect(page.getByLabel('邮箱验证码')).toBeVisible();
});


test('latest TXBoard public theme_config controls live colors and login background',async({page})=>{
 await page.route('**/txapi/**',async route=>{
  const url=new URL(route.request().url());
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(
   url.pathname==='/txapi/public/site-config'
    ?wrap({
      app_name:'新版 TXBoard',frontend_theme:'vv-theme',
      theme_config:{theme_color:'black',background_url:'/images/welcome.webp'},
      is_captcha:0,register_enable:1
     })
    :{error:{code:'UNAUTHORIZED',message:'not signed in'},request_id:'req-config-2'}
  )});
 });
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'欢迎回来'})).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('data-vv-accent','black');
 await expect(page.locator('.live-login')).toHaveCSS('background-image',/welcome[.]webp/);
 await expect(page.locator('.live-auth-submit')).toHaveCSS('background-color','rgb(38, 55, 70)');
 await expect(page.locator('.live-auth-submit')).toHaveCSS('color','rgb(255, 255, 255)');
 await expect(page.getByText('新版 TXBoard',{exact:true}).first()).toBeVisible();
});


test('new TXBoard announcements pop up after login, not as a dashboard card',async({page})=>{
 let announcements=[
  {id:22,title:'维护通知',content:'<p>今晚维护</p><p>预计十分钟</p>',created_at:1700000000,updated_at:1700000010},
  {id:20,title:'使用说明',content:'<strong>请保护账号</strong>',created_at:1690000000,updated_at:1690000001}
 ];
 const paths=[];
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  paths.push(path);
  let data;
  switch(path){
   case '/txapi/public/site-config':data={app_name:'测试站点',is_captcha:0,register_enable:1};break;
   case '/txapi/auth/login':data={auth_data:'Bearer test-real-token'};break;
   case '/txapi/me':data={id:51,email:'notices@example.test'};break;
   case '/txapi/notices':data=announcements;break;
   case '/txapi/plans':data=[];break;
   case '/txapi/me/subscription':data={};break;
   case '/txapi/me/dashboard-stats':data=[];break;
   default:data=[];break;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(data))});
 });
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('notices@example.test');
 await page.getByLabel('登录密码').fill('valid-pass');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'重要通知'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'维护通知'})).toBeVisible();
 await expect(page.getByText('今晚维护')).toBeVisible();
 expect(paths).toContain('/txapi/notices');
 await expect(page.locator('.notice-card')).toHaveCount(0);
 const modal=page.getByRole('dialog',{name:'重要通知'});
 await modal.getByRole('button',{name:/使用说明/}).click();
 await expect(modal.getByRole('heading',{name:'使用说明'})).toBeVisible();
 await expect(modal.getByText('请保护账号')).toBeVisible();
 await modal.getByRole('button',{name:'我知道了'}).click();
 await expect(modal).toHaveCount(0);
 await expect(page.getByRole('button',{name:'查看通知'})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('dialog',{name:'重要通知'})).toHaveCount(0);
 await page.getByRole('button',{name:'查看通知'}).click();
 await expect(page.getByRole('dialog',{name:'公告中心'})).toBeVisible();
 await page.getByRole('dialog',{name:'公告中心'}).getByRole('button',{name:'关闭',exact:true}).click();
 announcements=[{id:25,title:'新发布公告',content:'新内容',created_at:1700001000,updated_at:1700001001},...announcements];
 await page.reload();
 await expect(page.getByRole('dialog',{name:'重要通知'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'新发布公告'})).toBeVisible();
});


test('theme notice tags choose popup while the bell keeps a full searchable-by-status inbox',async({page})=>{
 const announcements=[
  {id:90,title:'普通公告先展示',content:'普通内容',tags:['general'],updated_at:1810000001,created_at:1810000001},
  {id:80,title:'紧急维护公告',content:'紧急内容',tags:['important'],updated_at:1810000000,created_at:1810000000}
 ];
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/txapi/public/site-config':{app_name:'测试主题',frontend_theme:'vv-theme',theme_config:{
    notice_popup_enabled:'1',notice_center_enabled:'1',notice_popup_tag:'important',
    notice_popup_frequency:'once',notice_popup_scope:'all',notice_popup_style:'feature'
   }},
   '/txapi/auth/login':{auth_data:'Bearer token'},
   '/txapi/me':{id:77,email:'tags@example.test'},
   '/txapi/notices':announcements,
   '/txapi/plans':[],
   '/txapi/me/subscription':{},
   '/txapi/me/dashboard-stats':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(fixtures[path]??[]))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('tags@example.test');
 await page.getByLabel('登录密码').fill('valid-password');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 const popup=page.getByRole('dialog',{name:'重要通知'});
 await expect(popup).toBeVisible();
 await expect(popup.locator('.live-notice-style-feature')).toHaveCount(1);
 await expect(popup.getByRole('heading',{name:'紧急维护公告'})).toBeVisible();
 await popup.getByRole('button',{name:'我知道了'}).click();
 await expect(popup).toHaveCount(0);
 const bell=page.getByRole('button',{name:'查看通知'});
 await expect(bell.locator('.live-notice-indicator')).toHaveCount(1);
 await bell.click();
 const inbox=page.getByRole('dialog',{name:'公告中心'});
 await expect(inbox).toBeVisible();
 await inbox.getByRole('button',{name:'筛选未读公告'}).click();
 await expect(inbox.getByRole('heading',{name:'普通公告先展示'})).toBeVisible();
 await inbox.getByRole('button',{name:'全部标为已读'}).click();
 await inbox.getByRole('button',{name:'筛选未读公告'}).click();
 await expect(inbox.getByText('已查看全部公告')).toBeVisible();
 await inbox.getByRole('button',{name:'关闭',exact:true}).click();
 await expect(bell.locator('.live-notice-indicator')).toHaveCount(0);
 await page.reload();
 await expect(page.getByRole('dialog',{name:'重要通知'})).toHaveCount(0);
});

test('notification popup and bell can be independently disabled in theme settings',async({page})=>{
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/txapi/public/site-config':{frontend_theme:'vv-theme',app_name:'Test',theme_config:{
    notice_popup_enabled:'0',notice_center_enabled:'0'
   }},
   '/txapi/auth/login':{auth_data:'Bearer token'},
   '/txapi/me':{id:78,email:'disabled@example.test'},
   '/txapi/notices':[{id:1,title:'公告',content:'内容'}],
   '/txapi/plans':[],
   '/txapi/me/subscription':{},
   '/txapi/me/dashboard-stats':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(fixtures[path]??[]))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('disabled@example.test');
 await page.getByLabel('登录密码').fill('valid-password');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 // Native /me has no signup date, so a plan-less account is onboarding.
 await expect(page.locator('[data-welcome-state="new"]')).toBeVisible();
 await expect(page.getByRole('dialog',{name:'重要通知'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'查看通知'})).toHaveCount(0);
});


test('sidebar layout renders sorted desktop links with collapse control and safe business routing',async({page})=>{
 await page.setViewportSize({width:1280,height:900});
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/txapi/public/site-config':{app_name:'布局测试站',frontend_theme:'vv-theme',theme_config:{
    layout_mode:'sidebar',sidebar_collapsed_default:'1',
    nav_items:'ticket,orders,!shop,menu,dashboard,!profile',notice_popup_enabled:'0'
   }},
   '/txapi/auth/login':{auth_data:'Bearer signed-token'},
   '/txapi/me':{id:701,email:'sidebar@example.test'},
   '/txapi/plans':[],
   '/txapi/notices':[],
   '/txapi/me/dashboard-stats':[],
   '/txapi/me/subscription':{},
   '/txapi/orders':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(fixtures[path]??[]))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('sidebar@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.locator('.live-layout-sidebar')).toBeVisible();
 await expect(page.locator('.live-sidebar-collapsed')).toBeVisible();
 const side=page.getByRole('navigation',{name:'侧边栏导航'});
 await expect(side.getByRole('button',{name:'购买套餐'})).toHaveCount(0);
 await expect(side.getByRole('button',{name:'服务工单'})).toBeVisible();
 await expect(side.getByRole('button',{name:'我的订单'})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'主导航'})).toHaveCount(0);
 await page.getByRole('button',{name:'展开侧边栏'}).click();
 await expect(page.locator('.live-sidebar-collapsed')).toHaveCount(0);
 await side.getByRole('button',{name:'我的订单'}).click();
 await expect(page.getByRole('heading',{name:'我的订单'})).toBeVisible();
 await expect(side.getByRole('button',{name:'我的订单'})).toHaveClass(/selected/);
});

test('mobile navigation honors visibility/order and keeps the menu escape hatch',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/txapi/public/site-config':{app_name:'移动布局',frontend_theme:'vv-theme',theme_config:{
    layout_mode:'sidebar',nav_items:'orders,ticket,!shop,!profile,dashboard,menu',notice_popup_enabled:'0'
   }},
   '/txapi/auth/login':{auth_data:'Bearer signed-token'},
   '/txapi/me':{id:702,email:'mobile@example.test'},
   '/txapi/plans':[],
   '/txapi/notices':[],
   '/txapi/me/dashboard-stats':[],
   '/txapi/me/subscription':{},
   '/txapi/orders':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(fixtures[path]??[]))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('mobile@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 const nav=page.getByRole('navigation',{name:'移动端导航'});
 await expect(nav).toBeVisible();
 await expect(nav.getByRole('button')).toHaveCount(4);
 await expect(nav.getByRole('button',{name:'购买套餐'})).toHaveCount(0);
 await expect(nav.getByRole('button',{name:'我的订单'})).toBeVisible();
 await expect(nav.getByRole('button',{name:'全部菜单'})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'侧边栏导航'})).toBeHidden();
 await nav.getByRole('button',{name:'全部菜单'}).click();
 await expect(page.getByRole('heading',{name:'全部菜单'})).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});


test('a newly registered user sees onboarding and the configured wallet side card',async({page})=>{
 const now=Math.floor(Date.now()/1000);
 await page.setViewportSize({width:390,height:844});
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/txapi/public/site-config':{app_name:'欢迎测试',frontend_theme:'vv-theme',is_captcha:0,theme_config:{
    welcome_enabled:'1',welcome_new_hours:48,welcome_secondary_card:'wallet',notice_popup_enabled:'0'
   }},
   '/txapi/auth/login':{auth_data:'Bearer welcome-session'},
   '/txapi/me':{email:'fresh@example.test',plan_id:0,balance_minor:3450,commission_balance_minor:0,expired_at:null,traffic:{upload_bytes:0,download_bytes:0,limit_bytes:0}},
   '/txapi/me/subscription':{plan:null,traffic_limit_bytes:0,upload_bytes:0,download_bytes:0,expired_at:null,next_reset_at:null,subscribe_url:''},
   '/txapi/plans':[],
   '/txapi/notices':[],
   '/txapi/me/dashboard-stats':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(fixtures[path]??[]))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('fresh@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 const welcome=page.locator('[data-welcome-state="new"]');
 await expect(welcome).toBeVisible();
 await expect(welcome.getByRole('heading',{name:/欢迎加入/})).toBeVisible();
 await expect(welcome.locator('button')).toHaveCount(0);
 await expect(page.getByRole('region',{name:'账户余额'})).toBeVisible();
 await expect(welcome).not.toContainText('剩余流量');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
});

test('subscriptions near expiry use a renewal message and usable traffic metrics',async({page})=>{
 const now=Math.floor(Date.now()/1000);
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/txapi/public/site-config':{app_name:'订阅提醒',frontend_theme:'vv-theme',is_captcha:0,theme_config:{
    welcome_enabled:'1',welcome_expiry_hours:'72',welcome_secondary_card:'usage',notice_popup_enabled:'0'
   }},
   '/txapi/auth/login':{auth_data:'Bearer welcome-session'},
   '/txapi/me':{email:'expiring@example.test',plan_id:3,balance_minor:0,commission_balance_minor:0,expired_at:new Date(now*1000+36*3600000).toISOString(),traffic:{upload_bytes:60*1073741824,download_bytes:35*1073741824,limit_bytes:100*1073741824}},
   '/txapi/me/subscription':{plan:{id:3,name:'高级套餐',traffic_limit_bytes:100*1073741824},traffic_limit_bytes:100*1073741824,upload_bytes:60*1073741824,download_bytes:35*1073741824,expired_at:new Date(now*1000+36*3600000).toISOString(),reset_day:15,next_reset_at:null},
   '/txapi/plans':[],
   '/txapi/notices':[],
   '/txapi/me/dashboard-stats':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(fixtures[path]??[]))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('expiring@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 const welcome=page.locator('[data-welcome-state="expiring"]');
 await expect(welcome).toBeVisible();
 await expect(welcome.getByRole('heading',{name:/订阅即将到期/})).toBeVisible();
 const usage=page.getByRole('region',{name:'流量用量'});
 await expect(usage).toBeVisible();
 await expect(usage.getByRole('progressbar',{name:'流量使用比例'})).toHaveAttribute('aria-valuenow','95');
 await usage.getByRole('button',{name:'查看套餐'}).click();
 await expect(page.getByRole('region',{name:'套餐商店'})).toBeVisible();
});

test('fully depleted plans show an upgrade action before other warnings',async({page})=>{
 const now=Math.floor(Date.now()/1000);
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/txapi/public/site-config':{app_name:'流量提醒',frontend_theme:'vv-theme',is_captcha:0,theme_config:{
    welcome_enabled:'1',welcome_secondary_card:'recommend',notice_popup_enabled:'0'
   }},
   '/txapi/auth/login':{auth_data:'Bearer welcome-session'},
   '/txapi/me':{email:'noquota@example.test',plan_id:4,balance_minor:0,commission_balance_minor:0,expired_at:new Date(now*1000+48*3600000).toISOString(),traffic:{upload_bytes:4*1073741824,download_bytes:6*1073741824,limit_bytes:10*1073741824}},
   '/txapi/me/subscription':{plan:{id:4,name:'普通套餐',traffic_limit_bytes:10*1073741824},traffic_limit_bytes:10*1073741824,upload_bytes:4*1073741824,download_bytes:6*1073741824,expired_at:new Date(now*1000+48*3600000).toISOString()},
   '/txapi/plans':[],
   '/txapi/notices':[],
   '/txapi/me/dashboard-stats':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(fixtures[path]??[]))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('noquota@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 const welcome=page.locator('[data-welcome-state="exhausted"]');
 await expect(welcome.getByRole('heading',{name:/流量已用完/})).toBeVisible();
 await expect(page.getByRole('region',{name:'已购套餐'}).getByRole('button',{name:'查看其他套餐'})).toBeVisible();
});


test('shop groups subscription types and creates an order only after server-side confirmation',async({page})=>{
 const checkoutRequests=[];
 const plans=[
  {id:1,name:'基础套餐',content:'<p>快速连接</p>',tags:[],traffic_limit_bytes:100*1073741824,speed_limit_mbps:null,device_limit:3,capacity_limit:null,reset_traffic_method:null,prices:[{period:'monthly',amount_minor:1000},{period:'quarterly',amount_minor:2800},{period:'yearly',amount_minor:9000}],renewable:true},
  {id:2,name:'旗舰套餐',content:'覆盖多种终端',tags:[],traffic_limit_bytes:200*1073741824,speed_limit_mbps:null,device_limit:5,capacity_limit:null,reset_traffic_method:null,prices:[{period:'monthly',amount_minor:2000},{period:'yearly',amount_minor:17000}],renewable:true},
  {id:3,name:'限时免费套餐',content:'',tags:[],traffic_limit_bytes:1*1073741824,speed_limit_mbps:null,device_limit:null,capacity_limit:null,reset_traffic_method:null,prices:[],renewable:false}
 ];
 await page.route('**/txapi/**',async route=>{
  const url=new URL(route.request().url());
  const path=url.pathname;
  const fixtures={
   '/txapi/public/site-config':{app_name:'套餐测试',frontend_theme:'vv-theme',theme_config:{
    shop_default_period:'yearly',shop_featured_ids:'2',
    shop_compare_enabled:'1',shop_show_savings:'1',notice_popup_enabled:'0'
   }},
   '/txapi/auth/login':{auth_data:'Bearer purchase-test-token'},
   '/txapi/me':{id:901,email:'shop@example.test',plan_id:0},
   '/txapi/plans':plans,
   '/txapi/notices':[],
   '/txapi/me/subscription':{plan_id:0},
   '/txapi/me/dashboard-stats':[],
   '/txapi/orders':[],
   '/txapi/orders/ORDER-SERVER-01/detail':{id:1,trade_no:'ORDER-SERVER-01',status:0,plan:{id:1,name:'基础套餐',traffic_limit_bytes:100*1073741824},amount_minor:8500,period:'yearly',type:0,plan_id:1,payment_id:null,paid_at:null,created_at:'2026-01-01T00:00:00+00:00'},
   '/txapi/billing/payment-methods':[{id:5,name:'测试支付',provider:'MockPay',icon:null,fee_fixed_minor:0,fee_percent:0}]
  };
  if(path==='/txapi/orders'&&route.request().method()==='POST'){
   checkoutRequests.push(JSON.parse(route.request().postData()||'{}'));
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap({trade_no:'ORDER-SERVER-01'}))});
   return;
  }
  if(path==='/txapi/billing/coupons/check'){
   checkoutRequests.push({coupon:JSON.parse(route.request().postData()||'{}')});
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap({id:1,name:'秋季优惠',code:'AUTUMN',type:2,value_minor:null,percent:15}))});
   return;
  }
  if(path==='/txapi/plans/1'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(plans[0]))});return}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(fixtures[path]??[]))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('shop@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'购买套餐'}).click();
 const shop=page.getByRole('region',{name:'套餐商店'});
 await expect(shop).toBeVisible();
 await expect(shop.getByRole('region',{name:'周期订阅'})).toBeVisible();
 await expect(shop.getByRole('region',{name:'按量付费'})).toHaveCount(0);
 await expect(shop.getByRole('group',{name:'套餐周期'})).toHaveCount(0);
 await expect(page.locator('[data-plan-id="3"]')).toHaveCount(0);
 await expect(page.locator('[data-plan-id="2"] .live-shop-recommend')).toContainText('精选套餐');
 await expect(page.locator('[data-plan-id="1"] .live-shop-price')).toContainText('¥10.00');
 await expect(page.locator('[data-plan-id="1"] .live-shop-saving')).toHaveCount(0);
 await shop.getByRole('checkbox',{name:'对比 基础套餐'}).check();
 await shop.getByRole('checkbox',{name:'对比 旗舰套餐'}).check();
 await shop.getByRole('button',{name:/套餐对比/}).click();
 await expect(shop.getByRole('table',{name:'已选套餐对比'})).toBeVisible();
 await expect(shop.getByRole('table',{name:'已选套餐对比'})).toContainText('200 GB');
 await page.locator('[data-plan-id="1"]').getByRole('button',{name:/立即购买/}).click();
 const purchase=page.getByRole('dialog',{name:'购买 基础套餐'});
 await expect(purchase).toBeVisible();
 await expect(purchase.getByRole('radio',{name:/月付/})).toBeChecked();
 await expect(purchase.getByLabel('订单基础价格')).toContainText('¥10.00');
 await purchase.getByRole('radio',{name:/年付/}).check();
 await expect(purchase.getByLabel('订单基础价格')).toContainText('¥90.00');
 await expect(purchase).toContainText('¥30.00');
 await purchase.getByLabel('优惠码').fill('AUTUMN');
 await purchase.getByRole('button',{name:'验证优惠码'}).click();
 await expect(purchase).toContainText('已验证优惠码');
 await purchase.getByRole('radio',{name:/月付/}).check();
 await expect(purchase).not.toContainText('已验证优惠码');
 await purchase.getByRole('radio',{name:/年付/}).check();
 await purchase.getByRole('button',{name:/确认并创建订单/}).click();
 await expect(page.getByRole('dialog',{name:'订单详情'})).toBeVisible();
 await expect(page.getByRole('dialog',{name:'订单详情'})).toContainText('¥85.00');
 const order=checkoutRequests.find(x=>x.plan_id===1);
 expect(order).toEqual({plan_id:1,period:'yearly',coupon_code:'AUTUMN'});
 const coupon=checkoutRequests.find(x=>x.coupon)?.coupon;
 expect(coupon).toEqual({code:'AUTUMN',plan_id:1,period:'yearly'});
});

test('mobile subscription categories remain scroll-safe without period filters',async({page})=>{
 const plans=[
  {id:1,name:'月付方案',content:'',tags:[],traffic_limit_bytes:40*1073741824,speed_limit_mbps:null,device_limit:null,capacity_limit:null,reset_traffic_method:null,prices:[{period:'monthly',amount_minor:1200}],renewable:true},
  {id:2,name:'一次性方案',content:'',tags:[],traffic_limit_bytes:60*1073741824,speed_limit_mbps:null,device_limit:null,capacity_limit:null,reset_traffic_method:null,prices:[{period:'onetime',amount_minor:3000}],renewable:false},
  {id:3,name:'年付方案',content:'',tags:[],traffic_limit_bytes:90*1073741824,speed_limit_mbps:null,device_limit:null,capacity_limit:null,reset_traffic_method:null,prices:[{period:'yearly',amount_minor:9900}],renewable:true}
 ];
 await page.setViewportSize({width:390,height:844});
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/txapi/public/site-config':{app_name:'手机商店',frontend_theme:'vv-theme',theme_config:{shop_default_period:'all',notice_popup_enabled:'0'}},
   '/txapi/auth/login':{auth_data:'Bearer mobile-shop-token'},
   '/txapi/me':{id:902,email:'mobile-shop@example.test'},
   '/txapi/plans':plans,
   '/txapi/me/subscription':{},
   '/txapi/me/dashboard-stats':[],
   '/txapi/notices':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(fixtures[path]??[]))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('mobile-shop@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await page.getByRole('navigation',{name:'移动端导航'}).getByRole('button',{name:'购买套餐'}).click();
 const shop=page.getByRole('region',{name:'套餐商店'});
 await expect(shop.locator('.live-shop-plan')).toHaveCount(3);
 const recurring=shop.getByRole('region',{name:'周期订阅'});
 const traffic=shop.getByRole('region',{name:'按量付费'});
 await expect(recurring.locator('.live-shop-plan')).toHaveCount(2);
 await expect(traffic.locator('.live-shop-plan')).toHaveCount(1);
 await expect(traffic.locator('.live-shop-plan')).toContainText('一次性方案');
 await expect(shop.getByRole('group',{name:'套餐周期'})).toHaveCount(0);
 await traffic.locator('.live-shop-plan').getByRole('button',{name:/立即购买/}).click();
 const purchase=page.getByRole('dialog',{name:'购买 一次性方案'});
 await expect(purchase.getByRole('radio',{name:/一次性/})).toBeChecked();
 await expect(purchase.getByLabel('订单基础价格')).toContainText('¥30.00');
 await page.keyboard.press('Escape');
 await expect(shop.locator('.live-shop-plan')).toHaveCount(3);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});


test('subscription center shows verified usage, OS import choices and manual credential controls',async({page})=>{
 const now=Math.floor(Date.now()/1000);
 let calls=0;
 await page.setViewportSize({width:390,height:844});
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/txapi/public/site-config':{frontend_theme:'vv-theme',app_name:'测试订阅',theme_config:{notice_popup_enabled:'0',subscription_client_guide:'1'}},
   '/txapi/auth/login':{auth_data:'Bearer subs-test-token'},
   '/txapi/me':{id:400,email:'subscriber@example.test',plan_id:9},
   '/txapi/me/subscription':{plan:{id:9,name:'高级订阅',traffic_limit_bytes:100*1073741824},traffic_limit_bytes:100*1073741824,upload_bytes:10*1073741824,download_bytes:25*1073741824,
    expired_at:new Date(now*1000+86400*20000).toISOString(),reset_day:5,next_reset_at:null,
    subscribe_url:'https://panel.example.test/txapi/client/subscribe?token=secret'},
   '/txapi/plans':[],
   '/txapi/me/dashboard-stats':[],
   '/txapi/notices':[]
  };
  if(path==='/txapi/me/subscription')calls++;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(fixtures[path]??[]))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('subscriber@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 const summary=page.getByRole('region',{name:'已购套餐'});
 await expect(summary).toContainText('高级订阅');
 await expect(summary).toContainText('65.00 GB');
 await expect(summary.getByRole('progressbar',{name:'套餐流量使用比例'})).toHaveAttribute('aria-valuenow','35');
 await expect(summary).toContainText('到期时间');
 const importer=page.getByRole('region',{name:'客户端与订阅导入'});
 await expect(page.getByRole('region',{name:'账户欢迎卡片'})).not.toContainText('剩余流量');
 await expect(importer.getByRole('img',{name:'订阅二维码'})).toBeVisible();
 await expect(importer).not.toContainText('token=secret');
 await importer.getByRole('button',{name:'显示订阅链接'}).click();
 await expect(importer).toContainText('token=secret');
 await importer.getByRole('button',{name:'隐藏订阅链接'}).click();
 await expect(importer).not.toContainText('token=secret');
 await importer.getByRole('button',{name:'iOS'}).click();
 await expect(importer.getByRole('button',{name:/Shadowrocket/})).toBeVisible();
 await importer.getByRole('button',{name:'Android'}).click();
 await expect(importer.getByRole('button',{name:/Shadowrocket/})).toHaveCount(0);
 await expect(importer.getByRole('button',{name:/Surfboard/})).toBeVisible();
 await summary.getByRole('button',{name:'刷新用量'}).click();
 await expect(page.getByRole('status')).toContainText('订阅与流量数据已刷新');
 expect(calls).toBeGreaterThanOrEqual(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
});

test('reset-traffic shortcut requires a server-priced plan and posts reset_price (not renewal)',async({page})=>{
 const now=Math.floor(Date.now()/1000),orders=[];
 await page.route('**/txapi/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  const fixtures={
   '/txapi/public/site-config':{app_name:'流量重置',frontend_theme:'vv-theme',theme_config:{notice_popup_enabled:'0'}},
   '/txapi/auth/login':{auth_data:'Bearer reset-test-token'},
   '/txapi/me':{id:410,email:'reset@example.test',plan_id:7},
   '/txapi/me/subscription':{plan:{id:7,name:'专属套餐',traffic_limit_bytes:50*1073741824},traffic_limit_bytes:50*1073741824,upload_bytes:20*1073741824,download_bytes:10*1073741824,expired_at:new Date(now*1000+86400*12000).toISOString(),reset_day:null,next_reset_at:null},
   '/txapi/notices':[],
   '/txapi/me/dashboard-stats':[],
   '/txapi/orders':[],
   '/txapi/orders/RESET-01/detail':{id:1,trade_no:'RESET-01',status:0,amount_minor:500,period:'reset_traffic',type:0,plan_id:7,plan:{id:7,name:'专属套餐',traffic_limit_bytes:50*1073741824},payment_id:null,paid_at:null,created_at:'2026-01-01T00:00:00+00:00'},
   '/txapi/billing/payment-methods':[]
  };
  if(path==='/txapi/plans/7'){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap({id:7,name:'专属套餐',content:'',tags:[],traffic_limit_bytes:50*1073741824,speed_limit_mbps:null,device_limit:null,capacity_limit:null,reset_traffic_method:1,prices:[{period:'monthly',amount_minor:1500},{period:'reset_traffic',amount_minor:500}],renewable:true}))});
   return;
  }
  if(path==='/txapi/plans'){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap([{id:7,name:'专属套餐',content:'',tags:[],traffic_limit_bytes:50*1073741824,speed_limit_mbps:null,device_limit:null,capacity_limit:null,reset_traffic_method:1,prices:[{period:'monthly',amount_minor:1500},{period:'reset_traffic',amount_minor:500}],renewable:true}]))});
   return;
  }
  if(path==='/txapi/orders'&&route.request().method()==='POST'){
   orders.push(JSON.parse(route.request().postData()));
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap({trade_no:'RESET-01'}))});
   return;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(fixtures[path]??[]))});
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('reset@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await page.getByRole('region',{name:'已购套餐'}).getByRole('button',{name:'重置流量'}).click();
 const form=page.getByRole('dialog',{name:'购买 专属套餐'});
 await expect(form).toBeVisible();
 await expect(form).toContainText('不会延长套餐有效期');
 await expect(form.getByLabel('订单基础价格')).toContainText('¥5.00');
 await form.getByRole('button',{name:/确认并创建订单/}).click();
 await expect(page.getByRole('dialog',{name:'订单详情'})).toBeVisible();
 expect(orders).toEqual([{plan_id:7,period:'reset_traffic'}]);
});

test('expired subscriptions cannot start a traffic reset, and operator can hide import guide',async({page})=>{
 const now=Math.floor(Date.now()/1000);
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const data={
   '/txapi/public/site-config':{app_name:'过期订阅',frontend_theme:'vv-theme',theme_config:{
    notice_popup_enabled:'0',subscription_client_guide:'0',subscription_reset_action:'1'
   }},
   '/txapi/auth/login':{auth_data:'Bearer expired-test-token'},
   '/txapi/me':{id:420,email:'old@example.test',plan_id:3},
   '/txapi/me/subscription':{plan:{id:3,name:'旧套餐',traffic_limit_bytes:10*1073741824},traffic_limit_bytes:10*1073741824,upload_bytes:10*1073741824,download_bytes:0,expired_at:new Date(now*1000-86400000).toISOString(),next_reset_at:null,
    subscribe_url:'https://panel.example.test/txapi/client/subscribe?token=secret'},
   '/txapi/notices':[],
   // Non-renewable catalog entry: the expired plan must not offer renewal.
   '/txapi/plans':[{id:3,name:'旧套餐',content:'',tags:[],traffic_limit_bytes:10*1073741824,speed_limit_mbps:null,device_limit:null,capacity_limit:null,reset_traffic_method:1,prices:[{period:'monthly',amount_minor:1000}],renewable:false}],
   '/txapi/me/dashboard-stats':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(data[path]??[]))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('old@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 const summary=page.getByRole('region',{name:'已购套餐'});
 await expect(summary).toContainText('已到期');
 await expect(summary.getByRole('button',{name:'重置流量'})).toHaveCount(0);
 await expect(summary.getByRole('button',{name:'续费当前套餐'})).toHaveCount(0);
 await expect(page.getByRole('group',{name:'选择客户端平台'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'复制订阅链接'})).toBeVisible();
});
