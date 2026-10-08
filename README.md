# ViaSpeed 前端复刻（独立演示）v1.2

基于公开页面和授权浏览器会话的界面观察制作。React 19 + Vite 6 + lucide-react。

## 本地运行

```bash
npm install
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## 功能

- Dashboard、套餐商店、账号设置、服务工单、全部菜单、登录演示。
- 响应式布局、主题切换、套餐筛选、弹窗和演示工单。
- 主题及演示工单保存在本地 localStorage，不会发送到 ViaSpeed。
- `#/login` 是独立演示登录页，点击“进入演示”即可返回面板；不执行真实认证。
- 真实订阅链接、令牌和账户数据不包含在项目中。

## CI 和浏览器测试

GitHub Actions 在 main 推送和 PR 时执行 Node 20/22 的源码检查和生产构建；Node 22 还执行 Chromium 桌面及移动端 E2E 测试。失败时保留 Playwright HTML 报告和 trace。工作流文件：`.github/workflows/ci.yml`。

## 验证范围

- `npm test`：9 项源码级冒烟检查通过。
- 当前执行环境访问 npm registry 出现 `EAI_AGAIN`，尚未完成依赖安装、Vite 构建或真实浏览器 E2E 测试。
- 除 Dashboard 外的部分页面仍为演示性实现；不包含真实支付、充值、密码修改和工单 API。
