import {test,expect} from '@playwright/test';

const response=data=>({status:'success',data});
const notices=[{id:91,title:'键盘焦点测试',content:'<p>安全内容</p>',created_at:1770000000,updated_at:1770000000,popup:0}];

async function mockApi(page,{noticesData=notices,guest={}}={}){
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  const payload={
   '/api/v1/guest/comm/config':{app_name:'主题安全回归',frontend_theme:'vv-theme',theme_config:{notice_popup_enabled:'0'},is_captcha:0,...guest},
   '/api/v1/passport/auth/token2Login':{auth_data:'one-time-token'},
   '/api/v1/passport/auth/login':{auth_data:'manual-token'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{id:950,email:'focus@example.test',plan_id:0},
   '/api/v1/user/notice/fetch':{data:noticesData,total:noticesData.length},
   '/api/v1/user/getSubscribe':{},
   '/api/v1/user/plan/fetch':[],
   '/api/v1/user/getStat':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response(payload[path]??[]))});
 });
}

test('single-use login code is removed from address bar while token exchange still succeeds',async({page})=>{
 const called=[];
 await mockApi(page);
 page.on('request',req=>{if(req.url().includes('/token2Login'))called.push(req.url())});
 await page.goto('/#/login?verify=SECRET_ONCE_123&tab=login');
 await expect(page.getByRole('heading',{name:'欢迎回来'})).toHaveCount(0);
 await expect(page.getByRole('region',{name:'订阅概览'})).toBeVisible();
 expect(called).toHaveLength(1);
 expect(called[0]).toContain('verify=SECRET_ONCE_123');
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
