# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-03-02

### Added
- TRAE 自动化能力（可选）：视觉识别、自动输入、任务等待（Nut.js 路线）
- 自动化操作日志：会话级 JSONL 落盘（`workspace/operations/`）
- 自动化诊断落盘：失败时输出 diagnostics JSON（`workspace/diagnostics/`）
- 自动化降级：失败时输出可继续手工执行的辅助模式提示，并可复制 prompt 到剪贴板
- `agent-handoff report` 命令：从 operations JSONL 生成 json/markdown/html 报告
- 新事件类型：`automation.session`（events.jsonl，支持 data 字段承载统计信息）

### Changed
- `TraeAdapter.execute()` 支持恢复重试与失败降级输出

## [0.2.0] - 2026-03-02

### Added
- `agent-handoff validate` 命令 - 校验产物结构完整性
- `agent-handoff advance` 命令 - 推进 workspace 状态
- `agent-handoff config` 命令 - 查看和管理配置
- `--copy` 选项 - 自动复制 prompt 到剪贴板（跨平台支持）
- `--no-event` 选项 - 跳过事件日志写入
- 产物校验模块 - 检查 output.md 必要区块
- 剪贴板模块 - 跨平台剪贴板操作
- 事件写入模块 - events.jsonl 追加式日志
- 配置文件支持 - `.agenthandoffrc` / `.agenthandoffrc.yaml` / `package.json#agenthandoff`

### Changed
- `next` 命令支持 `--no-event` 选项跳过事件写入
- 改进 prompt 输出格式

### Dependencies
- 新增 `clipboardy` 依赖（跨平台剪贴板）

## [0.1.1] - 2026-03-02

### Changed
- 更新 repository URL 为正确的 GitHub 地址
- 更新 author 信息
- 统一文档中的文件路径为相对路径

## [0.1.0] - 2026-03-01

### Added
- CLI 框架（commander）
- `agent-handoff init` 命令 - 创建 workspace
- `agent-handoff status` 命令 - 显示 workspace 状态
- `agent-handoff next` 命令 - 输出下一步 prompt
- Core 模型定义（Workflow/Step/State/Event）
- Workspace 读取与 workflow.yaml 解析
- 状态机（根据产物推导当前步骤）
- TRAE prompt 生成器
