# Prompt 生成规则（CLI 设计说明）

本文件说明：`agent-relay next` 如何根据 workflow.yaml 自动生成 Step Prompt。

---

## 1. 输入来源

CLI 在执行 `next <workspace>` 时：

1. 读取 workflow.yaml
2. 读取 state.json
3. 计算 currentIndex
4. 读取当前 Step 定义：
   - id
   - executor
   - input
   - output
   - acceptance（可选）

---

## 2. Prompt 拼装逻辑

使用 `prompts/STEP_GENERIC.md` 作为模板，替换占位符：

- {{workspace}} → workspace 名称
- {{stepIndex}} → 当前步骤序号（从 1 开始）
- {{stepId}} → 当前步骤 id
- {{executor}} → executor 类型（trae/shell/...）
- {{inputPaths}} → 列出输入产物路径 + 简要说明
- {{outputPath}} → workflow.yaml 中定义的 output
- {{acceptance}} → workflow.yaml 中定义的验收说明（若无则填“按上一 Step 交接执行”）

---

## 3. next 输出结构建议

执行 `agent-relay next demo-001` 时输出：

1️⃣ 当前 Step 信息
- Index / ID
- Executor 类型

2️⃣ 输入产物列表
3️⃣ 期望输出产物路径

4️⃣ 自动生成的 Prompt（可直接复制到 TRAE）

---

## 4. 可扩展点（未来）

- 根据 executor 类型选择不同模板
  - trae → STEP_GENERIC.md
  - shell → SHELL_STEP_TEMPLATE.md
  - api → API_STEP_TEMPLATE.md

- 支持 meta.json 自动生成 input 摘要

- 支持自动复制到剪贴板（v0.2）