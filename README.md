# AgentRelay

一个轻量级的多 Agent 协作工具，用于在 **隔离的上下文之间进行任务接力（Relay）**。

AgentRelay 采用“**步骤链（Step Pipeline）**”的方式组织协作：上一步骤的产物作为下一步骤的输入。步骤数量不固定：可以只有 2 步，也可以有 7–8 步；按需插入、回退、重跑。

> 短期聚焦：TRAE 多任务（Task）协同（无 API，优先辅助模式，后续可选 UI 自动化）。  
> 长期演进：执行端可插拔（TRAE / LLM API / Shell / 外部系统），存储可替换（文件 / DB / API）。


## 你能用 AgentRelay 做什么

- 把一个大任务拆成多个独立上下文的步骤（避免单个上下文爆炸）
- 让不同 Agent/模型各做擅长的步骤（规划、实现、测试、文档等）
- 通过结构化“交接产物”共享关键上下文（而不是依赖聊天记录）
- 用时间线（规划）追踪：谁在什么时候产出了什么、交给了谁、卡点在哪


## 核心概念

- **Workflow**：一次完整的协作流程（一个工作空间/项目）
- **Step**：一个有序步骤（AI / 人 / Shell / UI / API）
- **Artifact**：步骤输入/输出产物（v0.x 默认用文件）
- **Executor**：执行端适配（TRAE-first）
- **State**：当前执行到哪一步、完成/失败信息


## v0.x 范围（MVP 思路）

- 生成工作空间模板（workflow.yaml + steps 目录）
- 根据产物判断“下一步该做什么”（next）
- 生成可复制粘贴到 TRAE 的步骤 Prompt（assisted mode）
- 记录基本事件日志（events.jsonl，为 Web 时间线预留）


## 这不是啥

- 不是 OpenClaw 那类“单智能体 observe→act 自主循环”的 UI Agent 框架
- 不是企业级工作流/调度平台（不做复杂 DAG/并行/多租户）


## 文档

- 技术方案：docs/TECH_SPEC.md
- 产物协议：docs/protocol.md
- 路线图：docs/roadmap.md
- AI Coding 协作规范：AGENTS.md
- Prompt 模板：prompts/
