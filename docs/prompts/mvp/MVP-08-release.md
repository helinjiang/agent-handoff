# MVP-08：发布准备

## 任务目标

完善项目配置，准备 npm 发布。

## 上下文

当前已完成：
- CLI 框架（init/status/next 命令）
- Core 模块（models/workspace/state-machine）
- Prompt 生成器

## 产物清单

```
├── package.json    # 更新 bin 入口
├── CHANGELOG.md    # 变更日志
├── README.md       # 使用说明
└── LICENSE         # MIT 许可证
```

## 功能要求

### package.json 更新

确保包含：

```json
{
  "name": "agent-handoff",
  "version": "0.1.0",
  "description": "轻量级多 Agent 协作接力工具",
  "author": "",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": ""
  },
  "keywords": [
    "agent",
    "workflow",
    "ai-coding",
    "træ",
    "collaboration"
  ],
  "bin": {
    "agent-handoff": "./dist/index.js"
  },
  "files": [
    "dist",
    "README.md",
    "CHANGELOG.md"
  ],
  "engines": {
    "node": ">=18"
  }
}
```

### CHANGELOG.md

```markdown
# Changelog

All notable changes to this project will be documented in this file.

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
```

### README.md 结构

```markdown
# AgentHandoff

轻量级多 Agent 协作接力工具。

## 安装

npm install -g agent-handoff

## 快速开始

### 1. 创建 workspace

agent-handoff init my-project

### 2. 编辑 brief.md

### 3. 查看状态

agent-handoff status my-project

### 4. 获取下一步 prompt

agent-handoff next my-project

## 命令

### init

创建新的 workspace。

agent-handoff init <name> [--path <path>]

### status

显示 workspace 状态。

agent-handoff status [workspace] [--json]

### next

输出下一步执行指令和 prompt。

agent-handoff next [workspace]

## Workspace 结构

（参考 protocol.md）

## 文档

- [项目愿景](docs/vision.md)
- [技术方案](docs/TECH_SPEC.md)
- [产物协议](docs/protocol.md)
- [路线图](docs/roadmap.md)

## License

MIT
```

## 验收标准

1. `npm publish --dry-run` 成功
2. `npm link` 后全局命令可用
3. `agent-handoff --help` 显示完整帮助
4. README 包含快速开始指南
5. CHANGELOG 记录 v0.1.0 变更

## 测试步骤

```bash
# 1. 构建
pnpm build

# 2. 本地链接测试
npm link

# 3. 测试全局命令
agent-handoff --version
agent-handoff --help

# 4. 测试完整流程
agent-handoff init test-project
agent-handoff status test-project
agent-handoff next test-project

# 5. 清理
npm unlink -g agent-handoff
rm -rf test-project

# 6. 发布测试
npm publish --dry-run
```

## 发布检查清单

- [ ] package.json version 正确
- [ ] package.json files 包含必要文件
- [ ] README.md 完整
- [ ] CHANGELOG.md 更新
- [ ] LICENSE 文件存在
- [ ] 所有测试通过
- [ ] build 成功
- [ ] npm publish --dry-run 成功

## 执行指令

请按照上述要求完善项目配置，准备发布。
