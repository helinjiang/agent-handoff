# B-plan：工作项拆解与队列（长示例）

## 工作项拆解（3 个）

### WI1: auth-core
目标：用户模型 + 注册 + 密码哈希 + 基础校验
验收：
- POST /auth/register 可用
- password_hash 正确写入
- 重复邮箱处理合理

### WI2: auth-session
目标：登录/登出 + session cookie + 保护路由 /me
验收：
- POST /auth/login 成功 set-cookie
- GET /me 需要登录
- POST /auth/logout 清 session

### WI3: auth-hardening
目标：在不引入复杂系统的前提下，补齐安全与可运维建议，并最小落地一些配置
验收：
- cookie 参数（httpOnly/sameSite/secure）说明清楚
- CORS/CSRF 风险与建议清楚
- 生产清单（Redis/HTTPS/日志/错误码）清楚

## 队列策略
每个工作项采用同一节奏：implement → test → accept。
若失败：由 B 插入 fix/retest/reaccept（仍线性，不引入分支）。

## 产物更新
- workflow.yaml：已包含 workItemId 分组（auth-core/auth-session/auth-hardening）。

## 关键决策
- 先 core 再 session：降低耦合，便于逐步验收。
- hardening 独立 work item：避免把安全建议淹没在实现细节中。

## 风险与待确认
- Express/NestJS 映射：若真实项目用 NestJS，需将契约与中间件映射到 Guard/Interceptor。
- DB/ORM：示例不锁定具体 ORM，真实实现时需统一选型。

## 下一步交接
- 交给 C：先做 auth-core-implement，并在 output 中给出最小表结构与接口契约 + 运行说明。
