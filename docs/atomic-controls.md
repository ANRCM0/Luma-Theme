# Luma Theme · 原子级细节配置

这套配置参考了用户提供的经典主题 `config.js` **按模块细分开关** 的思路，但不是复制其全局变量、图片素材或接口层实现。目标是让 Luma 在保持现有简洁视觉的同时，允许管理员分别调整每一个具体模块。

## 配置入口与兼容

安装新版 Luma 主题包后，在 **TXBoard 管理后台 → 主题管理 → Luma Theme（内部标识 `vv-theme`）→ 设置** 修改。主题包的 `config.json` 会自动生成下表中的字段，并和已有「外观、导航、公告、欢迎卡、套餐、支付」字段共存。

- 当前 TXBoard 读取 `GET /api/v1/guest/comm/config` 返回的 `frontend_theme === "vv-theme"` 和 `theme_config` 扁平字段。
- 兼容旧版 TXBoard 的 Blade 渲染回退：`window.settings.atomic` 由主题打包脚本安全生成。
- 布尔值可用 `1` / `0`，数字和枚举均经过解析、验证和限幅；非法值回退默认值。
- **默认不改变已发布 Luma 页面排版和购买逻辑。**
- 显示/隐藏不是权限系统。服务端是否允许套餐购买、提现、重置流量、访问节点等行为仍由 TXBoard API 独立校验。

## 原子配置目录

### 界面原子细节（11 项）

| 配置字段 | 默认值 | 作用 |
| --- | --- | --- |
| `ui_density` | `comfortable` | 舒适 / 紧凑，调整间距、卡片内边距 |
| `ui_card_radius` | `16` | 卡片圆角像素，范围 8–28 |
| `ui_show_eyebrow` | `1` | 页面英文小标题 |
| `ui_show_page_description` | `1` | 页面标题下说明 |
| `ui_show_footer` | `1` | 页面页脚 |
| `ui_show_nav_icons` | `1` | 桌面和手机导航图标 |
| `ui_show_theme_toggle` | `1` | 顶部亮/暗切换按钮 |
| `ui_show_header_logout` | `1` | 顶部退出图标，关闭后仍可在全部菜单退出 |
| `ui_welcome_description` | `1` | 欢迎区说明文字 |
| `ui_welcome_decoration` | `1` | 欢迎区装饰图形 |
| `ui_dashboard_subscription` | `1` | 首页订阅导入组件 |

### 页面可见性（9 项）

`page_shop_visible`、`page_profile_visible`、`page_ticket_visible`、`page_orders_visible`、`page_nodes_visible`、`page_traffic_visible`、`page_knowledge_visible`、`page_invite_visible`、`page_gift_visible`。

全部默认为 `1`。关闭后从顶部/底部导航与「全部菜单」移除，直接访问隐藏页面时显示主题内提示，不跳转旧前台。**主页、全部菜单以及退出登录兜底始终保留。** 可见性并不授权或撤销后端数据访问。

### 套餐分组与卡片（12 项）

| 配置字段 | 默认值 | 作用 |
| --- | --- | --- |
| `shop_cycle_visible` | `1` | 展示周期订阅区 |
| `shop_traffic_visible` | `1` | 展示一次性流量包区 |
| `shop_section_order` | `recurring` | 周期优先或流量包优先 |
| `shop_group_description` | `1` | 分组下的简短描述 |
| `shop_cycle_featured_id` | `0` | 周期区精选套餐 ID；0 回退已有精选配置 |
| `shop_traffic_featured_id` | `0` | 流量包精选套餐 ID |
| `shop_cycle_feature_limit` | `0` | 周期卡显示的权益条数；0 全部，最大 20 |
| `shop_traffic_feature_limit` | `0` | 流量包卡权益条数；0 全部，最大 20 |
| `shop_tags_visible` | `1` | 套餐标签 |
| `shop_features_visible` | `1` | 流量、设备、带宽等权益 |
| `shop_year_savings_visible` | `0` | 年付相对 12 个月月付的节省金额提示 |
| `shop_empty_sections_visible` | `0` | 是否显示没有可售套餐的分类 |

年付节省是由后端提供的月付和年付金额计算的**展示值**；实际订单金额仍由服务端确认。购买弹窗仍列出后端允许的具体周期，不把月付/年付选择重新塞回套餐列表顶部。

### 订阅导入细节（3 项）

`subscription_link_visible`、`subscription_qr_visible`、`subscription_caution_visible`，默认全为 `1`。分别控制订阅链接输入区、二维码以及隐私提示。已存在的 `subscription_client_guide` 则管理第三方客户端快捷导入。

订阅链接始终属于认证后的账号凭证；这些开关只影响显示，不会将真实订阅 URL 写入访客配置或主题包。

### 节点与数据（7 项）

`node_rate_visible`、`node_tags_visible`、`traffic_rate_visible`、`traffic_upload_visible`、`traffic_download_visible`、`knowledge_search_visible`、`knowledge_categories_visible`，默认全为 `1`。关闭倍率列仅隐藏显示，流量汇总仍按照后端记录的倍率计算。

### 账号页面细节（1 项）

`auth_optional_invite_visible` 默认为 `0`：非强制邀请站点可以显示邀请码输入框。后台设为**强制邀请码**时该输入框仍为必填，本设置不能绕过后端注册要求。

## 为什么不直接复制原配置？

参考配置含有展示主页、客户端图标素材、用户状态分段、订单与公告控制、某些充值行为以及前端“请求加密口令”等多个模块。Luma 已有自己的欢迎状态、公告频率、支付轮询和客户端导入配置，不重复造开关。

特别是配置中用于请求加密的口令，**不应直接放入可下载的前端 JavaScript/公共主题配置**。充值、余额、佣金、订单价格和服务权限需要 TXBoard 后端接口真实支持且强制检查；未经后端支持的开关不会伪装成已实现功能。

## 推荐的「极简」组合

界面选紧凑，关闭英文小标题、较长页面说明、欢迎装饰、套餐标签、分组说明和不必要的节点倍率展示；保留套餐主价格、订阅安全提示和全部菜单入口。具体细节都可以单独开关，不必切换整个主题风格。

## 验证

```bash
npm test
TXBOARD_THEME=true npm run build
npm run test:live
```

上述测试使用隔离数据和模拟接口。发布安装包前，还要执行主题发布工作流中的 Blade/PHP 渲染校验；不发布标签便不会自动产生 Release。
