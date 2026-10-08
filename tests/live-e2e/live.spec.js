import {test,expect} from '@playwright/test';

test('theme requires the actual login endpoint and rejects login failures',async({page})=>{
 const paths=[];
 await page.route('**/api/v1/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   paths.push(path);
   const body=path==='/api/v1/guest/comm/config'
     ? {status:'success',data:{app_name:'测试站点',is_captcha:0,register_enable:1}}
     : {status:'fail',message:'账户或密码错误',data:false};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('/');
 await page.locator('input[type=email]').fill('sample@example.com');
 await page.locator('input[type=password]').fill('sample-password');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('账户或密码错误');
 expect(paths).toContain('/api/v1/passport/auth/login');
 await expect(page.getByText('WELCOME BACK')).toHaveCount(0);
});


test('mobile authentication keeps input text visible in light and dark themes',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  await route.fulfill({
   status:200,contentType:'application/json',
   body:JSON.stringify(path==='/api/v1/guest/comm/config'
    ?{status:'success',data:{app_name:'测试站点',is_captcha:0,register_enable:1,is_email_verify:1}}
    :{status:'fail',message:'仅供测试',data:false})
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
 await page.getByRole('button',{name:'显示密码'}).click();
 await expect(page.getByLabel('登录密码')).toHaveAttribute('type','text');
 await page.getByRole('button',{name:'隐藏密码'}).click();
 await expect(page.getByLabel('登录密码')).toHaveAttribute('type','password');
 await page.getByRole('button',{name:'切换主题'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await expect(email).toHaveCSS('color','rgb(242, 247, 250)');
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
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url());
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(
   url.pathname==='/api/v1/guest/comm/config'
    ?{status:'success',data:{
      app_name:'新版 TXBoard',frontend_theme:'vv-theme',
      theme_config:{theme_color:'black',background_url:'/images/welcome.webp'},
      is_captcha:0,register_enable:1
     }}
    :{status:'fail',message:'not signed in',data:false}
  )});
 });
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'欢迎回来'})).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('data-vv-accent','black');
 await expect(page.locator('.live-login')).toHaveCSS('background-image',/welcome[.]webp/);
 await expect(page.locator('.live-auth-submit')).toHaveCSS('background-color','rgb(38, 55, 70)');
 await expect(page.getByText('新版 TXBoard',{exact:true}).first()).toBeVisible();
});


test('new TXBoard announcements pop up after login, not as a dashboard card',async({page})=>{
 let announcements=[
  {id:22,title:'维护通知',content:'<p>今晚维护</p><p>预计十分钟</p>',created_at:1700000000,updated_at:1700000010},
  {id:20,title:'使用说明',content:'<strong>请保护账号</strong>',created_at:1690000000,updated_at:1690000001}
 ];
 const paths=[];
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  paths.push(path);
  let data;
  switch(path){
   case '/api/v1/guest/comm/config':data={app_name:'测试站点',is_captcha:0,register_enable:1};break;
   case '/api/v1/passport/auth/login':data={auth_data:'test-real-token'};break;
   case '/api/v1/user/checkLogin':data={is_login:true};break;
   case '/api/v1/user/info':data={id:51,email:'notices@example.test'};break;
   case '/api/v1/user/notice/fetch':data={data:announcements,total:announcements.length};break;
   case '/api/v1/user/plan/fetch':data=[];break;
   case '/api/v1/user/getSubscribe':data={};break;
   case '/api/v1/user/getStat':data=[];break;
   default:data=[];break;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data})});
 });
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('notices@example.test');
 await page.getByLabel('登录密码').fill('valid-pass');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'重要通知'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'维护通知'})).toBeVisible();
 await expect(page.getByText('今晚维护')).toBeVisible();
 expect(paths).toContain('/api/v1/user/notice/fetch');
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
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/api/v1/guest/comm/config':{app_name:'测试主题',frontend_theme:'vv-theme',theme_config:{
    notice_popup_enabled:'1',notice_center_enabled:'1',notice_popup_tag:'important',
    notice_popup_frequency:'once',notice_popup_scope:'all',notice_popup_style:'feature'
   }},
   '/api/v1/passport/auth/login':{auth_data:'token'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{id:77,email:'tags@example.test'},
   '/api/v1/user/notice/fetch':{data:announcements,total:2},
   '/api/v1/user/plan/fetch':[],
   '/api/v1/user/getSubscribe':{},
   '/api/v1/user/getStat':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:fixtures[path]??[]})});
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
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/api/v1/guest/comm/config':{frontend_theme:'vv-theme',app_name:'Test',theme_config:{
    notice_popup_enabled:'0',notice_center_enabled:'0'
   }},
   '/api/v1/passport/auth/login':{auth_data:'token'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{id:78,email:'disabled@example.test'},
   '/api/v1/user/notice/fetch':{data:[{id:1,title:'公告',content:'内容'}],total:1},
   '/api/v1/user/plan/fetch':[],
   '/api/v1/user/getSubscribe':{},
   '/api/v1/user/getStat':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:fixtures[path]??[]})});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('disabled@example.test');
 await page.getByLabel('登录密码').fill('valid-password');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.locator('[data-welcome-state="no_plan"]')).toBeVisible();
 await expect(page.getByRole('dialog',{name:'重要通知'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'查看通知'})).toHaveCount(0);
});


