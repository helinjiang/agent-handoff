# 产物协议（Protocol）

本协议描述 AgentRelay 的"产物驱动协作"约定。v0.x 默认以文件作为存储，但协议本身**不绑定存储介质**（未来可替换为 DB/API）。

---

## 1. Workspace 结构

```
<workspace>/
├── workflow.yaml          # 步骤链定义
├── brief.md               # 工作流入口输入（可选）
├── decisions.md           # 关键决策记录（可选）
├── state.json             # 当前执行状态
├── events.jsonl           # 事件日志（追加式）
└── steps/
    ├── 01-<id>/
    │   ├── input.md       # 该步骤输入摘要
    │   ├── output.md      # 该步骤输出产物
    │   └── meta.json      # 机器可读摘要（可选）
    ├── 02-<id>/
    │   └── ...
    └── ...
```

---

## 2. 核心产物定义

### 2.1 workflow.yaml

步骤链定义文件。

**必填字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 工作流名称 |
| `steps` | array | 步骤数组（线性队列） |

**Step 字段**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 步骤标识 |
| `executor` | string | ✅ | 执行端（trae/shell/manual/api） |
| `input` | string | ✅ | 输入产物路径 |
| `output` | string | ✅ | 输出产物路径 |
| `workItemId` | string | ❌ | 工作项标识（用于分组） |
| `acceptance` | string[] | ❌ | 验收要点 |

**示例**：

```yaml
name: demo-login
steps:
  - id: a-clarify
    executor: trae
    input: brief.md
    output: steps/01-a-clarify/output.md
    acceptance:
      - 补齐需求澄清问题与明确范围/非目标
      - 产出可执行的 brief+decisions 补充建议

  - id: login-implement
    workItemId: login
    executor: trae
    input: steps/02-b-plan/output.md
    output: steps/03-login-implement/output.md
    acceptance:
      - 实现注册/登录/登出/受保护接口（API）
      - 密码哈希存储与基础校验

  - id: login-test
    workItemId: login
    executor: trae
    input: steps/03-login-implement/output.md
    output: steps/04-login-test/output.md

  - id: login-accept
    workItemId: login
    executor: trae
    input: steps/04-login-test/output.md
    output: steps/05-login-accept/output.md
```

---

### 2.2 state.json

当前执行状态。

**字段定义**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `currentIndex` | number | 当前步骤索引（0-based，指向下一个待执行的步骤） |
| `status` | string | 状态：running / done / blocked |
| `updatedAt` | string | 最后更新时间（ISO 8601） |
| `blockedReason` | string | 阻塞原因（仅 status=blocked 时） |

**示例**：

```json
{
  "currentIndex": 0,
  "status": "done",
  "updatedAt": "2026-03-01T00:00:00+08:00"
}
```

**状态推进规则**：

1. 若 `steps[i].output` 不存在或为空 → `currentIndex = i`，`status = running`
2. 若 `steps[i].output` 存在且有效 → `currentIndex++`
3. 若 `currentIndex` 超过最后一步 → `status = done`
4. 若验证失败或阻塞 → `status = blocked`，记录 `blockedReason`

---

### 2.3 output.md

每个步骤的输出产物，**必须落盘**。

**推荐结构**（统一尾部模板）：

```markdown
# <step-id> 输出：<一句话摘要>

## 产物更新
- 新增/修改了哪些文件（路径 + 摘要）

## 关键决策
- 做了哪些关键选择，为什么

## 风险与待确认
- 不确定点、需要人确认的问题

## 下一步交接
- 下一 Step 要做什么
- 输入是什么
- 期望输出是什么
```

---

### 2.4 meta.json（可选）

机器可读摘要，用于 Timeline / 检索。

**字段定义**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `summary` | string | 一句话摘要 |
| `decisions` | string[] | 关键决策列表 |
| `risks` | string[] | 风险点列表 |
| `next` | string | 下一步建议 |

**示例**：

```json
{
  "summary": "完成登录 API 实现与会话逻辑",
  "decisions": [
    "使用 Session Cookie（HTTP-only）存储登录态",
    "bcrypt 存储 password_hash"
  ],
  "risks": [
    "生产环境需要 HTTPS + secure cookie"
  ],
  "next": "交给 D 验证测试"
}
```

---

## 3. 事件日志（events.jsonl）

追加式事件日志，用于时间线展示和审计。

### 3.1 事件结构

