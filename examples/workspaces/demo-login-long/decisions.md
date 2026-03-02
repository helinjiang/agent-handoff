# decisions：关键决策记录（长示例）

## D1. 分工作项交付
本示例按 3 个工作项交付，逐个闭环：
- auth-core：用户模型、注册、密码哈希、基础校验
- auth-session：登录/登出、session cookie、保护路由 /me
- auth-hardening：安全加固建议与最小落地（cookie 属性、CORS/CSRF 提示、日志/错误策略）

## D2. 鉴权方案
- 采用 Session Cookie（HTTP-only），可撤销，浏览器友好
- 生产建议：Redis store + HTTPS + secure cookie

## D3. 密码存储
- bcrypt 哈希存储（password_hash）

## D4. 错误策略
- 登录失败统一“账号或密码错误”
- 注册重复邮箱可提示“邮箱已存在”（允许）

## D5. 目录与可运行性
- 输出以“可落盘文档 + 伪代码/契约”为主（示例）；真实项目应伴随代码提交。
