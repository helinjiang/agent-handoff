# auth-session-implement：登录/登出/保护路由（示例交付）

## 产物更新
- 新增 POST /auth/login（写入 req.session.userId）
- 新增 POST /auth/logout（销毁 session）
- 新增 GET /me（authRequired）
- 增加 session cookie 配置建议（httpOnly/sameSite）

## 关键决策
- 登录失败统一返回 401 + “账号或密码错误”
- /me 使用中间件 authRequired 做保护

## 接口契约（摘要）
POST /auth/login
- body: { email, password }
- 200: { ok: true } + set-cookie
- 401: { message: "账号或密码错误" }

POST /auth/logout
- 200: { ok: true }（清 session）

GET /me
- 200: { id, email }
- 401: 未登录

## 风险与待确认
- 生产必须 HTTPS + secure cookie
- session store 生产建议 Redis（本轮仅建议）

## 下一步交接
- 交给 D：按“注册→登录→/me→登出→/me 失败 + 错误密码/未登录”做验证。
