import {test,expect} from '@playwright/test';
const wrap=data=>({data,request_id:'req-atomic'});
async function setup(page,theme){
 await page.route('**/txapi/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const content={
   '/txapi/public/site-config':{frontend_theme:'vv-theme',app_name:'Atomic Luma',is_captcha:0,theme_config:{notice_popup_enabled:'0',...theme}},
   '/txapi/auth/login':{auth_data:'Bearer atomic-test-token'},
   '/txapi/me':{id:130,email:'atomic@example.test',plan_id:0,balance:1000},
   '/txapi/me/subscription':{plan:{id:0,name:'Free'},subscribe_url:'https://sub.example.test/link/123',traffic_limit_bytes:0,upload_bytes:0,download_bytes:0,expired_at:null},
   '/txapi/plans':[
    {id:1,name:'周期基础',content:'',tags:['推荐'],traffic_limit_bytes:60*1073741824,speed_limit_mbps:200,device_limit:3,capacity_limit:null,reset_traffic_method:null,prices:[{period:'monthly',amount_minor:1200},{period:'yearly',amount_minor:13000}],renewable:true},
    {id:2,name:'流量一次性',content:'',tags:[],traffic_limit_bytes:30*1073741824,speed_limit_mbps:null,device_limit:null,capacity_limit:null,reset_traffic_method:null,prices:[{period:'onetime',amount_minor:900}],renewable:false}
   ],
   '/txapi/notices':[],
   '/txapi/me/dashboard-stats':[],
   '/txapi/me/nodes':[{id:88,name:'Tokyo',rate:2,tags:['Premium'],is_online:true}]
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(content[path]??[]))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('atomic@example.test');
 await page.getByLabel('登录密码').fill('password123');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.getByRole('region',{name:'账户欢迎卡片'})).toBeVisible();
}
test('atomic Luma settings change only presentation and preserve subscribe API',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await setup(page,{
  ui_density:'compact',ui_card_radius:10,ui_welcome_description:'0',
  ui_welcome_decoration:'0',ui_show_footer:'0',ui_show_nav_icons:'0',
  subscription_link_visible:'0',subscription_qr_visible:'0',
  subscription_caution_visible:'0'
 });
 const app=page.locator('.live-portal').last();
 await expect(app).toHaveAttribute('data-luma-density','compact');
 await expect(app).toHaveCSS('--luma-card-radius','10px');
 const welcome=page.getByRole('region',{name:'账户欢迎卡片'});
 await expect(welcome.locator('.welcome-decor')).toHaveCount(0);
 await expect(welcome.locator('.welcome-text>p')).toHaveCount(0);
 const importPanel=page.getByRole('region',{name:'客户端与订阅导入'});
 await expect(importPanel.getByText('订阅链接',{exact:true})).toHaveCount(0);
 await expect(importPanel.locator('.live-import-qr')).toHaveCount(0);
 await expect(importPanel.getByText('订阅链接属于账号凭证')).toHaveCount(0);
 await expect(page.locator('.mobile-nav button svg').first()).toBeHidden();
 await expect(page.locator('footer')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
test('atomic page visibility hides navigation and rejects hidden page rendering',async({page})=>{
 await setup(page,{page_shop_visible:'0',page_nodes_visible:'0',page_invite_visible:'0'});
 const nav=page.getByRole('navigation',{name:'主导航'});
 await expect(nav.getByRole('button',{name:'购买套餐'})).toHaveCount(0);
 await nav.getByRole('button',{name:'全部菜单'}).click();
 await expect(page.getByRole('button',{name:'节点列表'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'邀请管理'})).toHaveCount(0);
 await page.goto('/#/shop');
 await expect(page.getByText('此页面已在 Luma 主题设置中隐藏。')).toBeVisible();
});
test('shop atomics reorder categories and limit feature rows without changing server prices',async({page})=>{
 await setup(page,{
  shop_section_order:'traffic',shop_cycle_feature_limit:1,
  shop_cycle_featured_id:1,shop_group_description:'0',shop_tags_visible:'0'
 });
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'购买套餐'}).click();
 const groups=page.locator('.live-shop-category');
 await expect(groups).toHaveCount(2);
 await expect(groups.first().getByRole('heading',{name:'按量付费'})).toBeVisible();
 const recurring=page.getByRole('region',{name:'周期订阅'});
 await expect(recurring.getByText('精选套餐')).toBeVisible();
 await expect(recurring.locator('.live-shop-features>div')).toHaveCount(1);
 await expect(recurring.locator('.live-shop-tags')).toHaveCount(0);
 await expect(page.locator('.live-shop-category-head p')).toHaveCount(0);
 await expect(recurring.locator('.live-shop-price')).toContainText('¥12.00');
 await expect(groups.first().locator('.live-shop-price')).toContainText('¥9.00');
});


