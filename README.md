# vv-theme · TXBoard 用户前台主题

ViaSpeed 风格的 React 用户前台。仓库同时提供两个**明确隔离**的运行模式：

| 模式 | 构建命令 | 行为 |
| --- | --- | --- |
| 独立视觉演示 | `npm run build` | 保留原有假数据演示，用于视觉预览，不可对外作为真实服务 |
| **TXBoard 生产主题包** | `TXBOARD_THEME=true npm run build` | 按真实 TXBoard V1 API 获取登录、账户、套餐、订阅、订单和工单 |

## 已接入的真实功能

- 登录与会话校验，复用原生前台的 `xboard_auth_data` Bearer 会话；登录失效后拒绝进入业务页面。
- 套餐与周期从后端获取；优惠码校验、创建订单、付款渠道、支付二维码与支付跳转走真实 API。
- 订阅地址、当前套餐、剩余流量、账号余额和站点公告来自 API；隐藏订阅链接并允许生成二维码。
- 订单列表与订单状态、关闭待支付订单；工单提交/查看/回复/关闭；修改密码及邀请码信息。
- 「重要通知」由首页固定卡片改为登录后弹窗；按账号记录已查看公告版本，新公告自动提醒，右上角铃铛可随时打开公告列表。公告内容以安全文本方式呈现。新版 `0.3.0` 可在「主题管理 → vv-theme → 设置」单独调整弹窗开关、通知中心开关、标签筛选（多个标签逗号分隔）、提醒频率（一次/会话/24 小时/每次访问）、主页范围及三种弹窗样式。
- 对齐 TXBoard 2026-10-08 主题独立配置协议（[#99](https://github.com/ANRCM0/TXBoard/pull/99)）：优先读取公开的 `GET /api/v1/guest/comm/config` → `frontend_theme` / `theme_config`，只有确认当前主题是 `vv-theme` 时才应用新配置；旧版本继续使用 Blade 注入的 `window.settings`。
- `0.4.0` 新增后台配置分组（品牌外观、页面布局、菜单导航、公告通知、扩展内容），支持桌面顶部／侧边栏布局、侧边栏收起、导航显示与排序；移动端保留底部导航及「全部菜单」兜底入口。后台需同步升级 TXBoard 至支持分组与菜单编辑控件的版本。
- `0.5.0` 新增动态欢迎卡片：依据注册时间、订阅是否存在、到期时间和剩余流量，切换新用户、未订阅、已过期、流量耗尽、即将到期、流量不足和正常七类状态；主题后台可设置阈值、启用状态引导及选择推荐套餐／流量／钱包侧边卡片。数据全部来自已登录 TXBoard 用户接口，不修改业务权限。
- 主题独立配置 `theme_color`（青色/蓝色/深蓝色/黑色）、`background_url`、`custom_html`，自定义 HTML 标记为 `public:false`，不随游客配置 API 下发；主题仍从受信任的服务端 Blade 模板注入该 HTML。
- 站点启用验证码时，安全地跳转 `/user-spa/#/login` 走 TXBoard 原生验证码组件；Stripe 信用卡支付走原生安全组件，避免主题自行处理卡信息。

详细配置说明：[第三阶段动态欢迎卡片](docs/theme-phase3.md) · [第二阶段主题布局与导航](docs/theme-phase2.md)。

## 安装升级

需要同时使用包含**动态根路由修复**的 TXBoard 镜像（TXBoard 的 `api/routes/web.php` 和 `api/.docker/caddy/Caddyfile` 已更新）。现在访问 `/` 时由 Laravel 根据 `frontend_theme` 判定：默认 `TXBoard` 仍输出原有 Vue SPA，自定义主题则渲染其 Blade 文件；默认 SPA 不再因启用主题而变成旧的 `umi.js`。

1. 更新并重新部署 TXBoard 镜像，确认新 Caddyfile 与后端生效。
2. 在 GitHub Actions「Build TXBoard Theme Package」中下载 `vv-theme-txboard.zip`，或者运行：
   ```sh
   npm install
   npm test
   TXBOARD_THEME=true npm run build
   THEME_VERSION=0.5.0 node scripts/package-txboard.mjs
   cd theme-package && zip -qr ../vv-theme-txboard.zip .
   ```
3. 在 TXBoard 管理后台「主题管理」中上传**版本高于已安装版本**的 ZIP。本次使用 `0.5.0`，支持覆盖升级原 `0.1.0`。
4. 切换 `frontend_theme` 为 `vv-theme`，从无缓存浏览器验证注册、登录、订阅、下单、回调、工单、移动端。未完成真实支付沙箱或实际环境回归前不要直接向用户推广。

回滚：主题管理里切换回 `TXBoard`，默认用户 SPA 立即恢复，无需改 Caddyfile；不必删除已安装主题。

## 安全与兼容性注意事项

- 真实订阅地址属于访问凭证，只会通过用户认证后的 API 获取，不内嵌于源代码、公开包、展示测试数据中。
- 客户端没有模拟“登录成功”的后门：未认证用户只能登录/注册/找回密码。
- 主题不托管支付密钥或信用卡信息；Stripe 支付继续使用原生 TXBoard 界面。
- 主题依赖 TXBoard V1 API 协议与对应后端功能开关。生产上线仍需验证付款回调、验证码模式、特殊支付网关、邀请码限制、套餐切换和部署负载。
- CSS 使用系统字体，登录背景可由后台配置，不再强制请求 Google Fonts 或 `viaspeed.shop`。
- 自定义 HTML 是受信任管理员配置，不会随公开配置下发；主题背景只接受 HTTP(S) URL，不执行非 Web 协议。
- 独立演示通过 GitHub Pages 展示，**不等于实际业务环境**。

## 验证

```sh
npm test
npm run build
npm run test:e2e
TXBOARD_THEME=true npm run build
npm run test:live
```

用户浏览器 E2E 使用隔离模拟接口，避免在 CI 内建立真实账户或支付订单。生产验收需要在预发环境另行验证。
