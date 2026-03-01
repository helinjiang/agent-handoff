# AgentRelay 技术方案（TECH_SPEC）

版本：v0.x（TRAE-first）  
定位：轻量级多 Agent 协作接力工具（产品型工具，而非重型基础设施）


## 1. 背景与目标

AI Coding 场景常见问题：

- 单一 Agent 上下文易膨胀，导致质量下降
- 不同模型/Agent 擅长点不同，需要分工
- 多任务（Task）上下文隔离，协作困难
- 手动交接容易丢关键信息

TRAE 支持多 Task，但缺少“跨 Task 协作协议 + 可回放流程”。


AgentRelay 的目标：通过“**线性步骤链（Step Pipeline）+ 产物驱动（Artifact-first）**”实现多 Agent 协作：上一步骤产物交给下一步骤作为输入，在上下文隔离前提下尽可能共享关键信息。

### 1.1 入口模型说明（从 brief 到 workflow）

在实际使用中，**workflow.yaml 不是用户直接编写的入口文件**。

推荐入口模型为：

1. 用户提供原始需求描述（自然语言 Prompt）。
2. 由 A（秘书角色）进行需求澄清，输出：
   - brief.md（结构化需求）
   - decisions.md（关键技术与范围决策）
3. 由 B（技术负责人）基于 brief 与 decisions 生成第一版 workflow.yaml。

因此：

- workflow.yaml 是“当前执行队列的快照”，而不是最初入口。
- workflow.yaml 可以在执行过程中被 B 动态调整（插入、追加、替换步骤）。
- 所有调整必须记录到产物与 events.jsonl 中，确保可回放。

### 核心目标
1. 支持**可变长度**步骤链（2 步到 N 步）
2. 上一步输出 → 下一步输入（队列式接力）
3. 产物驱动、可回放、可审计
4. TRAE-first（无 API 场景也能跑），执行端可扩展
5. 为未来 Web 时间线查看预留数据结构

### 非目标（v0.x）
- 不做 DAG/并行/复杂分支调度（保持克制）
- 不做单智能体自主循环 UI Agent 框架（非 OpenClaw 类）
- 不做企业级平台化能力（多租户/权限/计费等）


## 2. 核心概念

- **Workflow**：一次完整协作流程（一个 workspace）
- **Step**：线性队列中的一步（AI / 人 / Shell / UI / API）
- **Artifact**：步骤输入/输出产物（文件/DB/API 记录；v0 默认文件）
- **Executor**：步骤执行端（TRAE-first）
- **State**：当前执行进度、失败/阻塞信息
- **EventLog**：追加式事件日志（用于时间线）


## 3. 总体架构

### 3.1 Core（核心层）
职责：
- Workflow/Step/Artifact 模型
- 状态机（next step 推导）
- 产物校验
- Prompt 组装（assisted mode）

约束：Core 不包含任何 TRAE UI 细节。

### 3.2 Orchestrator（编排层）
职责：
- 读取 workspace（workflow + state + artifacts）
- 计算下一步 step
- 输出下一步指令（next）
- （可选）监听产物变更，自动推进 state

### 3.3 Executors / Adapters（执行层）
短期：TRAE-first
- v0：辅助模式（生成 prompt + 指引）
- v0.2：半自动（剪贴板/更强指引）
- v0.3：自动（视觉/UI 自动化，可选）

长期：可扩展到 LLM API / Shell / HTTP 等。


## 4. Workflow 定义（workflow.yaml）

workflow.yaml 描述线性步骤链（有序数组），每一步声明：
- id：步骤标识
- executor：执行端（trae / shell / api / manual...）
- input：输入产物引用（路径或 artifact ref）
- output：输出产物路径（建议在 steps/<nn>-<id>/output.md）
- acceptance：验收要点（可选）

示例：
```yaml
name: demo-001
steps:
  - id: analyze
    executor: trae
    input: brief.md
    output: steps/01-analyze/output.md
  - id: implement
    executor: trae
    input: steps/01-analyze/output.md
    output: steps/02-implement/output.md
  - id: test
    executor: shell
    input: steps/02-implement/output.md
    output: steps/03-test/output.md
```

> v0.x 只支持线性 steps 数组，不支持分支/并行。

### 4.1 动态演进模型（由 B 维护队列）

workflow.yaml 在运行过程中允许被更新，典型场景包括：

- 插入修复步骤（例如 x-fix、x-retest、x-reaccept）
- 追加新的工作项
- 调整后续步骤顺序
- 提前结束流程

推荐的最小操作集合（线性模型内）：

- insertAfter(stepIndex, newSteps[])
- append(newSteps[])
- markBlocked(reason)

所有修改必须：

1. 更新 workflow.yaml
2. 更新 state.json（如必要）
3. 追加 events.jsonl 记录（例如 workflow.updated）

注意：

- 仍然保持“线性步骤链”，不引入 DAG 或并行结构。
- 动态演进不等于复杂调度，仍然以简单可回放为第一原则。


## 5. Workspace 结构与产物协议

