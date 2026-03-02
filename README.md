# AgentHandoff

轻量级多 Agent 协作接力工具。

## 安装

```bash
npm install -g agent-handoff
```

## 快速开始

### 1. 创建 workspace

```bash
agent-handoff init my-project
```

### 2. 编辑 brief.md

编辑 `my-project/brief.md` 描述你的需求。

### 3. 查看状态

```bash
agent-handoff status my-project
```

### 4. 获取下一步 prompt

```bash
agent-handoff next my-project
```

将输出的 Prompt 复制到 TRAE 新 Task 中执行。

## 命令

### init

创建新的 workspace。

```bash
agent-handoff init <name> [--path <path>]
```

参数：
- `<name>` - workspace 名称
- `--path, -p` - 父目录路径（默认当前目录）

### status

显示 workspace 状态。

```bash
agent-handoff status [workspace] [--json]
```

参数：
- `[workspace]` - workspace 路径（默认当前目录）
- `--json, -j` - JSON 格式输出

### next

输出下一步执行指令和 prompt。

```bash
agent-handoff next [workspace] [--copy] [--no-event]
```

参数：
- `[workspace]` - workspace 路径（默认当前目录）
- `--copy, -c` - 复制 prompt 到剪贴板
- `--no-event` - 不写入 events.jsonl

### validate

校验 workflow 与产物结构。

```bash
agent-handoff validate [workspace]
```

### advance

手动推进 workflow 状态，并可写入事件。

```bash
agent-handoff advance [workspace]
```

### config

查看或生成配置文件。

```bash
agent-handoff config [workspace]
```

### report

读取 workspace 下的自动化操作日志并生成报告（json/markdown/html）。

```bash
agent-handoff report [workspace] [--format markdown|json|html] [--session <id>] [--screenshots] [--output <path>]
```

### export

导出静态 Web Timeline Viewer（离线 HTML，可直接打开）。

```bash
agent-handoff export [workspace] --format web [--output <dir>] [--limit <n>]
```

### index

生成 workspace 索引，并支持 registry 管理。

```bash
agent-handoff index [workspace] [--add] [--remove <pathOrName>] [--list] [--output <file>] [--json]
```

### search

在多个 workspace 索引上执行搜索。

```bash
agent-handoff search <query> [--workspace <pathOrName...>] [--type <t...>] [--step <id...>] [--work-item <id...>] [--limit <n>] [--json]
```

### diff

对两个 workspace 做基于索引的差异对比。

```bash
agent-handoff diff <left> <right> [--format text|markdown|json] [--path <p...>] [--context <n>]
```

### stats

输出 workspace 统计信息（summary/full）。

```bash
agent-handoff stats [workspace...] [--registry] [--mode summary|full] [--format json|markdown]
```

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