每行一个 JSON 对象：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ts` | string | ✅ | 时间戳（ISO 8601） |
| `step` | object | ✅ | 步骤信息 `{ index, id }` |
| `workItemId` | string | ❌ | 工作项标识 |
| `type` | string | ✅ | 事件类型 |
| `summary` | string | ✅ | 一句话摘要 |
| `links` | string[] | ❌ | 关联产物路径 |

### 3.2 事件类型

| 类型 | 说明 | 示例场景 |
|------|------|----------|
| `step.started` | 步骤开始 | 开始执行某步骤 |
| `step.done` | 步骤完成 | 步骤输出已落盘 |
| `artifact.updated` | 产物更新 | output.md 写入 |
| `workflow.updated` | 工作流更新 | 动态插入/追加步骤 |
| `verify.passed` | 验证通过 | 测试步骤通过 |
| `verify.failed` | 验证失败 | 测试步骤失败 |
| `accept.passed` | 验收通过 | 验收步骤通过 |
| `accept.failed` | 验收失败 | 验收步骤失败 |
| `issue.raised` | 问题提出 | 遇到阻塞/风险 |
| `handoff.sent` | 交接发出 | 明确交接给下一步 |

### 3.3 示例

```jsonl
{"ts": "2026-03-01T09:00:00+08:00", "step": {"index": 1, "id": "a-clarify"}, "type": "step.started", "summary": "开始需求澄清", "links": ["brief.md", "decisions.md"]}
{"ts": "2026-03-01T09:20:00+08:00", "step": {"index": 1, "id": "a-clarify"}, "type": "artifact.updated", "summary": "补充澄清问题与范围", "links": ["steps/01-a-clarify/output.md"]}
{"ts": "2026-03-01T09:25:00+08:00", "step": {"index": 1, "id": "a-clarify"}, "type": "step.done", "summary": "需求澄清完成", "links": ["steps/01-a-clarify/output.md"]}
{"ts": "2026-03-01T10:05:00+08:00", "step": {"index": 2, "id": "b-plan"}, "type": "workflow.updated", "summary": "生成工作项与步骤队列建议", "links": ["steps/02-b-plan/output.md", "workflow.yaml"]}
{"ts": "2026-03-01T12:25:00+08:00", "step": {"index": 4, "id": "login-test"}, "workItemId": "login", "type": "verify.passed", "summary": "测试通过", "links": ["steps/04-login-test/output.md"]}
{"ts": "2026-03-01T12:45:00+08:00", "step": {"index": 5, "id": "login-accept"}, "workItemId": "login", "type": "accept.passed", "summary": "验收通过", "links": ["steps/05-login-accept/output.md"]}
```

---

## 4. 工作项（Work Item）

### 4.1 概念

Work Item 是一个轻量分组概念，用于：
- 提升可读性（相关步骤聚合）
- 时间线过滤
- 验收追踪

### 4.2 约定

- Work Item **不是** DAG，不引入并行/分支
- 同一 `workItemId` 的步骤建议在 workflow 中相对集中
- 不要求预先声明 work item 列表
- 典型模式：`<workItem>-implement` → `<workItem>-test` → `<workItem>-accept`

### 4.3 命名建议

- 使用简短标识：`login`、`auth-core`、`auth-session`
- 避免特殊字符

---

## 5. 校验规则（v0.x）

### 5.1 workflow.yaml 校验

- [ ] YAML 格式正确
- [ ] `name` 字段存在
- [ ] `steps` 数组非空
- [ ] 每个 step 必填字段完整（id/executor/input/output）
- [ ] `output` 路径以 `steps/` 开头

### 5.2 产物校验

- [ ] `state.json` 格式正确
- [ ] 每个 step 的 `output.md` 存在时非空
- [ ] `output.md` 包含推荐区块（v0.2 增强）

### 5.3 状态一致性

- [ ] `currentIndex` 与产物存在性一致
- [ ] `status=done` 时所有 step 的 output 都存在

---

## 6. 动态演进规则

workflow.yaml 在运行过程中允许被更新：

### 6.1 允许的操作

| 操作 | 说明 | 示例 |
|------|------|------|
| `insertAfter(index, steps[])` | 在指定步骤后插入 | 验收失败后插入 fix 步骤 |
| `append(steps[])` | 追加步骤 | 新增工作项 |
| `markBlocked(reason)` | 标记阻塞 | 遇到无法解决的问题 |

### 6.2 操作约束

1. 更新 `workflow.yaml`
2. 更新 `state.json`（如必要）
3. 追加 `events.jsonl` 记录（`workflow.updated` 事件）

### 6.3 示例：插入修复步骤

验收失败后，B 可以插入修复步骤：

```yaml
# 原步骤
steps:
  - id: login-implement
  - id: login-test
  - id: login-accept      # 失败
  - id: b-summary

# 动态插入后
steps:
  - id: login-implement
  - id: login-test
  - id: login-accept      # 失败
  - id: login-fix         # 新增
    workItemId: login
    executor: trae
    input: steps/05-login-accept/output.md
    output: steps/06-login-fix/output.md
  - id: login-retest      # 新增
    workItemId: login
    executor: trae
    input: steps/06-login-fix/output.md
    output: steps/07-login-retest/output.md
  - id: login-reaccept    # 新增
    workItemId: login
    executor: trae
    input: steps/07-login-retest/output.md
    output: steps/08-login-reaccept/output.md
  - id: b-summary
```

同时追加事件：

```json
{"ts": "2026-03-01T14:00:00+08:00", "step": {"index": 5, "id": "login-accept"}, "type": "accept.failed", "summary": "验收失败：密码强度校验缺失", "links": ["steps/05-login-accept/output.md"]}
{"ts": "2026-03-01T14:05:00+08:00", "step": {"index": 5, "id": "login-accept"}, "type": "workflow.updated", "summary": "插入修复步骤：login-fix → login-retest → login-reaccept", "links": ["workflow.yaml"]}
```
