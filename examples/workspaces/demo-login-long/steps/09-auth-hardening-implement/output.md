# auth-hardening-implement：安全加固与生产清单（示例交付）

## 产物更新
- 输出“生产清单”与“配置建议”
- 最小落地：明确 cookie 参数建议、错误策略、日志建议

## 最小落地内容
### Cookie 建议
- httpOnly: true（必选）
- sameSite: Lax（默认，防 CSRF 基线）
- secure: true（生产 HTTPS 必开）
- domain/path/maxAge：按部署形态配置

### CORS/CSRF（建议）
- 若同站：优先同站部署，避免复杂 CORS
- 若跨站：需要允许 credentials + 精确 allow-origin（不可 *）
- CSRF：若有表单/跨站请求，建议引入 CSRF token 或双重提交 cookie

### Session Store（建议）
- 生产用 Redis store
- 设定过期策略与清理

### 日志与审计（建议）
- 登录/登出记录（不记录密码）
- 失败次数统计（后续风控）

## 风险与待确认
- 若未来迁移 JWT：需要补刷新/吊销策略与黑名单方案。

## 下一步交接
- 交给 D：检查 hardening 文档是否完整、可执行，输出建议与缺漏。
