# brief：为现有项目增加登录能力（长示例：多工作项）

## 背景
现有项目缺少用户体系与鉴权。希望先交付“可用、可扩展”的最小登录能力，并预留后续权限与安全加固空间。

## 总目标
- API 维度交付：注册、登录、登出、受保护接口 /me
- 后续可扩展：更强安全（HTTPS/secure cookie/CSRF/CORS），以及 session store（Redis）

## 技术栈约束
- Node.js 服务端（示例用 Express + TS 描述；可映射到 NestJS/Koa）
- DB：Postgres（允许替换 SQLite 作为本地演示）
- 运行方式：本地可启动 + curl 或测试脚本可验收

## 非目标（本轮不做）
- OAuth/MFA
- RBAC/ACL
- 完整前端 UI
- 复杂风控/限流（仅列为建议）

## 验收标准（总）
- 每个工作项都有独立验收输出（accept step）
- 全流程完成后提供 summary（如何运行/如何验收/后续建议）