推荐结构：
- workflow.yaml
- brief.md（可选：工作流入口输入）
- steps/<nn>-<id>/{input.md, output.md, meta.json}
- state.json
- events.jsonl（追加式日志）

### 5.1 input.md / output.md 约定
- input.md：本 step 的输入摘要（可引用上一步 output）
- output.md：本 step 的最终产物（必须落盘）

### 5.2 meta.json（可选）
用于机器可读摘要（供 timeline/检索）：
- summary
- decisions
- risks
- next


## 6. 状态机（State Machine）

state.json（v0 简化）：
```json
{
  "currentIndex": 0,
  "status": "running",
  "updatedAt": "2026-03-01T00:00:00+08:00"
}
```

推进规则（v0）：
- 若 steps[i].output 不存在/为空 → next = i
- 若 steps[i].output 存在且有效 → i++
- 若 i 超过最后一步 → DONE
- 若验证失败/阻塞 → status=blocked，并记录原因（v0 先写在 output.md 的风险区）


## 7. CLI 设计（v0.1）

命令建议：
- `agent-relay init <name>`：生成 workspace 模板（workflow.yaml + steps 目录）
- `agent-relay status <workspace>`：显示当前 step、缺失/完成情况
- `agent-relay next <workspace>`：输出下一步执行指令 + 该 step 的 prompt（TRAE assisted）
- `agent-relay validate <workspace>`（可选）：校验 workflow 与产物结构
- `agent-relay export --format=web <workspace>`（规划）：导出静态时间线页面

`next` 输出应包含：
- step 序号/ID
- executor 类型（例如 trae）
- 输入产物路径
- 期望输出产物路径
- 生成的 prompt（可直接粘贴到 TRAE）


## 8. TRAE 执行端方案（TRAE-first）

### v0：辅助模式（优先落地）
- 生成 prompt
- 用户手动创建 TRAE Task 并粘贴
- 完成后将结果写回 output.md

### v0.2：半自动
- 自动复制 prompt 到剪贴板
- 输出规范化 Task 命名与回填指引

### v0.3：自动模式（可选）
- 通过视觉/模板匹配实现：点击“+新任务”→输入→提交→等待✅
- 记录动作日志与关键截图
- 失败可降级到辅助模式

> UI 自动化仅属于 adapter-trae，不进入 core。


## 9. EventLog 与 Web 时间线（规划）

为实现“线性查阅交接”，引入追加式日志：`events.jsonl`（JSON Lines）。

事件类型（最小集合）：
- stage/step：`step.started`、`step.done`
- artifacts：`artifact.updated`
- handoff：`handoff.sent`
- issues：`issue.raised`
- verify：`verify.passed`、`verify.failed`
- accept：`accept.passed`、`accept.failed`
- workflow：`workflow.updated`

每条事件包含：时间、step、类型、关联产物、摘要、元信息。

Web Viewer（v0.4 规划）：
- Timeline：按时间线展示 events
- 点击事件展开查看关联产物（input/output）
- 支持过滤（step/executor/issue）

形态优先：`export --format=web` 静态导出（易分享/归档）。


## 10. 风险与边界

- UI 自动化脆弱：TRAE UI 更新可能导致模板失效 → 必须可降级
- 权限敏感：Accessibility/Screen Recording → 默认关闭自动化
- 过度抽象：v0 只做线性链 + assisted mode，避免引入 DAG/平台化


## 11. 演进路线

- v0.1：CLI + workspace 模板 + assisted next
- v0.2：validation + clipboard + events.jsonl 规范化
- v0.3：TRAE UI 自动化 adapter（可选）
- v0.4：Web Timeline Viewer（静态导出）
- v0.5：多 workspace 索引、搜索、diff


## 12. 与 OpenClaw 的边界

AgentRelay 关注“多 Agent 协作与接力编排（workflow/steps）”。  
OpenClaw 类关注“单 Agent 自主感知-行动循环”。  

我们可借鉴其动作原语与可观测性设计，但不以自主循环为目标。

## 13. 典型使用流（A / B / C / D 多轮协作）

一个推荐的真实协作模式如下：

阶段 1：需求澄清  
- A 输出 brief.md 与 decisions.md。

阶段 2：初始规划  
- B 生成第一版 workflow.yaml。
- workflow 展开为具体步骤，例如：
  - x-implement
  - x-test
  - x-accept
  - y-implement
  - y-test
  - y-accept
  - …

阶段 3：执行循环（以 x 为例）
1. C 实现 → 更新 output.md → step.done
2. D 验证 → verify.passed / verify.failed
3. B 验收：
   - 通过 → accept.passed → 进入 y
   - 不通过 → 插入修复步骤（例如 x-fix）

阶段 4：总结收尾  
- 所有步骤完成后，B 生成总结产物（例如 summary.md）。
- state.json 标记为 done。
- events.jsonl 形成完整时间线。

此模型强调：

- 技术负责人（B）对整体结果负责。
- 实现与验证可以多轮往返。
- 所有协作通过产物驱动，而不是依赖对话上下文。
