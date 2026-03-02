# auth-session-test：验证报告（示例）

## 用例与结果
- 注册→登录→/me→登出→/me 失败 ✅
- 错误密码登录：401 + 统一提示 ✅
- 未登录访问 /me：401 ✅

## 风险与待确认
- 跨域前端接入时 cookie/sameSite 需要再核对。

## 下一步交接
- 交给 B：auth-session 可验收。
