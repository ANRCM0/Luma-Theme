import {test,expect} from '@playwright/test';

const response=(data,requestId='req-e2e')=>({data,request_id:requestId});
const notices=[{id:91,title:'键盘焦点测试',content:'<p>安全内容</p>',created_at:1770000000,updated_at:1770000000,popup:0}];

async function mockApi(page,{noticesData=notices,guest={}}={}){
 await page.route('**/txapi/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  const payload={
   '/txapi/public/site-config':{app_name:'主题安全回归',frontend_theme:'vv-theme',theme_config:{notice_popup_enabled:'0'},is_captcha:0,...guest},
   '/txapi/auth/one-time-token':{auth_data:'Bearer one-time-token'},
   '/txapi/auth/login':{auth_data:'Bearer manual-token'},
   '/txapi/me':{id:950,email:'focus@example.test',plan_id:0},
   '/txapi/notices':noticesData,
   '/txapi/me/subscription':{},
   '/txapi/plans':[],
   '/txapi/me/dashboard-stats':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response(payload[path]??[]))});
 });
}

test('single-use login code is removed from address bar while token exchange still succeeds',async({page})=>{
 const called=[];
 await mockApi(page);
 page.on('request',req=>{if(req.url().includes('/auth/one-time-token'))called.push(req.postData()||'')});
 await page.goto('/#/login?verify=SECRET_ONCE_123&tab=login');
 await expect(page.getByRole('heading',{name:'欢迎回来'})).toHaveCount(0);
 await expect(page.getByRole('region',{name:'客户端与订阅导入'})).toBeVisible();
 expect(called).toHaveLength(1);
 // The one-time code travels in the POST body, never as a URL parameter.
 expect(called[0]).toContain('SECRET_ONCE_123');
 expect(await page.evaluate(()=>location.href.includes('SECRET_ONCE_123'))).toBe(false);
});

test('notice dialog traps keyboard focus, locks background scrolling and restores focus on close',async({page})=>{
 await mockApi(page);
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('focus@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 const trigger=page.getByRole('button',{name:'查看通知'});
 await trigger.focus();
 await trigger.click();
 const dialog=page.getByRole('dialog',{name:'公告中心'});
 await expect(dialog).toBeVisible();
 await expect(page.locator('body')).toHaveCSS('overflow','hidden');
 await expect(dialog.getByRole('button',{name:'关闭弹窗'})).toBeFocused();
 await page.keyboard.press('Shift+Tab');
 await expect(dialog.getByRole('button',{name:'关闭',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');
 await expect(dialog.getByRole('button',{name:'关闭弹窗'})).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(dialog).toHaveCount(0);
 await expect(page.locator('body')).not.toHaveCSS('overflow','hidden');
 await expect(trigger).toBeFocused();
});

test('unsafe notice media URLs are blocked and text remains escaped',async({page})=>{
 const special=[{id:2,title:'文本安全',content:'<script>window.bad_script = true</script><b>正常文本</b>',
  popup:0,img_url:'http://untrusted.example.test/track?token=unsafe',created_at:1770000000}];
 await mockApi(page,{noticesData:special});
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('focus@example.test');
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await page.getByRole('button',{name:'查看通知'}).click();
 const modal=page.getByRole('dialog',{name:'公告中心'});
 await expect(modal).toContainText('正常文本');
 await expect(modal.locator('.live-notice-image')).toHaveCount(0);
 expect(await page.evaluate(()=>window.bad_script===true)).toBe(false);
});
