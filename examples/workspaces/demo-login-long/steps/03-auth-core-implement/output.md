# auth-core-implement：用户模型与注册（示例交付）

## 产物更新
- 新增 User 模型（id/email/password_hash/timestamps）
- 新增 POST /auth/register
- 新增输入校验（email 格式、密码最小长度）

## 关键决策
- bcrypt 哈希存储 password_hash
- 注册重复邮箱：返回 400（可提示“邮箱已存在”）

## 接口契约（摘要）
POST /auth/register
- body: { email, password }
- 201: { id, email }
- 400: 校验失败 / 邮箱已存在

## 数据库最小表
users(
  id uuid pk,
  email text unique not null,
  password_hash text not null,
  created_at,
  updated_at
)

## 风险与待确认
- 真实项目需决定 ORM（Prisma/TypeORM/Knex）。
- 密码策略（复杂度/弱密码）本轮不做。

## 下一步交接
- 交给 D：验证注册成功/重复邮箱/校验失败三类路径，输出 auth-core-test 报告。
