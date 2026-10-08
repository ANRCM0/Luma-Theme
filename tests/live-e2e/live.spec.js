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
 await expect(page.getByRole('dialog',{name:'重要通知'})).toBeVisible();
 await page.getByRole('dialog',{name:'重要通知'}).getByRole('button',{name:'我知道了'}).click();
 announcements=[{id:25,title:'新发布公告',content:'新内容',created_at:1700001000,updated_at:1700001001},...announcements];
 await page.reload();
 await expect(page.getByRole('dialog',{name:'重要通知'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'新发布公告'})).toBeVisible();
});
