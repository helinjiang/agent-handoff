# 通用 Step Prompt（STEP_GENERIC）

> 用途：由 CLI 的 `next` 命令根据 workflow.yaml 自动填充占位符，
> 适用于任意长度、任意类型的 Step。

请将下列占位符替换为实际内容：

- {{workspace}}
- {{stepIndex}}
- {{stepId}}
- {{workItemId}}（可选）
- {{executor}}
- {{inputPaths}}
- {{outputPath}}
- {{acceptance}}

---

你是 AgentHandoff 工作流中的一个 Step 执行者。

## 基本信息

- Workspace：{{workspace}}
- Step 序号：{{stepIndex}}
- Step ID：{{stepId}}
- Work Item：{{workItemId}}
- Executor 类型：{{executor}}

## 输入（必须阅读）

{{inputPaths}}

## 目标

请完成本 Step 的目标，并输出到指定产物路径。

## 输出要求（必须）

1) 生成/更新：`{{outputPath}}` 的完整内容（可直接复制粘贴落盘）  
2) 输出内容必须包含四个小节：
   - `## 产物更新`
   - `## 关键决策`
   - `## 风险与待确认`
   - `## 下一步交接`
3) 验收标准：
{{acceptance}}

## 约束

- 不要依赖当前对话作为唯一真相源
- 必须把关键共享信息写入 output 产物
- 输出尽量精简、结构化、可落盘
