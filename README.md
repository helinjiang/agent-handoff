# AgentRelay

一个轻量级的多 Agent 协作工具，用于在 **隔离的上下文之间进行任务接力（Relay）**。

> 目标：让不同 Agent（A / B / C...）各司其职，在避免单一超大上下文的前提下，通过结构化交接实现"可控共享"的协作。


## 为什么需要 AgentRelay

在 AI Coding 场景中：

- 单个 Agent 上下文容易爆炸
- 不同模型擅长点不同
- 多任务之间上下文往往隔离
- 手动交接容易丢信息

AgentRelay 提供一种简单的"接力式"协作流程：

-  **A：分析与规划**
-  **B：实现与执行**
-  **C：验证与评估**

如果 B 发现规划不合理，可以回传给 A 重新调整。


## 它是什么 / 它不是什么

### ✅ AgentRelay 是

- 一个务实的多 Agent 协作工具
- 基于"产物（Artifact）驱动"的工作流
- 可插拔执行端（当前聚焦 TRAE，未来可扩展）
- 强调可回放、可审计、可演进


### ❌ AgentRelay 不是

- 一个完全自主循环的 UI Agent 框架（例如 OpenClaw 那类 observe → act
    循环）
- 一个企业级 AI 基础设施平台


## 核心概念

-  **阶段（Stage）**：A / B / C
-  **产物（Artifacts）**：brief、plan、handoff、result、verify、report
-  **状态机（State Machine）**：根据产物推进阶段流转
-  **执行端（Executor）**（规划中）：
  - TRAE（手动 → 半自动 → 自动）
  - 未来：LLM API、Shell、HTTP 等


## MVP 范围（v0）

- 初始化工作空间模板
- 基于产物存在与否判断当前阶段
- 生成可粘贴到 TRAE 的提示词（辅助模式）
- 基础状态查看能力

