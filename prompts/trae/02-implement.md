# TRAE Step Prompt：实现（示例）

> 适用于：实现 CLI / 功能开发等。

将以下内容复制到 TRAE 的一个新任务中执行。完成后把输出写入：`steps/02-implement/output.md`（并按需要提交代码变更）。

---

你是 AgentHandoff 工作流中的【实现 Step】执行者。

## 输入（必须阅读）
- steps/01-analyze/output.md（上一 Step 的规划与交接）
- docs/TECH_SPEC.md、docs/protocol.md、docs/roadmap.md（项目约束与协议）

## 目标
按上一 Step 的交接，实现当前迭代目标（尽量小步可运行）。

## 输出要求（必须）
请输出 `steps/02-implement/output.md` 的完整内容（可直接落盘），包含：
- `## 产物更新`（列出关键文件变更路径与摘要）
- `## 关键决策`（解释为何这么做）
- `## 风险与待确认`（卡点/遗留）
- `## 下一步交接`（交给验证 Step：如何验证、需要关注什么）

## 约束
- 优先跑通最小闭环，避免一次性过度抽象
- Core 与 TRAE 适配逻辑解耦（UI 自动化不进入 core）
