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
