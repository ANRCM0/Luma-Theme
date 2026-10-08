import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{try{if(!sessionStorage.getItem('viaspeed-e2e-initialized')){localStorage.clear();sessionStorage.setItem('viaspeed-e2e-initialized','1')}}catch{}});
  await page.goto('/#/dashboard');
});

test('dashboard renders and navigation reaches every main page',async({page,isMobile})=>{
  await expect(page.getByRole('heading',{name:/Halo, Test/})).toBeVisible();
  for(const [name,heading] of [['购买套餐','购买套餐'],['账号设置','账号设置'],['服务工单','服务工单'],['全部菜单','全部菜单']]){
    const nav=isMobile?page.locator('.mobile-nav'):page.locator('.desktop-nav');
    await nav.getByRole('button',{name}).click();
    await expect(page.getByRole('heading',{name:heading,exact:true}).first()).toBeVisible();
  }
});

test('theme selection survives reload',async({page})=>{
  await page.locator('.head-actions').getByRole('button',{name:'切换主题'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});

test('ticket creation persists locally after reload',async({page})=>{
  await page.goto('/#/ticket');
  await page.getByRole('button',{name:'创建工单'}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByPlaceholder('请简要描述遇到的问题').fill('演示工单 E2E');
  await dialog.getByPlaceholder('请详细描述...').fill('验证本地工单保存和读取');
  await dialog.getByRole('button',{name:'提交工单'}).click();
  await expect(page.getByText('演示工单 E2E')).toBeVisible();
  await page.reload();
  await expect(page.getByText('演示工单 E2E')).toBeVisible();
});

test('subscription is a safe demo URL',async({page})=>{
  await expect(page.locator('.subscription')).toBeVisible();
  await page.getByRole('button',{name:'显示或隐藏订阅链接'}).click();
  await expect(page.locator('.subscription')).toContainText('example.invalid');
});

test('logout navigates to demo login and back',async({page,isMobile})=>{
  const nav=isMobile?page.locator('.mobile-nav'):page.locator('.desktop-nav');
  await nav.getByRole('button',{name:'全部菜单'}).click();
  await page.getByRole('button',{name:'退出登录'}).click();
  await expect(page.getByRole('heading',{name:'登录 拓昕科技'})).toBeVisible();
  await page.getByRole('button',{name:'进入演示'}).click();
  await expect(page.getByRole('heading',{name:/Halo, Test/})).toBeVisible();
});

test('mobile page has no horizontal document overflow',async({page,isMobile})=>{
  test.skip(!isMobile,'mobile viewport only');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  expect(overflow).toBe(false);
});