test('sidebar layout renders sorted desktop links with collapse control and safe business routing',async({page})=>{
 await page.setViewportSize({width:1280,height:900});
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/api/v1/guest/comm/config':{app_name:'布局测试站',frontend_theme:'vv-theme',theme_config:{
    layout_mode:'sidebar',sidebar_collapsed_default:'1',
    nav_items:'ticket,orders,!shop,menu,dashboard,!profile',notice_popup_enabled:'0'
   }},
   '/api/v1/passport/auth/login':{auth_data:'signed-token'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{id:701,email:'sidebar@example.test'},
   '/api/v1/user/plan/fetch':[],
   '/api/v1/user/notice/fetch':{data:[],total:0},
   '/api/v1/user/getStat':[],
   '/api/v1/user/getSubscribe':{},
   '/api/v1/user/order/fetch':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:fixtures[path]??[]})});
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
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/api/v1/guest/comm/config':{app_name:'移动布局',frontend_theme:'vv-theme',theme_config:{
    layout_mode:'sidebar',nav_items:'orders,ticket,!shop,!profile,dashboard,menu',notice_popup_enabled:'0'
   }},
   '/api/v1/passport/auth/login':{auth_data:'signed-token'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{id:702,email:'mobile@example.test'},
   '/api/v1/user/plan/fetch':[],
   '/api/v1/user/notice/fetch':{data:[],total:0},
   '/api/v1/user/getStat':[],
   '/api/v1/user/getSubscribe':{},
   '/api/v1/user/order/fetch':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:fixtures[path]??[]})});
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
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/api/v1/guest/comm/config':{app_name:'欢迎测试',frontend_theme:'vv-theme',is_captcha:0,theme_config:{
    welcome_enabled:'1',welcome_new_hours:48,welcome_secondary_card:'wallet',notice_popup_enabled:'0'
   }},
   '/api/v1/passport/auth/login':{auth_data:'welcome-session'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{email:'fresh@example.test',created_at:now-3600,plan_id:0,balance:3450},
   '/api/v1/user/getSubscribe':{plan_id:0,transfer_enable:0,expired_at:0,u:0,d:0},
   '/api/v1/user/plan/fetch':[],
   '/api/v1/user/notice/fetch':{data:[],total:0},
   '/api/v1/user/getStat':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:fixtures[path]??[]})});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('fresh@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 const welcome=page.locator('[data-welcome-state="new"]');
 await expect(welcome).toBeVisible();
 await expect(welcome.getByRole('heading',{name:/欢迎加入/})).toBeVisible();
 await expect(welcome.getByRole('button',{name:/挑选入门套餐/})).toBeVisible();
 await expect(page.getByRole('region',{name:'账户余额'})).toBeVisible();
 await expect(welcome.getByText('尚未订阅')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
});

