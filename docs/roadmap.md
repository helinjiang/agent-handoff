# AgentHandoff 路线图

本文档定义 AgentHandoff 的版本规划与里程碑。

---

## 版本概览

| 版本 | 主题 | 核心能力 | 状态 |
|------|------|----------|------|
| v0.1 | MVP | CLI 基础 + workspace 管理 + TRAE 辅助模式 | ✅ 完成 |
| v0.2 | 增强 | validation + clipboard + events.jsonl 规范化 | ✅ 完成 |
| v0.3 | 自动化 | TRAE UI 自动化 adapter（可选） | ✅ 完成 |
| v0.4 | 可视化 | Web Timeline Viewer（静态导出） | 💡 设想中 |
| v0.5 | 扩展 | 多 workspace 索引、搜索、diff | 💡 设想中 |

---

## v0.1：MVP

### 目标

实现最小可用的产物驱动协作流程，支持 TRAE 辅助模式。

### 核心能力

1. **workspace 管理** - 创建、检测、展示工作空间状态
2. **workflow 解析** - 读取 workflow.yaml，理解步骤定义
3. **状态机** - 根据 output.md 存在性推进 currentIndex
4. **TRAE 辅助** - 生成可粘贴的 prompt

### 里程碑

| 里程碑 | 目标 | 验收标准 |
|--------|------|----------|
| M1 | 项目骨架 | TypeScript 项目可编译，CLI 可运行 `--help` |
| M2 | init 命令 | 能创建标准 workspace 结构（与 demo-login 一致） |
| M3 | status 命令 | 能显示当前 step、产物完成状态 |
| M4 | next 命令 | 能输出 TRAE prompt（含输入输出路径、验收标准） |
| M5 | 发布 | npm 发布，可全局安装使用 |

### 任务清单

#### T-001：项目初始化

**产物**：
- `package.json` - 项目配置
- `tsconfig.json` - TypeScript 配置
- `src/index.ts` - CLI 入口
- `vitest.config.ts` - 测试配置

**验收**：
- `pnpm build` 成功
- `pnpm test` 可运行
- `node dist/index.js --help` 显示帮助

---

#### T-002：CLI 框架

**产物**：
- `src/cli/index.ts` - CLI 主入口
- `src/cli/commands/` - 命令目录

**验收**：
- `agent-handoff --version` 显示版本
- `agent-handoff --help` 显示帮助
- 支持 subcommand 模式（init/status/next）

---

#### T-003：Core 模块 - 模型定义

**产物**：
- `src/core/models/workflow.ts` - Workflow/Step 类型定义
- `src/core/models/state.ts` - State 类型定义
- `src/core/models/event.ts` - Event 类型定义
- `src/core/models/artifact.ts` - Artifact 类型定义

**验收**：
- 类型与 TECH_SPEC 定义一致
- 能解析 demo-login/workflow.yaml
- 单元测试覆盖

---

#### T-004：Core 模块 - Workspace 读取

**产物**：
- `src/core/workspace.ts` - Workspace 读取逻辑
- `src/core/workflow-parser.ts` - workflow.yaml 解析

**验收**：
- 能读取 workspace 目录结构
- 能解析 workflow.yaml 为 Workflow 对象
- 能读取 state.json
- 能检测各 step 的 output.md 是否存在

---

#### T-005：Core 模块 - 状态机

**产物**：
- `src/core/state-machine.ts` - 状态推进逻辑

**验收**：
- 实现 nextStep 推导逻辑
- 支持 running/done/blocked 状态
- 能处理边界情况（最后一步、空 workflow）

---

#### T-006：init 命令

**产物**：
- `src/cli/commands/init.ts` - init 命令实现

**验收**：
- `agent-handoff init demo-xxx` 创建标准 workspace 结构：
  - workflow.yaml（模板）
  - state.json（初始状态）
  - brief.md（模板）
  - steps/ 目录
- 目录已存在时提示错误
- 支持 `--path` 指定父目录

---

#### T-007：status 命令

**产物**：
- `src/cli/commands/status.ts` - status 命令实现

**验收**：
- 显示 workflow 名称
- 显示当前 step（序号、id、executor）
- 显示各 step 完成状态（✅/⬜）
- 显示总体状态（running/done/blocked）
- 支持 `--json` 输出

---

#### T-008：Prompt 模板系统

**产物**：
- `src/core/prompt-generator.ts` - Prompt 生成逻辑
- `src/templates/prompts/` - Prompt 模板文件

**验收**：
- Prompt 包含：step 信息、输入产物路径、输出产物路径、验收标准
- 模板支持变量替换
- 生成的 Prompt 可直接粘贴到 TRAE

