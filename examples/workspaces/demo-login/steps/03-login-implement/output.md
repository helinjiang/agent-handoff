# login-implement 输出：实现方案与代码骨架（示例）

> 说明：这是“示例工作流产物”，用于展示 AgentHandoff 的接力与交付物形态。
> 你可以把它当成 C 在 TRAE 中实现后的总结/交接文档。
> 实际项目中，这一步会伴随真实代码提交。

## 产物更新
- 新增：用户表/模型（User）
- 新增：鉴权路由（/auth/register, /auth/login, /auth/logout）
- 新增：受保护接口（/me）
- 新增：会话中间件（session + cookie）
- 更新：README（运行与 curl 示例）

## 关键决策
- 使用 Session Cookie（HTTP-only）存储登录态：服务端可撤销，浏览器友好。
- bcrypt 存储 password_hash，不保存明文密码。
- 登录失败统一提示，避免泄露“用户是否存在”。

## 设计（Express + TypeScript 示例）

### 目录结构（建议）
- src/
  - app.ts
  - db.ts
  - models/user.ts
  - routes/auth.ts
  - routes/me.ts
  - middleware/authRequired.ts

### 数据模型（最小）
User:
- id: uuid
- email: string unique
- password_hash: string
- created_at / updated_at

### API 契约
1) POST /auth/register
- body: { email, password }
- 201: { id, email }
- 400: 校验失败/邮箱已存在（信息可适度）

2) POST /auth/login
- body: { email, password }
- 200: { ok: true }
- set-cookie: sessionId=...; HttpOnly; SameSite=Lax
- 401: { message: "账号或密码错误" }

3) POST /auth/logout
- 200: { ok: true }（清 session cookie）

4) GET /me（受保护）
- 200: { id, email }
- 401: 未登录

### 关键实现点（伪代码）
#### app.ts
- 使用 express.json()
- 配置 session middleware（express-session）
- mount routes: /auth, /me

#### /auth/register
- validate email/password
- 查重 email
- bcrypt.hash(password, saltRounds)
- insert user
- return user basic

#### /auth/login
- 查 user by email
- bcrypt.compare(password, user.password_hash)
- 失败统一返回 401 + message
- 成功：req.session.userId = user.id

#### authRequired middleware
- if !req.session.userId -> 401
- else next()

#### /me
- authRequired
- 根据 userId 取 user，返回

## 运行说明（示例）
环境变量：
- DATABASE_URL（或 sqlite 文件路径）
- SESSION_SECRET

启动：
- pnpm i
- pnpm dev
- 服务监听 :3000

## curl 验收脚本（示例）
```bash
# 注册
curl -i -X POST http://localhost:3000/auth/register   -H 'content-type: application/json'   -d '{"email":"a@test.com","password":"p@ssw0rd"}'

# 登录（保存 cookie 到 cookie.txt）
curl -i -c cookie.txt -X POST http://localhost:3000/auth/login   -H 'content-type: application/json'   -d '{"email":"a@test.com","password":"p@ssw0rd"}'

# 访问受保护接口
curl -i -b cookie.txt http://localhost:3000/me

# 登出
curl -i -b cookie.txt -X POST http://localhost:3000/auth/logout

# 再访问应 401
curl -i -b cookie.txt http://localhost:3000/me
```

## 风险与待确认
- 生产环境需要：HTTPS + secure cookie + 合理的 sameSite 策略。
- session store：生产建议 Redis；示例可用 MemoryStore。
- CSRF：若后续有前端表单，需要更完整策略（例如 CSRF token）。

## 下一步交接
- 交给 D：根据上述 curl 脚本与失败路径要求做验证，并输出测试报告。
- 输入：本文件 + decisions.md
- 输出：steps/04-login-test/output.md（包含：通过/失败、问题清单、建议）
