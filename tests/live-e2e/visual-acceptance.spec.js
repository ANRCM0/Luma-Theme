import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const output='test-results/visual-qa';
const planTitle='跨平台专线与国际网络访问支持'.repeat(7);
const plan={
 id:88,name:planTitle,content:'面向日常与多终端使用的订阅方案',tags:['测试套餐'],
 traffic_limit_bytes:50*1073741824,speed_limit_mbps:null,device_limit:null,
 capacity_limit:null,reset_traffic_method:null,
 prices:[{period:'monthly',amount_minor:1200},{period:'yearly',amount_minor:12000}],renewable:true
};
const wrap=(data,meta)=>({data,...(meta?{meta}:{}),request_id:'visual-qa-test'});
const bill={id:23,trade_no:'VISUAL-QA-1',plan_id:88,plan,period:'monthly',
 type:0,status:0,amount_minor:1200,payment_id:null,paid_at:null,
 created_at:'2026-10-11T04:00:00Z'};

async function authenticate(page,{layout='top'}={}){
 const data={
  '/txapi/public/site-config':{
   frontend_theme:'vv-theme',app_name:'Luma 主题设计验收 — '+planTitle,
   is_captcha:0,register_enable:1,
   theme_config:{layout_mode:layout,notice_popup_enabled:'0'}
  },
  '/txapi/auth/login':{auth_data:'Bearer visual-qa-only'},
  '/txapi/me':{id:808,email:'visual-qa@example.test',plan_id:0,balance_minor:0},
  '/txapi/me/subscription':{
   plan:null,subscribe_url:'',traffic_limit_bytes:0,
   upload_bytes:0,download_bytes:0,expired_at:null
  },
  '/txapi/plans':[plan],'/txapi/notices':[],
  '/txapi/me/dashboard-stats':[],
  '/txapi/me/site-config':{},'/txapi/invites':{codes:[],stat:[0,0,0,0,0]},
  '/txapi/orders':[],
  '/txapi/tickets':[],
  '/txapi/billing/payment-methods':[{id:8,name:'模拟测试支付',payment:'EPay'}]
 };
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const method=route.request().method();
  let value=data[path]??[],meta;
  if(path==='/txapi/orders'&&method==='POST')value={trade_no:bill.trade_no};
  if(path===`/txapi/orders/${bill.trade_no}`||path===`/txapi/orders/${bill.trade_no}/detail`)value=bill;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(value,meta))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('visual-qa@example.test');
 await page.getByLabel('登录密码').fill('password123');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.getByRole('region',{name:'账户欢迎卡片'})).toBeVisible();
}
async function snapshot(page,name){
 mkdirSync(output,{recursive:true});
 await page.screenshot({path:`${output}/${name}.png`,animations:'disabled',fullPage:false});
}
async function dialogFits(page,dialog){
 await expect(dialog).toBeVisible();
 const close=dialog.getByRole('button',{name:'关闭弹窗'});
 const result=await dialog.evaluate(el=>{
  const rect=el.getBoundingClientRect();
  const hit=el.querySelector('button.close').getBoundingClientRect();
  return{
   left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
   closeWidth:hit.width,closeHeight:hit.height,
   scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,
   h2Overflow:getComputedStyle(el.querySelector('h2')).overflowWrap
  };
 });
 expect(result.left).toBeGreaterThanOrEqual(-1);
 expect(result.right).toBeLessThanOrEqual(page.viewportSize().width+1);
 expect(result.top).toBeGreaterThanOrEqual(-1);
 expect(result.bottom).toBeLessThanOrEqual(page.viewportSize().height+1);
 expect(result.closeWidth).toBeGreaterThanOrEqual(44);
 expect(result.closeHeight).toBeGreaterThanOrEqual(44);
 expect(result.h2Overflow).toBe('anywhere');
 await expect(close).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden');
}
test('short mobile viewport: long plan purchase and order dialogs remain operable and restore focus',async({page})=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:375,height:667});
 await authenticate(page);
 await page.getByRole('navigation',{name:'移动端导航'}).getByRole('button',{name:'购买套餐'}).click();
 await expect(page.locator('[data-plan-id="88"]')).toBeVisible();
 const buy=page.locator('[data-plan-id="88"]').getByRole('button',{name:/立即购买/});
 await buy.click();
 const purchase=page.getByRole('dialog',{name:'购买 '+planTitle});
 await dialogFits(page,purchase);
 await snapshot(page,'purchase-mobile-375');
 const confirm=purchase.getByRole('button',{name:/确认并创建订单/});
 await confirm.scrollIntoViewIfNeeded();
 await expect(confirm).toBeVisible();
 await purchase.getByRole('button',{name:'关闭弹窗'}).click();
 await expect(purchase).toHaveCount(0);
 await expect(buy).toBeFocused();
 await expect(page.locator('body')).not.toHaveCSS('overflow','hidden');
 await buy.click();
 await purchase.getByRole('button',{name:/确认并创建订单/}).click();
 const detail=page.getByRole('dialog',{name:'订单详情'});
 await dialogFits(page,detail);
 await snapshot(page,'order-mobile-375');
 await page.keyboard.press('Escape');
 await expect(detail).toHaveCount(0);
});
test('very short viewport and reduced motion keep purchase form scrollable',async({page})=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:320,height:480});
 await page.emulateMedia({reducedMotion:'reduce'});
 await authenticate(page);
 await page.getByRole('navigation',{name:'移动端导航'}).getByRole('button',{name:'购买套餐'}).click();
 await page.locator('[data-plan-id="88"]').getByRole('button',{name:/立即购买/}).click();
 const dialog=page.getByRole('dialog',{name:'购买 '+planTitle});
 await dialogFits(page,dialog);
 const confirm=dialog.getByRole('button',{name:/确认并创建订单/});
 await confirm.scrollIntoViewIfNeeded();
 await expect(confirm).toBeInViewport();
 await snapshot(page,'purchase-short-320');
 await page.keyboard.press('Escape');
 await expect(dialog).toHaveCount(0);
});
test('mobile ticket dialog stays scrollable, keyboard-trapped and supports Escape',async({page})=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:375,height:480});
 await authenticate(page);
 await page.getByRole('navigation',{name:'移动端导航'}).getByRole('button',{name:'服务工单'}).click();
 const create=page.getByRole('button',{name:/创建工单/});
 await create.click();
 const dialog=page.getByRole('dialog',{name:'创建工单'});
 await dialogFits(page,dialog);
 await dialog.getByRole('textbox',{name:'问题描述'}).fill('视觉验收内容'.repeat(15));
 await dialog.getByRole('button',{name:'提交工单'}).scrollIntoViewIfNeeded();
 await expect(dialog.getByRole('button',{name:'提交工单'})).toBeInViewport();
 await snapshot(page,'ticket-short-375');
 await page.keyboard.press('Escape');
 await expect(dialog).toHaveCount(0);
 await expect(create).toBeFocused();
});
for(const width of [320,390,768,1024,1440]){
 test(`sidebar layout with long brand and dark mode at ${width}px`,async({page})=>{
  test.setTimeout(50_000);
  await page.setViewportSize({width,height:width<400?667:900});
  await authenticate(page,{layout:'sidebar'});
  await page.getByRole('button',{name:'切换主题'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  if(width>720){
   const toggle=page.getByRole('button',{name:'收起侧边栏'});
   await toggle.click();
   await expect(page.locator('.live-sidebar-collapsed')).toBeVisible();
   await page.getByRole('button',{name:'展开侧边栏'}).click();
  }else{
   await expect(page.getByRole('navigation',{name:'移动端导航'})).toBeVisible();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await snapshot(page,`sidebar-dark-${width}`);
 });
}
