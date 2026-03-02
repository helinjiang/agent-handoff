# login-test 输出：验证报告（示例）

## 产物更新
- 新增：手工验收脚本（curl 步骤）
- 覆盖：成功路径与失败路径清单

## 验证用例与结果
### 成功路径
1. 注册成功（201）✅
2. 登录成功，返回 200 且 set-cookie ✅
3. 携带 cookie 访问 /me 返回 200 ✅
4. 登出返回 200 ✅
5. 登出后访问 /me 返回 401 ✅

### 失败路径
1. 错误密码登录：401 + “账号或密码错误” ✅
2. 未登录访问 /me：401 ✅
3. 重复注册邮箱：返回 400（信息可控）✅

## 关键决策
- 验收脚本采用 curl + cookie jar：最小依赖、易复现。

## 风险与待确认
- 若部署在跨域前端：需要确认 CORS 与 cookie 的 sameSite/secure 配置策略。
- 生产环境 session store 需要落地（Redis）。

## 下一步交接
- 交给 B（验收）：本轮测试通过，可进入验收 Step。
- 输出：steps/05-login-accept/output.md（明确 accept.passed 或提出 fix）
