# A-clarify：需求澄清（长示例）

## 澄清结论（用于示例，已假设答案）
- 登录标识：email
- 是否需要注册：需要（最小注册 API）
- 鉴权方案：Session Cookie（HTTP-only）
- 前端 UI：不做，仅 API + curl
- DB：可用 Postgres；演示允许 SQLite
- 记住我/长会话：本轮不做
- CSRF：本轮不系统落地，仅给出同站策略与后续建议

## 冻结范围与非目标
- 范围：注册、登录、登出、/me；密码哈希；最小验收脚本；安全加固建议（不做复杂机制）。
- 非目标：OAuth/MFA/RBAC/完整 UI/风控。

## 产物更新
- brief.md：补充“按工作项交付”的验收要求（每个 work item 都要 accept 产物）。
- decisions.md：确认 3 个 work items（auth-core/auth-session/auth-hardening）。

## 关键决策
- 用 work items 分步交付：每步都有可验收产物，便于 B 调度与回放。

## 风险与待确认
- 生产环境 session store/HTTPS/cookie 策略必须补齐。
- 若跨域前端接入，需要 CORS + cookie 细节确认。

## 下一步交接
- 给 B：请据此输出拆解与每个 work item 的验收点，以及步骤队列（含 workItemId）。
