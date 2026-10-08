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