---

#### T-009：next 命令

**产物**：
- `src/cli/commands/next.ts` - next 命令实现

**验收**：
- 输出当前 step 信息
- 输出需要读取的产物列表
- 输出需要输出的产物路径
- 输出生成的 TRAE prompt
- workflow 完成时提示无下一步

---

#### T-010：发布准备

**产物**：
- `package.json` - bin 入口配置
- `CHANGELOG.md` - 变更日志
- `README.md` - 使用说明

**验收**：
- `npm publish --dry-run` 成功
- 全局安装后 `agent-handoff` 命令可用
- 文档包含快速开始指南

---

## v0.2：增强版本

### 目标

提升易用性，规范化 events.jsonl 写入。

### 核心能力

1. **产物校验** - 校验 output.md 包含必要区块
2. **剪贴板集成** - 自动复制 prompt 到剪贴板
3. **事件日志** - 自动追加 events.jsonl
4. **配置文件** - 支持 `.agenthandoffrc`

### 任务清单

| 任务 | 描述 | 优先级 |
|------|------|--------|
| T-011 | 产物校验（检查 output.md 结构） | P0 ✅ |
| T-012 | 剪贴板集成（自动复制 prompt） | P0 ✅ |
| T-013 | events.jsonl 写入（step.started/step.done） | P0 ✅ |
| T-014 | 配置文件支持 | P1 ✅ |
| T-015 | `agent-handoff advance` 命令 | P1 ✅ |

---

## v0.3：自动化版本

### 目标

支持基于视觉的 TRAE 自动化执行（可选功能）。

### 核心能力

1. **视觉识别** - 识别 TRAE 界面元素
2. **自动输入** - 自动输入 prompt
3. **操作录制** - 记录操作日志
4. **降级机制** - 失败时回退到辅助模式

### 技术选型

- Nut.js：桌面自动化（键盘/鼠标模拟 + 视觉识别）
- 图像匹配：界面元素定位

### 任务清单

| 任务 | 描述 | 优先级 |
|------|------|--------|
| T-016 | TRAE 视觉元素识别 | P0 ✅ |
| T-017 | 自动输入 prompt | P0 ✅ |
| T-018 | 操作日志记录 | P1 ✅ |
| T-019 | 错误恢复与降级 | P1 ✅ |

补充：
- `agent-handoff report`：读取 workspace 下 `operations/*.jsonl` 并生成 json/markdown/html 报告（v0.3 期间新增）

---

## v0.4：可视化版本

### 目标

提供 Web Timeline Viewer，支持静态导出。

### 核心能力

1. **Timeline 展示** - 按 events.jsonl 渲染时间线
2. **产物查看** - 点击事件查看关联产物
3. **静态导出** - `agent-handoff export --format=web`
4. **过滤筛选** - 按 step/workItemId/type 过滤

### 任务清单

| 任务 | 描述 | 优先级 |
|------|------|--------|
| T-020 | Timeline 组件 | P0 |
| T-021 | 产物查看器 | P0 |
| T-022 | 静态导出命令 | P0 |
| T-023 | 过滤与搜索 | P1 |

---

## v0.5：扩展版本

### 目标

支持多 workspace 管理、索引、搜索、diff。

### 核心能力

1. **多 workspace 索引** - 管理多个项目
2. **搜索** - 跨 workspace 搜索产物
3. **diff** - 对比不同版本的产物
4. **统计** - 工作流执行统计

---

## 版本发布节奏

| 版本 | 预计周期 | 说明 |
|------|----------|------|
| v0.1 | 2 周 | MVP，验证核心流程 |
| v0.2 | 2 周 | 增强易用性 |
| v0.3 | 4 周 | 自动化能力（可选） |
| v0.4 | 3 周 | 可视化 |
| v0.5 | 4 周 | 扩展能力 |

---

## 风险与依赖

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| TRAE 界面变化 | v0.3 自动化可能失效 | 使用稳定的元素选择器，提供降级机制 |
| 视觉识别准确率 | 自动化可靠性 | 提供人工干预机制，默认关闭自动化 |
| 剪贴板跨平台兼容 | v0.2 功能受限 | 使用成熟的跨平台库 |

---

## 与示例对齐

每个版本的验收应与 `examples/workspaces/` 中的示例对齐：

- **v0.1** - 能正确处理 `demo-login` workspace
- **v0.2** - 能校验 `demo-login` 的产物格式
- **v0.4** - 能为 `demo-login` 生成 Timeline 页面
