# Luma Theme 前端稳定性审查（2026-10-11）

> 基线：`main` @ `8dc2b28f41f851c9e3bd65b1460e0bfc224f0735`；最新正式 Release：`v1.0.2`。
> 范围：React 生产前台、`/txapi` API 客户端、用户会话、订阅与付款、配置、回归测试及打包。
> 本文是**代码层第一轮审查**，不是生产部署/真实支付安全认证。

## 审查结论

- 核心用户旅程（登录、套餐、订单、支付、订阅、钱包、工单）已改用 TXBoard 原生 `/txapi`，接口统一使用 `{data, meta?, request_id}` 信封。
- 主动针对会话过期、幂等充值、支付外链、订单状态轮询和 Blade 注入做了保护。项目包含 Node 单测、Playwright 演示与模拟真实 API 测试。
- 发布工作流由版本标签触发，使用 Node 22、PHP 8.2、Laravel 12 对打包 Blade 进行验证；CI 检查提交的 `theme-package/` 与源码构建同步。
- 已检查主要页面显隐条件：`LiveApp.jsx` 的商店、订单、资料、工单、节点、流量与帮助页面有 `atomicPageVisible` 渲染保护；此前只依据提示卡推断页面仍渲染的假设**不成立**。本 PR 补充“真实内容不渲染”的 E2E 断言。

## 已确认/高可信问题（按优先级）

### P1. 钱包充值日期与原生时间约定不一致

- 位置：`src/live/wallet-recharge.js` 的 `rechargeDate`；调用方 `WalletRecharge.jsx`。
- 现象：`rechargeDate` 使用 `Number(value) * 1000`，输入 ISO 8601 字符串时返回 `—`。
- 证据：`docs/txboard-native-api.md` 明确规定**除流量日志 `record_at` 外，原生时间字段为 ISO 字符串**；现有单测只验证 Unix 秒。
- 后续：先确认充值 DTO 的真实 `created_at` 格式，随后增加 ISO/空值/兼容旧数字秒的单测，修复格式化方法并同步主题资源。

### P1. 钱包充值轮询在持续网络错误时无法限次停止

- 位置：`src/live/WalletRecharge.jsx` 充值状态轮询 effect。
- 现象：每轮增加 `attempts`，但上限判断处于请求**成功**后的 `else`；当接口连续拒绝/超时，`catch` 直接吞掉错误，导致超过 20 次仍然按 4 秒继续查询。
- 后续：把次数判断放在统一执行路径，确保成功/失败均有限次；覆盖失败、状态到账、手动刷新、卸载清理与旧会话隔离。

### P1. 实际支付/回调闭环尚未经过预发验收

- 参考：PR #6 明确提示模拟接口 E2E 不等于真实支付验收。
- 后续：在受控预发环境验证：创建订单、二维码/跳转/Stripe（启用时）、支付回调、订阅生效、幂等、重复点击、支付失败、轮询超时以及取消/切回默认主题。**不得在无人确认的生产环境发起真实扣款。**

### P2. 文档、版本与测试基线同步

- README 仍保留早期 Xboard V1 及旧仓库链接；以目前 `src/live/api.js` 的 `/txapi` 为优先依据。
- `theme-package/config.json` 的提交态版本与正式 Release 的标签版本可能不同；自动发布由标签生成真实版本，需在维护文档说明。
- 仓库当前没有稳定依赖锁文件，CI 以 `npm install` 安装依赖；评估提交 `package-lock.json` 并改为 `npm ci`，避免未来依赖漂移。

## 回归基线 / 验收门槛

1. 普通演示与真实构建模式不能混用；正式构建使用 `TXBOARD_THEME=true npm run build`。
2. 新改动必须先有对应的 Node/Playwright 回归断言；**真实支付不能只用 mock 声称通过**。
3. `npm test`、`npm run test:e2e`、`npm run test:live`、生产 Vite 构建与 `npm run check:theme-package` 通过。
4. 任何生产代码修改，必须重新生成并提交 `theme-package/` 下对应的 JS/CSS/Blade 资源，保持 CI 的 stale-artifact gate 不变。
5. 预发环境跑通登录失效、账户切换、重试与轮询、后台开关、移动端及支付回调。
6. 仅合并已 review 且通过 CI 的小 PR；发布采用新版本 tag，检查 ZIP SHA-256 与升级/回滚。

## 建议推进顺序

- **第一步（当前 PR）**：建立审查记录；把隐藏路由验证从“看到提示”增强为“真实业务内容不渲染”，不修改生产功能与打包产物。
- **第二步**：钱包日期格式和有限次数轮询分别小 PR 修复；合并前同步生成主题产物。
- **第三步**：补登录/退出并发、订单状态变更、钱包充值的异常网络端到端用例。
- **第四步**：统一 README/API 合约文档，锁定依赖，预发验收并从绿色 CI 发布修订版本。
