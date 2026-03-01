# 产物协议（protocol）

本协议描述 AgentRelay 的“产物驱动协作”约定。v0.x 默认以文件作为存储，但协议本身**不绑定存储介质**（未来可替换为 DB/API）。

---

## 1. 产物类型

### 1.0 工作项（Work Item）抽象（轻量引入）

为提升可读性与可追踪性，AgentRelay 在保持“线性步骤链”的前提下，引入一个轻量概念：**工作项（Work Item）**。

- Work Item 表示一个相对独立、可验收的“交付单元”（例如登录能力、注册能力、登录态保持等）。
- 一个 Work Item 通常会展开为若干线性 Step，例如：
  - `<workItem>-implement`
  - `<workItem>-test`
  - `<workItem>-accept`
- Work Item **不是** DAG，也不引入并行/分支；它只是给 Step 增加一个“分组标识”，便于阅读、验收与时间线过滤。

v0.x 的落地方式非常克制：
- 在 `workflow.yaml` 的每个 step 上增加可选字段 `workItemId`
- 事件日志（events.jsonl）中也可携带 `workItemId`（可选）

---

### 1.1 Workflow 定义

- `workflow.yaml`：步骤链定义（steps 顺序、输入输出、executor）

---

### 1.2 Step 产物（推荐）

每个 step 一个目录：`steps/<nn>-<id>/`

- `input.md`：该 step 的输入摘要（可引用上一步 output）
- `output.md`：该 step 的最终输出（必须落盘）
- `meta.json`（可选）：机器可读摘要（summary/decisions/risks/next）

---

### 1.3 状态与事件

- `state.json`：当前执行进度（currentIndex/status）
- `events.jsonl`：追加式事件日志（用于时间线）

---

## 2. 最小字段约定

### 2.1 workflow.yaml（最小字段）

- `name`：工作流名称
- `steps[]`：有序数组（线性队列）
  - `id`：步骤标识（字符串）
  - `executor`：执行端（trae/shell/manual/...）
  - `input`：输入产物路径或引用
  - `output`：输出产物路径
  - `workItemId`（可选）：工作项标识（用于分组/时间线过滤）
  - `acceptance`（可选）：验收要点（字符串数组）

示例（带工作项分组）：

```yaml
name: demo-login
steps:
  - id: clarify
    executor: trae
    input: brief.md
    output: steps/01-clarify/output.md

  - id: login-implement
    workItemId: login
    executor: trae
    input: steps/01-clarify/output.md
    output: steps/02-login-implement/output.md

  - id: login-test
    workItemId: login
    executor: trae
    input: steps/02-login-implement/output.md
    output: steps/03-login-test/output.md

  - id: login-accept
    workItemId: login
    executor: trae
    input: steps/03-login-test/output.md
    output: steps/04-login-accept/output.md
```

> 说明：`workItemId` 仅用于“分组与可读性增强”，不改变线性执行语义。

---

### 2.2 output.md（推荐结构）

每个 step 的 output.md 建议包含：

- 产物更新（写了啥、改了啥）
- 关键决策（为什么这么做）
- 风险与待确认（卡点/不确定）
- 下一步交接（下一步要做什么、输入输出）

---

## 3. 事件日志（events.jsonl）

一行一个 JSON（追加写入），建议字段：

- ts：时间（ISO 8601）
- step：步骤信息（index/id）
- workItemId：工作项标识（可选，用于时间线过滤）
- type：事件类型（artifact.updated / step.done 等）
- summary：一句话摘要
- links：关联产物路径数组（可选）
- meta：扩展字段（可选）

---

## 4. 校验规则（v0.x 最小）

- workflow.yaml 可解析，steps 数组非空
- 每个 step 的 output 路径合法
- status/next 逻辑只依赖：output 是否存在 & 非空（v0 最简）

若存在 `workItemId`：

- 允许重复（多个 step 属于同一 work item）
- 不要求预先声明 work item 列表
- 建议同一 workItemId 的步骤在 workflow 中相对集中（便于阅读），但不做强制校验
