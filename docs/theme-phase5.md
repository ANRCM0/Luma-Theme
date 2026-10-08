# vv-theme 第五阶段：订阅管理与客户端引导（v0.7.0）

## 范围

本阶段只加强真实 TXBoard 订阅信息展示，不创建或伪造订阅数据，也不直接修改用户流量：

- 首页升级为**订阅管理中心**：套餐名称、状态、已用与剩余流量、上传/下载、流量进度、到期时间、下次重置时间和手动刷新。
- 订阅链接默认遮罩；复制、展开和二维码是独立操作。非 HTTP(S)、带 URL 用户名/密码或异常链接不会生成客户端导入指令。
- 按 Windows / macOS / iOS / Android 筛选客户端并在页面给出三步导入说明；与 TXBoard 原生 client-import 协议对齐。用户可自行切换平台，复制链接始终可用。
- “续费当前套餐”先调用 TXBoard `/api/v1/user/plan/fetch?id=...` 获取用户可购的套餐与周期，然后沿用 v0.6.0 真实订单流程；当前套餐不可续费时仍可浏览其他套餐。
- “重置流量”仅在用户有当前有效套餐、额度明确且重置方式允许时显示。点击后重新查询用户可购套餐的 `reset_price`（以分计），并需确认“不会延长有效期”，再创建 `period=reset_price` 订单；后端仍执行 `PlanService.validateResetTrafficPurchase` 以及订单计价。

**后端限制：** 当前 TXBoard 的 `/user/plan/fetch?id=...` 会先执行 `isPlanAvailableForUser`（包括续费状态判断）。如果当前套餐不能通过此接口获取，即便后台另有重置资格，此主题也不会绕开接口权限去猜测价格，重置入口会安全报错；未来需要单独的重置报价接口才能完整覆盖这种情况。

## 配置项

主题管理 → vv-theme → 设置 → **订阅管理**：

| 键 | 默认 | 用途 |
|---|---|---|
| `subscription_client_guide` | 1 | 展示按平台的客户端列表与导入步骤 |
| `subscription_reset_action` | 1 | 展示流量重置操作；仍经后端鉴权及计价 |
| `subscription_renew_action` | 1 | 展示当前套餐续费入口；不影响套餐商店 |
| `subscription_show_next_reset` | 1 | 显示预计的下次流量重置时间 |

新 TXBoard 通过当前主题 `theme_config` 下发设置；旧版可通过 Blade `window.settings.subscriptionCenter` 回退。全部设置都在主题内部，不恢复全局外观页。

## TXBoard 真实字段

- `/api/v1/user/getSubscribe`：`plan_id`、`plan`、`u`、`d`、`transfer_enable`、`expired_at`、`next_reset_at`、`reset_day`、`subscribe_url`。
- `/api/v1/user/info`：用户绑定的套餐 ID 和流量限额等。
- `/api/v1/user/plan/fetch?id=...`：**用户级可购套餐**，仅把返回的 `reset_price` / 订阅周期用于真实订单的基础价格预览。
- `/api/v1/user/order/save`：服务端检查真实权限、订单冲突、优惠码并确认最终金额。

`getSubscribe.transfer_enable`、`u` 和 `d` 使用字节。额度不明时显示“—”，不会凭空出现 0 GB；时间戳兼容秒和毫秒。

## 安全与可用性

- 订阅链接是访问凭证，导入按钮的外部客户端协议只在用户点击时触发；不在未认证页面、主题配置、埋点或文档中输出真实 token。点击导入不保证设备已经安装客户端。
- 不从不受信任的字符串产生 `javascript:` / `data:` 等链接。
- “流量重置”须创建订单，绝不是直接刷新客户端数据。若购买者有未付订单，仍沿用已有订单冲突确认逻辑。
- 到期套餐不显示流量重置按钮；无法确认购买资格时不猜测价格。
- 没有多语言或独立落地页功能，本阶段不改 TXBoard 的支付后端。

## 验收检查

1. 新用户/正常订阅/到期/流量耗尽的用量与日期显示，尤其 `next_reset_at` / `reset_day` 的兜底。
2. Windows/macOS/iOS/Android 客户端筛选、链接遮罩和复制、扫码。
3. 当前套餐续费的服务端查询，重置流量的 `reset_price` 展示、明确用户确认、订单提交与实际金额核对。
4. 手机 390px 与桌面布局无横向溢出，深浅主题文字和按钮可见。
5. 完整真实支付网关和客户端实际跳转应在预发环境由有权限的账号验证；CI 为模拟 API。

[第四阶段](theme-phase4.md) · [第三阶段](theme-phase3.md)
