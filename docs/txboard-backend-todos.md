# TXBoard 后端待办（Luma 主题适配发现）

Luma 主题从 Xboard 兼容层迁移到 TXBoard 原生 `/txapi` 后，发现以下后端缺口。
每条都标注了前端当前的降级行为，便于排期。

## 1. `GET /me` 缺少 `created_at`（影响欢迎引导）

**现状**：`AccountController::me()` 返回 `id/email/plan_id/uuid/balance_minor/
commission_balance_minor/expired_at/telegram_id/traffic`，**没有注册时间**。

**影响**：`src/live/welcome-config.js` 的 `classifyWelcome` 无法区分
「刚注册的新用户」和「注册很久但一直没买套餐的老用户」，只能按套餐有无判断，
于是**所有无套餐用户都显示「欢迎加入，开启新旅程」**（`state='new'`）。
老用户看到 onboarding 文案会显得不合时宜。

**当前降级**：无套餐 → `new`；只有运营方把主题设置 `welcome_new_hours` 设为 0
才会变成 `no_plan`（「还没有订阅套餐」）。

**建议**：在 `/me` 响应中补 `created_at`（ISO 8601，与其它时间字段一致），
前端即可按注册时长区分 `new` / `no_plan`。

## 2. `GET /me/subscription` 的 `plan` 不含续费能力与重置方式

**现状**：`plan` 只有 `{id, name, traffic_limit_bytes}`。

**影响**：续费入口（`canAttemptRenew`）和流量重置资格（`canAttemptReset`）所需的
`renewable` / `reset_traffic_method` 都不在这个 DTO 里。二者实际来自
`GET /plans` 的目录条目。

**当前处理**：前端从 `/plans` 里按 `plan.id` 匹配当前套餐取这两个字段。
若当前套餐已下架（不在 `/plans` 中），续费入口按「未知则放行」处理，
最终仍由后端下单接口裁决。

**建议**：可在 `plan` 内直接带上 `renewable` 与 `reset_traffic_method`，
省掉前端的一次目录匹配；若维持现状也可接受（已有降级路径）。

## 3. `GET /knowledge` 正文会回填真实订阅链接

**现状**：`ContentReader::articleDto()` 会把正文里的 `{{subscribeUrl}}` 占位符
替换为**该账号真实的订阅地址**。

**影响**：帮助中心文章若用了这个占位符，订阅 token 会随正文下发到浏览器。
前端已在 `knowledgePlainText()` 中做正则脱敏（把 `.../client/subscribe?token=...`
替换为 `[订阅链接已隐藏]`），但这是**客户端补救**。

**建议**：若该占位符并非有意为之，考虑改为仅在明确需要时下发，
或让后端返回脱敏后的占位文本。

## 4. 原生时间格式与旧版不一致（已在前端适配，仅备忘）

所有时间字段从「秒级整数时间戳」改为 ISO 8601 字符串，
唯一例外是 `GET /traffic/logs` 的 `record_at`（仍是整数秒）。
前端已统一处理，此处仅记录该不一致，避免后续新增端点时混淆。