test('subscriptions near expiry use a renewal message and usable traffic metrics',async({page})=>{
 const now=Math.floor(Date.now()/1000);
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/api/v1/guest/comm/config':{app_name:'订阅提醒',frontend_theme:'vv-theme',is_captcha:0,theme_config:{
    welcome_enabled:'1',welcome_expiry_hours:'72',welcome_secondary_card:'usage',notice_popup_enabled:'0'
   }},
   '/api/v1/passport/auth/login':{auth_data:'welcome-session'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{email:'expiring@example.test',created_at:now-30*86400,plan_id:3},
   '/api/v1/user/getSubscribe':{plan_id:3,plan:{id:3,name:'高级套餐',transfer_enable:100},
    transfer_enable:100*1073741824,u:60*1073741824,d:35*1073741824,expired_at:now+36*3600,reset_day:15},
   '/api/v1/user/plan/fetch':[],
   '/api/v1/user/notice/fetch':{data:[],total:0},
   '/api/v1/user/getStat':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:fixtures[path]??[]})});
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
 await welcome.getByRole('button',{name:/查看续费方案/}).click();
 await expect(page.getByRole('heading',{name:'购买套餐'})).toBeVisible();
});

test('fully depleted plans show an upgrade action before other warnings',async({page})=>{
 const now=Math.floor(Date.now()/1000);
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/api/v1/guest/comm/config':{app_name:'流量提醒',frontend_theme:'vv-theme',is_captcha:0,theme_config:{
    welcome_enabled:'1',welcome_secondary_card:'recommend',notice_popup_enabled:'0'
   }},
   '/api/v1/passport/auth/login':{auth_data:'welcome-session'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{email:'noquota@example.test',created_at:now-30*86400,plan_id:4},
   '/api/v1/user/getSubscribe':{plan_id:4,plan:{id:4,name:'普通套餐',transfer_enable:10},
    transfer_enable:10*1073741824,u:4*1073741824,d:6*1073741824,expired_at:now+48*3600},
   '/api/v1/user/plan/fetch':[],
   '/api/v1/user/notice/fetch':{data:[],total:0},
   '/api/v1/user/getStat':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:fixtures[path]??[]})});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('noquota@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 const welcome=page.locator('[data-welcome-state="exhausted"]');
 await expect(welcome.getByRole('heading',{name:/流量已用完/})).toBeVisible();
 await expect(welcome.getByRole('button',{name:/查看升级套餐/})).toBeVisible();
});


