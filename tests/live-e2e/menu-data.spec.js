import {test,expect} from '@playwright/test';

async function mockMenu(page,{guestFlags={},userFlags={},trafficFailure=false}={}){
 const paths=[];
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  paths.push(path);
  const payload={
   '/api/v1/guest/comm/config':{app_name:'Luma 菜单',frontend_theme:'vv-theme',notice_popup_enabled:0,
    theme_config:{notice_popup_enabled:'0'},...guestFlags},
   '/api/v1/passport/auth/login':{auth_data:'menu-demo-token'},
   '/api/v1/user/checkLogin':{is_login:true},
   '/api/v1/user/info':{id:401,email:'menu@example.test',plan_id:0},
   '/api/v1/user/comm/config':{traffic_log_enable:1,knowledge_enable:1,...userFlags},
   '/api/v1/user/getSubscribe':{},
   '/api/v1/user/plan/fetch':[],
   '/api/v1/user/notice/fetch':{data:[],total:0},
   '/api/v1/user/getStat':[],
   '/api/v1/user/stat/getTrafficLog':[{u:2147483648,d:1073741824,server_rate:2,record_at:1770000000}],
   '/api/v1/user/knowledge/fetch':{安装:[{id:1,title:'客户端教程',category:'安装',body:'<p>选择客户端</p><script>window.knowledgeEvil=true</script>'}]}
  };
  if(path==='/api/v1/user/server/fetch'){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:[{id:9,name:'日本节点',rate:1.5,is_online:true,tags:['高级']}]})});
   return;
  }
  if(trafficFailure&&path==='/api/v1/user/stat/getTrafficLog'){
   await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'流量接口暂时不可用'})});
   return;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'success',data:payload[path]??[]})});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill('menu@example.test');
 await page.getByLabel('登录密码').fill('passw0rd');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 return paths;
}
async function openMenu(page){await page.getByRole('navigation',{name:'移动端导航'}).getByRole('button',{name:'全部菜单'}).click()}
test('Luma mobile menu loads node, traffic and help with their own TXBoard endpoints',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const paths=await mockMenu(page);
 await openMenu(page);
 await page.getByRole('button',{name:'节点列表'}).click();
 await expect(page.getByRole('region',{name:'节点列表'})).toContainText('日本节点');
 await expect(page.getByRole('region',{name:'节点列表'})).toContainText('1.5 ×');
 await expect(page).toHaveURL(/#\/nodes$/);
 await openMenu(page);
 await page.getByRole('button',{name:'流量记录'}).click();
 const traffic=page.getByRole('region',{name:'流量记录'});
 await expect(traffic).toContainText('1.00 GB');
 await expect(traffic).toContainText('512.00 MB');
 await expect(traffic).toContainText('2 ×');
 await openMenu(page);
 await page.getByRole('button',{name:'帮助中心'}).click();
 const knowledge=page.getByRole('region',{name:'帮助中心'});
 await expect(knowledge.getByText('客户端教程')).toBeVisible();
 await knowledge.getByText('客户端教程').click();
 await expect(knowledge).toContainText('选择客户端');
 expect(await page.evaluate(()=>window.knowledgeEvil===true)).toBe(false);
 expect(paths).toContain('/api/v1/user/server/fetch');
 expect(paths).toContain('/api/v1/user/stat/getTrafficLog');
 expect(paths).toContain('/api/v1/user/knowledge/fetch');
 expect(paths.some(path=>path.includes('/user-spa/'))).toBe(false);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
test('disabled menu functions are hidden and their routes never request private data',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const paths=await mockMenu(page,{guestFlags:{traffic_log_enable:0},userFlags:{knowledge_enable:0}});
 await openMenu(page);
 await expect(page.getByRole('button',{name:'流量记录'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'帮助中心'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'节点列表'})).toBeVisible();
 await page.goto('/#/traffic');
 await expect(page.getByText('功能未开放')).toBeVisible();
 await page.goto('/#/knowledge');
 await expect(page.getByText('功能未开放')).toBeVisible();
 expect(paths).not.toContain('/api/v1/user/stat/getTrafficLog');
 expect(paths).not.toContain('/api/v1/user/knowledge/fetch');
});
test('backend traffic error is visible with a retry action, not fake empty statistics',async({page})=>{
 const paths=await mockMenu(page,{trafficFailure:true});
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'全部菜单'}).click();
 await page.getByRole('button',{name:'流量记录'}).click();
 const pageError=page.getByRole('region',{name:'流量记录'}).getByRole('alert');
 await expect(pageError).toContainText('流量接口暂时不可用');
 await expect(page.getByText('本月暂无流量记录。')).toHaveCount(0);
 await page.getByRole('button',{name:'重试'}).click();
 await expect(pageError).toContainText('流量接口暂时不可用');
 expect(paths.filter(path=>path==='/api/v1/user/stat/getTrafficLog').length).toBeGreaterThanOrEqual(2);
});
