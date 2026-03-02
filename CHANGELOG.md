# Changelog

All notable changes to this project will be documented in this file.

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