test('shop compares period prices and creates an order only after server-side confirmation',async({page})=>{
 const checkoutRequests=[];
 const plans=[
  {id:1,name:'基础套餐',show:true,sell:true,transfer_enable:100,device_limit:3,
   month_price:1000,year_price:9000,quarter_price:2800,content:'<p>快速连接</p>'},
  {id:2,name:'旗舰套餐',show:true,sell:true,transfer_enable:200,device_limit:5,
   month_price:2000,year_price:17000,content:'覆盖多种终端'},
  {id:3,name:'限时免费套餐',show:false,sell:false,transfer_enable:1,month_price:0}
 ];
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url());
  const path=url.pathname;
  const fixtures={
   '/api/v1/guest/comm/config':{app_name:'套餐测试',frontend_theme:'vv-theme',theme_config:{
    shop_default_period:'year_price',shop_featured_ids:'2',
    shop_compare_enabled:'1',shop_show_savings:'1',notice_popup_enabled:'0'
   }},
   '/api/v1/passport/auth/login':{auth_data:'purchase-test-token'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{id:901,email:'shop@example.test',plan_id:0},
   '/api/v1/user/plan/fetch':plans,
   '/api/v1/user/notice/fetch':{data:[],total:0},
   '/api/v1/user/getSubscribe':{plan_id:0},
   '/api/v1/user/getStat':[],
   '/api/v1/user/order/fetch':[],
   '/api/v1/user/order/detail':{trade_no:'ORDER-SERVER-01',status:0,plan:{id:1,name:'基础套餐'},total_amount:8500,period:'year_price'},
   '/api/v1/user/order/getPaymentMethod':[{id:5,name:'测试支付',handling_fee_percent:0,handling_fee_fixed:0}]
  };
  if(path==='/api/v1/user/order/save'){
   checkoutRequests.push(JSON.parse(route.request().postData()||'{}'));
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:'ORDER-SERVER-01'})});
   return;
  }
  if(path==='/api/v1/user/coupon/check'){
   checkoutRequests.push({coupon:JSON.parse(route.request().postData()||'{}')});
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:{type:2,value:15}})});
   return;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:fixtures[path]??[]})});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('shop@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'购买套餐'}).click();
 const shop=page.getByRole('region',{name:'套餐商店'});
 await expect(shop).toBeVisible();
 await expect(shop.getByRole('button',{name:'年付',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-plan-id="3"]')).toHaveCount(0);
 await expect(page.locator('[data-plan-id="2"] .live-shop-recommend')).toContainText('精选套餐');
 await expect(page.locator('[data-plan-id="1"] .live-shop-price')).toContainText('¥90.00');
 await expect(page.locator('[data-plan-id="1"] .live-shop-saving')).toContainText('¥30.00');
 await shop.getByRole('checkbox',{name:'对比 基础套餐'}).check();
 await shop.getByRole('checkbox',{name:'对比 旗舰套餐'}).check();
 await shop.getByRole('button',{name:/套餐对比/}).click();
 await expect(shop.getByRole('table',{name:'已选套餐对比'})).toBeVisible();
 await expect(shop.getByRole('table',{name:'已选套餐对比'})).toContainText('200 GB');
 await page.locator('[data-plan-id="1"]').getByRole('button',{name:/选择这个套餐/}).click();
 const purchase=page.getByRole('dialog',{name:'购买 基础套餐'});
 await expect(purchase).toBeVisible();
 await expect(purchase.getByRole('radio',{name:/年付/})).toBeChecked();
 await expect(purchase.getByLabel('订单基础价格')).toContainText('¥90.00');
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
 expect(order).toEqual({plan_id:1,period:'year_price',coupon_code:'AUTUMN'});
 const coupon=checkoutRequests.find(x=>x.coupon)?.coupon;
 expect(coupon).toEqual({code:'AUTUMN',plan_id:1,period:'year_price'});
});

test('mobile plan filter and comparison remain scroll-safe',async({page})=>{
 const plans=[
  {id:1,name:'月付方案',show:true,sell:true,month_price:1200,transfer_enable:40},
  {id:2,name:'一次性方案',show:true,sell:true,onetime_price:3000,transfer_enable:60},
  {id:3,name:'年付方案',show:true,sell:true,year_price:9900,transfer_enable:90}
 ];
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/api/v1/guest/comm/config':{app_name:'手机商店',frontend_theme:'vv-theme',theme_config:{shop_default_period:'all',notice_popup_enabled:'0'}},
   '/api/v1/passport/auth/login':{auth_data:'mobile-shop-token'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{id:902,email:'mobile-shop@example.test'},
   '/api/v1/user/plan/fetch':plans,
   '/api/v1/user/getSubscribe':{},
   '/api/v1/user/getStat':[],
   '/api/v1/user/notice/fetch':{data:[],total:0}
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:fixtures[path]??[]})});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('mobile-shop@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await page.getByRole('navigation',{name:'移动端导航'}).getByRole('button',{name:'购买套餐'}).click();
 const shop=page.getByRole('region',{name:'套餐商店'});
 await expect(shop.locator('.live-shop-plan')).toHaveCount(3);
 await shop.getByRole('button',{name:'一次性',exact:true}).click();
 await expect(shop.locator('.live-shop-plan')).toHaveCount(1);
 await expect(shop.locator('.live-shop-plan')).toContainText('一次性方案');
 await shop.getByRole('button',{name:'全部周期'}).click();
 await expect(shop.locator('.live-shop-plan')).toHaveCount(3);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});


