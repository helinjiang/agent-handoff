# decisions：关键决策记录

## D1. 鉴权方案
- 选择：Session Cookie（HTTP-only）或 JWT（二选一）
- 本示例采用：**Session Cookie（HTTP-only）**，原因：实现简单、对浏览器友好、易撤销（服务端可删 session）。
- 若未来需要跨端：可替换为 JWT，协议不变。

## D2. 密码存储
- 使用 bcrypt（推荐）
- 存储：password_hash（不存明文）

## D3. 用户模型最小字段
- id（uuid）
- email（unique）
- password_hash
- created_at / updated_at

## D4. 错误信息策略
- 登录失败统一返回“账号或密码错误”，不泄露具体原因
