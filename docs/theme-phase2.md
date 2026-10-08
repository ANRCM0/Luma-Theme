# vv-theme · 第二阶段：主题布局与导航（v0.4.0）

## 背景

继 v0.3.0 的公告配置后，vv-theme 仍只依赖 TXBoard 现有的 Theme Package v1：`config.json` 声明配置字段，`theme_vv-theme` 保存设置，`/api/v1/guest/comm/config` 下发当前主题的公开配置。没有增加全局页面外观配置，也没有创建独立的主题设置 API。

**后台需要同步部署支持主题字段 `group` 和 `navigation` 编辑器的 TXBoard main 版本**，否则新字段仍可存储，但管理员不一定能通过图形界面排序。旧主题未声明分组时继续使用原来的表单。

## 主题设置

TXBoard 管理后台 →「主题管理」→「vv-theme」→「设置」，会看到按模块分组的字段：

| 分组 | 配置字段 | 默认值 |
| --- | --- | --- |
| 品牌与外观 | `theme_color`、`background_url` | 现有默认配色 |
| 页面布局 | `layout_mode` | `top`（顶部导航） |
| 页面布局 | `sidebar_collapsed_default` | `0`（展开） |
| 菜单与导航 | `nav_items` | `dashboard,shop,profile,ticket,menu,!orders` |
| 公告通知 | 第一阶段全部公告字段 | 与 v0.3.0 相同 |
| 扩展内容 | `custom_html` | 服务端受信任字段，不公开下发 |

`layout_mode` 支持 `top` 和 `sidebar`。桌面侧边栏可由用户点击展开/收起；后台配置决定新会话的默认状态。**屏幕不大于 720px 时，无论使用哪个桌面布局，均展示移动端底部导航。**

## 菜单显示与排序

管理员直接在「菜单显示与排序」中勾选显示，并通过「上移 / 下移」排序；TXBoard 将保存序列字符串。

- `dashboard` 我的面板、`menu` 全部菜单不可隐藏，以免因误配置导致用户丢失导航入口。
- 其余可管理项：`shop` 购买套餐、`profile` 账号设置、`ticket` 服务工单、`orders` 我的订单。
- `!orders` 表示主导航中隐藏该项（但「全部菜单」仍允许访问真实订单）。
- 移动端底部最多显示 5 个图标，始终以「全部菜单」作为最后一项；其余可从「全部菜单」访问。
- 菜单显示与排序只影响 vv-theme 的 UI，不改变用户账户权限、后端路由或支付 API。
- 未在保存值中出现的新菜单项默认隐藏，除不可隐藏的兜底项外，这让日后添加菜单时不会意外暴露。

## 兼容与回滚

- 新版本 TXBoard：读取 `theme_config.layout_mode`、`theme_config.nav_items` 和 `theme_config.sidebar_collapsed_default`。
- 旧版本 TXBoard：从 `dashboard.blade.php` 注入的 `window.settings.navigation` 读取同名值。
- 旧的 vv-theme 已安装配置升级时合并默认值；原有公告、背景与主题色配置继续保留。
- 无效的布局值回退顶部导航；非法或重复菜单 ID 被忽略；`dashboard` 和 `menu` 强制保留。
- 回滚直接在后台切回 TXBoard 内置主题；不会影响用户业务数据。

## 自测清单

1. Desktop 1280px：切换顶部/侧栏；侧栏展开/收起；深色模式对比度。
2. Mobile 390px：无侧栏，底部导航正确显示并保留「全部菜单」；没有横向溢出。
3. 隐藏购买套餐：导航中不显示，但真实账号和订单功能不受影响。
4. 提升「我的订单」排序位置并启用：能导航到订单页、发出原有 `/api/v1/user/order/fetch` 请求。
5. 更换主题后独立配置不串用；升级旧主题后公告系统仍按 v0.3.0 规则工作。
6. 保留 `custom_html` 私有字段，不通过游客配置接口暴露。

CI 运行 `npm test`、构建和 Playwright 模拟 API 回归；正式投产前需在预发 TXBoard 后台上传 v0.4.0 包，检查主题配置保存/读取和实际账号流程。