test('client catalog supports custom images, platform selection, built-in import and download links',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('https://cdn.example.test/hiddify.svg',route=>route.fulfill({
  status:200,contentType:'image/svg+xml',
  body:'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="6" fill="#54bac4"/></svg>'
 }));
 await page.route('https://cdn.example.test/broken.png',route=>route.fulfill({status:404,body:''}));
 const catalog=JSON.stringify([
  {id:'hiddify',name:'Hiddify Next',platforms:['windows','android'],
   iconUrl:'https://cdn.example.test/hiddify.svg',order:1},
  {id:'nova',name:'Nova',platforms:['windows'],iconUrl:'https://cdn.example.test/broken.png',
   action:'scheme',template:'nova://import?url={urlEncoded}',order:2},
  {id:'download',name:'官网应用',platforms:['ios'],action:'download',
   url:'https://example.test/download',order:1}
 ]);
 await setup(page,{
  subscription_client_mode:'replace',subscription_clients_json:catalog,
  subscription_client_icon_size:42
 });
 const importPanel=page.getByRole('region',{name:'客户端与订阅导入'});
 await expect(importPanel.getByRole('button',{name:'导入到 Hiddify Next'})).toBeVisible();
 await expect(importPanel.getByRole('button',{name:'导入到 Nova'})).toBeVisible();
 await expect(importPanel.getByRole('button',{name:'导入到 Clash'})).toHaveCount(0);
 const icon=importPanel.getByRole('button',{name:'导入到 Hiddify Next'}).locator('.live-client-icon');
 await expect(icon).toHaveCSS('width','42px');
 await expect(icon.locator('img')).toHaveAttribute('src','https://cdn.example.test/hiddify.svg');
 const broken=importPanel.getByRole('button',{name:'导入到 Nova'}).locator('.live-client-icon');
 await expect(broken).toContainText('N');
 await importPanel.getByRole('group',{name:'选择客户端平台'}).getByRole('button',{name:'iOS'}).click();
 await expect(importPanel.getByRole('button',{name:'打开 官网应用'})).toBeVisible();
 await expect(importPanel.getByRole('button',{name:'导入到 Hiddify Next'})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});


test('desktop header is slimmer, dashboard cards meet without the redundant subscription title',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await setup(page,{});
 const header=page.locator('.live-portal .top');
 const headerBox=await header.boundingBox();
 expect(headerBox.height).toBeLessThanOrEqual(66);
 expect(headerBox.width).toBeLessThanOrEqual(1186);
 await expect(header.locator('.desktop-nav').getByRole('button',{name:'购买套餐'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'订阅管理'})).toHaveCount(0);
 const upper=await page.locator('.dashboard-grid').boundingBox();
 const subscription=page.locator('.live-subscription-center');
 // Check the exact CSS spacing, allowing fractional rendering during transitions.
 await expect(subscription).toHaveCSS('margin-top','10px');
 const lower=await subscription.boundingBox();
 const visualGap=lower.y-(upper.y+upper.height);
 expect(visualGap).toBeGreaterThanOrEqual(8);
 expect(visualGap).toBeLessThanOrEqual(20);
});
test('shop starts at centered category with centered single plan and no redundant page introduction',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await setup(page,{});
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'购买套餐'}).click();
 const shop=page.getByRole('region',{name:'套餐商店'});
 await expect(shop.locator('.page-heading')).toHaveCount(0);
 await expect(shop.getByRole('heading',{name:'购买套餐'})).toHaveCount(0);
 const recurring=shop.getByRole('region',{name:'周期订阅'});
 const category=await recurring.boundingBox();
 const header=await recurring.locator('.live-shop-category-head').boundingBox();
 const card=await recurring.locator('.live-shop-plan').boundingBox();
 expect(Math.abs(category.x+category.width/2-(header.x+header.width/2))).toBeLessThan(2);
 expect(Math.abs(category.x+category.width/2-(card.x+card.width/2))).toBeLessThan(3);
 await expect(shop.getByRole('region',{name:'按量付费'})).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
});