test('subscription center shows verified usage, OS import choices and manual credential controls',async({page})=>{
 const now=Math.floor(Date.now()/1000);
 let calls=0;
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const fixtures={
   '/api/v1/guest/comm/config':{frontend_theme:'vv-theme',app_name:'测试订阅',theme_config:{notice_popup_enabled:'0',subscription_client_guide:'1'}},
   '/api/v1/passport/auth/login':{auth_data:'subs-test-token'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{id:400,email:'subscriber@example.test',plan_id:9},
   '/api/v1/user/getSubscribe':{plan_id:9,plan:{id:9,name:'高级订阅',renew:true,reset_traffic_method:1},
    transfer_enable:100*1073741824,u:10*1073741824,d:25*1073741824,
    expired_at:now+86400*20,reset_day:5,
    subscribe_url:'https://panel.example.test/api/v1/client/subscribe?token=secret'},
   '/api/v1/user/plan/fetch':[],
   '/api/v1/user/getStat':[],
   '/api/v1/user/notice/fetch':{data:[],total:0}
  };
  if(path==='/api/v1/user/getSubscribe')calls++;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:fixtures[path]??[]})});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('subscriber@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await page.locator('.live-subscription-extra summary').click();
 const summary=page.getByRole('region',{name:'订阅概览'});
 await expect(summary).toContainText('高级订阅');
 await expect(summary).toContainText('65.00 GB');
 await expect(summary.getByRole('progressbar',{name:'流量使用比例'})).toHaveAttribute('aria-valuenow','35');
 await expect(summary).toContainText('约 5 天后');
 const importer=page.getByRole('region',{name:'客户端与订阅导入'});
 await expect(page.getByRole('region',{name:'已购套餐'})).toContainText('高级订阅');
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
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  const fixtures={
   '/api/v1/guest/comm/config':{app_name:'流量重置',frontend_theme:'vv-theme',theme_config:{notice_popup_enabled:'0'}},
   '/api/v1/passport/auth/login':{auth_data:'reset-test-token'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{id:410,email:'reset@example.test',plan_id:7},
   '/api/v1/user/getSubscribe':{plan_id:7,plan:{id:7,name:'专属套餐',renew:true,reset_traffic_method:1},
    transfer_enable:50*1073741824,u:20*1073741824,d:10*1073741824,expired_at:now+86400*12},
   '/api/v1/user/notice/fetch':{data:[],total:0},
   '/api/v1/user/getStat':[],
   '/api/v1/user/order/fetch':[],
   '/api/v1/user/order/detail':{trade_no:'RESET-01',status:0,total_amount:500,period:'reset_price',plan:{id:7,name:'专属套餐'}},
   '/api/v1/user/order/getPaymentMethod':[]
  };
  if(path==='/api/v1/user/plan/fetch'){
   const result=url.searchParams.get('id')==='7'
    ?{id:7,name:'专属套餐',renew:true,reset_price:500,month_price:1500}:[];
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:result})});
   return;
  }
  if(path==='/api/v1/user/order/save'){
   orders.push(JSON.parse(route.request().postData()));
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:'RESET-01'})});
   return;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:fixtures[path]??[]})});
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('reset@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await page.locator('.live-subscription-extra summary').click();
 await page.getByRole('region',{name:'订阅概览'}).getByRole('button',{name:'重置流量'}).click();
 const form=page.getByRole('dialog',{name:'购买 专属套餐'});
 await expect(form).toBeVisible();
 await expect(form).toContainText('不会延长套餐有效期');
 await expect(form.getByLabel('订单基础价格')).toContainText('¥5.00');
 await form.getByRole('button',{name:/确认并创建订单/}).click();
 await expect(page.getByRole('dialog',{name:'订单详情'})).toBeVisible();
 expect(orders).toEqual([{plan_id:7,period:'reset_price'}]);
});

test('expired subscriptions cannot start a traffic reset, and operator can hide import guide',async({page})=>{
 const now=Math.floor(Date.now()/1000);
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const data={
   '/api/v1/guest/comm/config':{app_name:'过期订阅',frontend_theme:'vv-theme',theme_config:{
    notice_popup_enabled:'0',subscription_client_guide:'0',subscription_reset_action:'1'
   }},
   '/api/v1/passport/auth/login':{auth_data:'expired-test-token'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{id:420,email:'old@example.test',plan_id:3},
   '/api/v1/user/getSubscribe':{plan_id:3,plan:{id:3,name:'旧套餐',renew:false,reset_traffic_method:1},
    transfer_enable:10*1073741824,u:10*1073741824,d:0,expired_at:now-86400,
    subscribe_url:'https://panel.example.test/api/v1/client/subscribe?token=secret'},
   '/api/v1/user/notice/fetch':{data:[],total:0},
   '/api/v1/user/plan/fetch':[],
   '/api/v1/user/getStat':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:data[path]??[]})});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('old@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await page.locator('.live-subscription-extra summary').click();
 const summary=page.getByRole('region',{name:'订阅概览'});
 await expect(summary).toContainText('已过期');
 await expect(summary.getByRole('button',{name:'重置流量'})).toHaveCount(0);
 await expect(summary.getByRole('button',{name:'续费当前套餐'})).toHaveCount(0);
 await expect(page.getByRole('group',{name:'选择客户端平台'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'复制订阅链接'})).toBeVisible();
});
