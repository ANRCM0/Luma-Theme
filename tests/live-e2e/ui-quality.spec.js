import {test,expect} from '@playwright/test';

const wrapped=data=>({data,request_id:'req-ui'});
async function logInToPreview(page){
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const values={
   '/txapi/public/site-config':{frontend_theme:'vv-theme',app_name:'Luma UI QA',is_captcha:0,register_enable:1,theme_config:{notice_popup_enabled:'0'}},
   '/txapi/auth/login':{auth_data:'Bearer ui-qa-token'},
   '/txapi/me':{id:421,email:'qa@example.test',plan_id:0,balance_minor:0},
   '/txapi/me/subscription':{subscribe_url:'https://sub.example.test/qa/abc',plan:null,traffic_limit_bytes:0,upload_bytes:0,download_bytes:0,expired_at:null},
   '/txapi/plans':[],
   '/txapi/notices':[],
   '/txapi/me/dashboard-stats':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrapped(values[path]??[]))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('qa@example.test');
 await page.getByLabel('登录密码').fill('password123');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.getByRole('region',{name:'账户欢迎卡片'})).toBeVisible();
}
async function expectTapTarget(locator,minimum=44){
 const rect=await locator.boundingBox();
 expect(rect).not.toBeNull();
 expect(rect.width).toBeGreaterThanOrEqual(minimum);
 expect(rect.height).toBeGreaterThanOrEqual(minimum);
}

test('mobile dashboard keeps navigation, subscription and platform controls touchable',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await logInToPreview(page);
 const actions=page.locator('.live-portal .top .head-actions > button');
 expect(await actions.count()).toBeGreaterThan(0);
 for(const control of await actions.all())await expectTapTarget(control);
 const nav=page.locator('.live-portal .mobile-nav button');
 expect(await nav.count()).toBeGreaterThan(0);
 for(const control of await nav.all()){
  await expectTapTarget(control);
  const label=control.locator('span').first();
  const size=Number.parseFloat(await label.evaluate(el=>getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(11);
 }
 const subscription=page.getByRole('region',{name:'客户端与订阅导入'});
 for(const control of await subscription.locator('.live-subscription-link button').all())await expectTapTarget(control);
 for(const control of await subscription.locator('.live-client-platforms button').all())await expectTapTarget(control);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
});
