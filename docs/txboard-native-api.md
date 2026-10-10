# TXBoard 原生 API 规格（权威，来自后端源码）

后端路由：`/root/TXBoard/api/routes/txapi.php`
控制器：`/root/TXBoard/api/app/Http/Controllers/Txapi/`

## 信封
成功：`{data, meta?, request_id}`（meta 仅分页端点有：`{page,per_page,total,last_page}`）
失败：`{error:{code,message,fields?}, request_id}` —— **失败也可能返回 2xx**，必须先看信封再看 HTTP 状态。

## 端点（已在前端 api.js 实现，不要改 api.js）
| 前端函数 | 方法 + 路径 |
|---|---|
| siteConfig/guest | GET /public/site-config |
| login | POST /auth/login |
| register | POST /auth/register |
| tokenLogin | POST /auth/one-time-token |
| logout | POST /auth/logout |
| verifySession | GET /me |
| sendVerify | POST /auth/email-code |
| forgetPassword | POST /auth/password/forgot |
| changePassword | POST /auth/password |
| quickLoginUrl | POST /auth/quick-login → {url} |
| activeSessions | GET /auth/sessions |
| removeSession | DELETE /auth/sessions/{id} |
| user | GET /me |
| subscribe | GET /me/subscription |
| userCommConfig | GET /me/site-config |
| stat | GET /me/dashboard-stats |
| preferences | GET /me/preferences |
| updateUserSettings | PATCH /me/preferences |
| resetSecurity | POST /me/subscription-credentials/rotate → {subscribe_url} |
| serverNodes | GET /me/nodes |
| plans | GET /plans |
| plan | GET /plans/{id} |
| orders | GET /orders |
| orderDetail | GET /orders/{tradeNo}/detail |
| orderCheck | GET /orders/{tradeNo} → 返回 status 数字 |
| createOrder | POST /orders → {trade_no} |
| cancelOrder | POST /orders/{tradeNo}/cancel |
| checkout | POST /orders/{tradeNo}/checkout |
| payments | GET /billing/payment-methods |
| checkCoupon | POST /billing/coupons/check |
| tickets | GET /tickets |
| ticketDetail | GET /tickets/{id} |
| createTicket | POST /tickets → {id} |
| replyTicket | POST /tickets/{id}/messages |
| closeTicket | POST /tickets/{id}/close |
| notices | GET /notices |
| knowledgeArticles | GET /knowledge |
| trafficLog | GET /traffic/logs |
| invites | GET /invites |
| createInvite | POST /invites |
| commissions | GET /billing/commissions |
| transferCommission | POST /billing/commission-transfer |
| withdrawCommission | POST /billing/withdrawals |
| wallet | GET /billing/wallet |
| giftCheck | POST /gift-cards/check |
| giftRedeem | POST /gift-cards/redeem |
| giftHistory | GET /gift-cards/history |
| giftDetail | GET /gift-cards/history/{id} |
| stripePublicKey | POST /billing/stripe-public-key → 裸字符串 pk_... |

## 原生 DTO 字段（关键！旧 Xboard 字段名全部作废）

### GET /me
```json
{id, email, plan_id, uuid,
 balance_minor, commission_balance_minor,
 expired_at: "ISO8601"|null, telegram_id,
 traffic: {upload_bytes, download_bytes, limit_bytes}}
```
注意：**没有 created_at**。**没有 balance / commission_balance / u / d / transfer_enable**。

### GET /me/subscription
```json
{subscribe_url, reset_day,
 plan: {id,name,traffic_limit_bytes}|null,
 upload_bytes, download_bytes, traffic_limit_bytes,
 device_limit, speed_limit_mbps,
 expired_at: "ISO8601"|null, next_reset_at: "ISO8601"|null}
```
注意：plan 里**没有 renew**（续费能力看 /plans 的 `renewable`），**没有 reset_traffic_method**。

### GET /plans（数组）
```json
{id, name, content, tags:[],
 traffic_limit_bytes, speed_limit_mbps, device_limit, capacity_limit,
 reset_traffic_method,
 prices: [{period, amount_minor}],   // period 是原生键
 renewable: bool}
```
原生 period 键：`monthly, quarterly, half_yearly, yearly, two_yearly, three_yearly, onetime, reset_traffic`
金额单位：**分**（amount_minor）。`reset_traffic` 价格也在 prices 里，但它不是订阅周期。

### GET /orders（数组 + meta）
```json
{id, trade_no, plan_id, period, type, status,
 amount_minor, plan: {id,name}|null, paid_at: "ISO"|null, created_at: "ISO"}
```

### GET /orders/{tradeNo}/detail
同上，另加 `payment_id`、`balance_amount_minor`、`discount_amount_minor`，
plan 变为 `{id,name,traffic_limit_bytes}`。

