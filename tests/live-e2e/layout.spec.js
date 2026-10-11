import {test,expect} from '@playwright/test';

const title='Luma 国际网络与订阅服务管理平台 — Very Long Site Name for a Narrow Mobile Header';
const wrap=data=>({data,request_id:'req-layout'});

async function login(page,layout){
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const data={
   '/txapi/public/site-config':{frontend_theme:'vv-theme',app_name:title,is_captcha:0,theme_config:{layout_mode:layout,notice_popup_enabled:'0'}},
   '/txapi/auth/login':{auth_data:'Bearer responsive-qa'},
   '/txapi/me':{id:501,email:'layout@example.test',plan_id:0,balance_minor:0},
   '/txapi/me/subscription':{subscribe_url:'https://sub.example.test/qa/abc',plan:null,traffic_limit_bytes:0,upload_bytes:0,download_bytes:0,expired_at:null},
   '/txapi/plans':[],
   '/txapi/notices':[],
   '/txapi/me/dashboard-stats':[]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(data[path]??[]))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('layout@example.test');
 await page.getByLabel('登录密码').fill('password123');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.getByRole('region',{name:'账户欢迎卡片'})).toBeVisible();
}

for(const layout of ['top','sidebar']){
 test(`responsive ${layout} layout keeps long site title, action buttons and client grid inside viewport`,async({page})=>{
  await login(page,layout);
  for(const {width,height} of [
   {width:320,height:667},{width:375,height:667},{width:390,height:844},
   {width:720,height:900},{width:768,height:900},{width:1024,height:768},
   {width:1440,height:900}
  ]){
   await page.setViewportSize({width,height});
   const metrics=await page.evaluate(()=>{
    const brand=document.querySelector('.live-portal .top .brand');
    const name=document.querySelector('.live-portal .top .brand-title');
    const actions=document.querySelector('.live-portal .top .head-actions');
    const list=document.querySelector('.live-portal .live-client-list');
    const nav=document.querySelector('.live-portal .mobile-nav');
    const b=brand.getBoundingClientRect(),a=actions.getBoundingClientRect();
    const container=list.getBoundingClientRect();
    const buttons=[...list.querySelectorAll('button')].map(el=>el.getBoundingClientRect());
    return {
     documentOverflow:document.documentElement.scrollWidth-window.innerWidth,
     title:name?.getAttribute('title'),
     ellipsis:getComputedStyle(name).textOverflow,
     titleWidth:name.getBoundingClientRect().width,
     brandRight:b.right,
     actionsLeft:a.left,
     actionRight:a.right,
     clientDisplay:getComputedStyle(list).display,
     clientColumns:getComputedStyle(list).gridTemplateColumns.split(' ').length,
     navLastVisible:(()=>{const nav=document.querySelector('.top .desktop-nav');const last=nav?.querySelector('button:last-child');return !nav||!last||last.getBoundingClientRect().right<=nav.getBoundingClientRect().right+1})(),
     clientBoundsValid:buttons.every(rect=>rect.left>=container.left-1&&rect.right<=container.right+1),
     clientMinWidth:Math.min(...buttons.map(rect=>rect.width)),
     mobileNavDisplay:getComputedStyle(nav).display
    };
   });
   expect(metrics.documentOverflow,`${layout} ${width}px page overflow`).toBeLessThanOrEqual(1);
   expect(metrics.title).toBe(title);
   expect(metrics.ellipsis).toBe('ellipsis');
   expect(metrics.titleWidth).toBeGreaterThan(0);
   expect(metrics.brandRight,`${layout} ${width}px header overlap`).toBeLessThanOrEqual(metrics.actionsLeft+1);
   expect(metrics.actionRight).toBeLessThanOrEqual(width+1);
   expect(metrics.clientBoundsValid,`${layout} ${width}px client item overflow`).toBe(true);
   if(width<=720){
    expect(metrics.clientDisplay).toBe('grid');
    expect(metrics.clientMinWidth).toBeGreaterThanOrEqual(108);
    if(width<=390)expect(metrics.clientColumns,`${layout} ${width}px client columns`).toBeGreaterThanOrEqual(2);
    expect(metrics.mobileNavDisplay).not.toBe('none');
   }else{
    expect(metrics.clientDisplay).toBe('flex');
    if(layout==='top'&&width>=768)expect(metrics.navLastVisible,`${width}px last navigation entry is clipped`).toBe(true);
    expect(metrics.mobileNavDisplay).toBe('none');
   }
  }
  await page.setViewportSize({width:320,height:667});
  await page.getByRole('button',{name:'切换主题'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 });
}
