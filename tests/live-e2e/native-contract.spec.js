import {test,expect} from '@playwright/test';

const wrap=(data,meta)=>({data,...(meta?{meta}:{}),request_id:'req-native-e2e'});
async function setup(page){
 const calls={created:0,checkedOut:0,logout:0,keys:[],bearers:[]};
 const email='contract@example.test';
 const user={id:987,email,plan_id:0,balance_minor:0,commission_balance_minor:0,expired_at:null,traffic:{upload_bytes:0,download_bytes:0,limit_bytes:0}};
 const fixtures={
  '/txapi/public/site-config':{frontend_theme:'vv-theme',app_name:'TXBoard Contract',theme_config:{notice_popup_enabled:'0'}},
  '/txapi/auth/login':{auth_data:'Bearer native-contract-test'},
  '/txapi/me':user,
  '/txapi/me/subscription':{plan:null,subscribe_url:'',traffic_limit_bytes:0,upload_bytes:0,download_bytes:0,expired_at:null},
  '/txapi/plans':[],
  '/txapi/notices':[],
  '/txapi/me/dashboard-stats':[],
  '/txapi/me/site-config':{},
  '/txapi/invites':{codes:[],stat:[0,0,0]},
  '/txapi/orders':[],
  '/txapi/billing/commissions':[],
  '/txapi/billing/wallet':{balance_minor:100,commission_balance_minor:0},
  '/txapi/billing/recharge-payment-methods':[{id:3,name:'测试网关',payment:'EPay',handling_fee_fixed:0,handling_fee_percent:0}]
 };
 await page.route('**/txapi/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,method=req.method();
  let data=fixtures[path]??[],meta;
  if(path==='/txapi/auth/logout'&&method==='POST'){calls.logout++;data={ok:true}}
  if(path==='/txapi/billing/recharges'&&method==='GET'){data=[];meta={page:1,per_page:20,total:0,last_page:1}}
  if(path==='/txapi/billing/recharges'&&method==='POST'){
   calls.created++;calls.keys.push(req.headers()['idempotency-key']);calls.bearers.push(req.headers().authorization);
   data={trade_no:'WR123',payment_method_id:3,amount_minor:2500,fee_minor:0,total_minor:2500,status:0,created_at:1760000000,paid_at:null};
  }
  if(path==='/txapi/billing/recharges/WR123'&&method==='GET'){
   data={trade_no:'WR123',payment_method_id:3,amount_minor:2500,fee_minor:0,total_minor:2500,status:0,created_at:1760000000,paid_at:null};
  }
  if(path==='/txapi/billing/recharges/WR123/checkout'&&method==='POST'){
   calls.checkedOut++;
   data={type:1,data:'https://pay.example.test/order'};
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(wrap(data,meta))});
 });
 await page.goto('/');
 await page.getByRole('textbox',{name:'邮箱地址'}).fill(email);
 await page.getByLabel('登录密码').fill('password1');
 await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.getByRole('heading',{name:/我的面板|欢迎/}).first()).toBeVisible();
 return calls;
}

test('TXBoard native wallet creates one idempotent recharge and unwraps provider redirect',async({page})=>{
 const calls=await setup(page);
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'账号设置'}).click();
 await page.getByRole('button',{name:'财务记录',exact:true}).click();
 const wallet=page.getByRole('region',{name:'钱包充值'});
 await expect(wallet).toBeVisible();
 await wallet.getByLabel('充值金额（元）').fill('25.00');
 await wallet.getByRole('button',{name:'创建充值订单并支付'}).click();
 await expect(wallet.getByRole('link',{name:/手动打开安全支付链接/})).toHaveAttribute('href','https://pay.example.test/order');
 expect(calls.created).toBe(1);
 expect(calls.checkedOut).toBe(1);
 expect(calls.keys[0]).toMatch(/^[0-9a-f-]{36}$/i);
 expect(calls.bearers[0]).toBe('Bearer native-contract-test');
});

test('sign-out calls native TXBoard session revoke before returning to login',async({page})=>{
 const calls=await setup(page);
 await page.getByRole('button',{name:'退出登录',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'邮箱地址'})).toBeVisible();
 expect(calls.logout).toBe(1);
 const token=await page.evaluate(()=>localStorage.getItem('xboard_auth_data'));
 expect(token).toBeNull();
});