### GET /billing/payment-methods（数组）
```json
{id, name, provider, icon, fee_fixed_minor, fee_percent}
```
注意：**provider** 不是 payment；**fee_fixed_minor / fee_percent** 不是 handling_fee_*。

### POST /billing/coupons/check
```json
{id, name, code, type, value_minor, percent}
```
type===1 用 value_minor，type===2 用 percent。

### POST /orders/{tradeNo}/checkout（preserveEnvelope=true，读整个信封）
```json
data: {type, data}
```
type: -1 免支付, 0 二维码(字符串), 1 跳转URL(字符串), 2 其它。data 是字符串或 true。

### GET /tickets（数组 + meta）
```json
{id, subject, level, status, reply_status, created_at:"ISO", updated_at:"ISO"}
```
### GET /tickets/{id}
同上 + `messages: [{id, message, is_me, created_at:"ISO"}]`
注意：**messages** 不是 message。

### GET /notices（数组 + meta）
```json
{id, title, content, img_url, tags:[], created_at:"ISO"}
```
注意：**没有 updated_at**（noticeVersion 需回退到 title+created_at）。

### GET /knowledge（数组）
```json
{id, category, title, body, updated_at:"ISO"}
```
**安全**：body 里的 `{{subscribeUrl}}` 已被服务端替换为**真实订阅链接**，渲染前必须脱敏（user-data.js 的 knowledgePlainText 已处理）。

### GET /me/nodes（数组）
```json
{id, type, version, name, rate, tags:[], is_online, last_check_at}
```
注意：节点列表里**没有 u/d 流量字段**。

### GET /traffic/logs（数组 + meta）
```json
{id, upload_bytes, download_bytes, record_at(秒级整数), server_rate}
```
注意：record_at 是**整数秒**，其它时间字段是 ISO 字符串。

### GET /invites
```json
{codes: [{code, pv, status, created_at}],
 stat: [邀请人数, 有效佣金, 待确认佣金, 佣金比例, 可用佣金]}
```
stat 是数组，索引 4 是可用佣金（单位：分）。
**没有 /invites/details 端点**，佣金记录改用 `commissions()`。

### GET /billing/commissions（数组 + meta）
```json
{id, trade_no, order_amount_minor, earned_minor, created_at:"ISO"}
```
注意：**earned_minor** 不是 get_amount。

### POST /billing/commission-transfer  body: {transfer_amount} 单位分
### POST /billing/withdrawals  body: {withdraw_method, withdraw_account}
提现方式白名单：`支付宝 / USDT / Paypal`

### GET /me/site-config（用户级配置）
```json
{is_telegram, telegram_discuss_link, stripe_pk, withdraw_methods:[], withdraw_close,
 currency, currency_symbol, commission_*_limit, ticket_must_wait_reply,
 plan_change_enable, try_out_enable, try_out_plan_id, traffic_warn_rate,
 ...admin_feature_switches}
```
开关字段：`traffic_log_enable, knowledge_enable, invite_enable, commission_enable, gift_card_enable` 等。

### POST /billing/stripe-public-key  body:{id} → data 是裸字符串 `pk_live_...`

### GET /gift-cards/history（data 是 {data:[...], pagination:{...}} 双层）
```json
{data: [{id, code(已脱敏), template_name, template_type, template_type_name,
         rewards_given, invite_rewards, multiplier_applied, created_at}],
 pagination: {current_page, last_page, per_page, total}}
```
注意：giftHistory 返回的 data 里**再嵌一层 data**。
### POST /gift-cards/check
```json
{code_info: {code, template:{name,description,type,type_name,icon,...},
             status, status_name, expires_at, usage_count, max_usage},
 reward_preview: {...}, can_redeem, reason}
```
### POST /gift-cards/redeem
```json
{message, rewards, invite_rewards, template_name}
```
注意：**没有 reward_preview** 在 redeem 里；`rewards` 是对象。

## 时间处理
- 所有 ISO 字符串用 `tx.epochMs(v)` 转毫秒、`tx.dateTime(v)` 转本地字符串、`tx.dateOnly(v)` 转日期。
- **例外**：`/traffic/logs` 的 `record_at` 是整数秒，要 `record_at*1000`。
- 绝不要再写 `new Date(Number(v)*1000)`（对 ISO 字符串会得到 Invalid Date）。

## 金额处理
- 全部字段带 `_minor` 后缀，单位分。`tx.money(minor)` 直接可用。
- 绝不要再传 `total_amount` / `balance` / `commission_balance` / `value`。

## 周期键
- 前端 `CATALOG_PERIODS` 已改为原生键（monthly/yearly/...）。
- 下单时可直接传原生键（后端 `getPeriodKey` 接受新旧两种）。
