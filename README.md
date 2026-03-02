# AgentRelay

轻量级多 Agent 协作接力工具。

## 安装

```bash
npm install -g agent-relay
```

## 快速开始

### 1. 创建 workspace

```bash
agent-relay init my-project
```

### 2. 编辑 brief.md

编辑 `my-project/brief.md` 描述你的需求。

### 3. 查看状态

```bash
agent-relay status my-project
```

### 4. 获取下一步 prompt

```bash
agent-relay next my-project
```

将输出的 Prompt 复制到 TRAE 新 Task 中执行。

## 命令

### init

创建新的 workspace。

```bash
agent-relay init <name> [--path <path>]
```

参数：
- `<name>` - workspace 名称
- `--path, -p` - 父目录路径（默认当前目录）

### status

显示 workspace 状态。

```bash
agent-relay status [workspace] [--json]
```

参数：
- `[workspace]` - workspace 路径（默认当前目录）
- `--json, -j` - JSON 格式输出

### next

输出下一步执行指令和 prompt。

```bash
agent-relay next [workspace]
```

参数：
- `[workspace]` - workspace 路径（默认当前目录）

## Workspace 结构

```
<workspace>/
├── workflow.yaml    # 工作流定义
├── state.json       # 当前状态
├── brief.md         # 需求描述
├── events.jsonl     # 事件日志
└── steps/
    └── <nn>-<id>/
        └── output.md
```

## 文档

- [项目愿景](docs/vision.md)
- [技术方案](docs/TECH_SPEC.md)
- [产物协议](docs/protocol.md)
- [路线图](docs/roadmap.md)

## License

MIT
