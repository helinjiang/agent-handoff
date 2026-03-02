# AgentHandoff v0.5 任务清单

本文档汇总 v0.5 的所有任务，每个任务对应一个独立的 Prompt 文件。

## 版本目标

支持多 workspace 管理、索引、搜索、diff、统计，并保持 CLI-first 的使用体验。

## 进展

- ⬜ V05-01～V05-04 待实现

## 任务依赖关系

```
V05-01 Workspace 索引与注册表
    │
    ├──→ V05-02 跨 workspace 搜索
    ├──→ V05-03 Workspace / Artifact diff
    └──→ V05-04 统计与报表
```

## 任务列表

| 序号 | 任务 | 产物 | 优先级 | 状态 |
|------|------|------|--------|------|
| [V05-01](./V05-01-workspace-index.md) | Workspace 索引与注册表 | `src/core/index/` + `agent-handoff index` | P0 | ⬜ |
| [V05-02](./V05-02-search.md) | 跨 workspace 搜索 | `agent-handoff search` | P0 | ⬜ |
| [V05-03](./V05-03-diff.md) | Workspace / Artifact diff | `agent-handoff diff` | P1 | ⬜ |
| [V05-04](./V05-04-stats.md) | 统计与报表 | `agent-handoff stats` | P1 | ⬜ |

## 执行顺序

1. V05-01：先落盘索引与 registry，解决“多 workspace 数据聚合”的基础问题
2. V05-02：基于索引提供搜索能力（优先 CLI 输出 JSON/markdown）
3. V05-03：提供 diff（先做 artifact 文本 diff，后续扩展）
4. V05-04：提供统计（复用 events.jsonl 与 automation.session data）

## 参考文档

- [技术方案](../../TECH_SPEC.md)
- [路线图](../../roadmap.md)
- [v0.4 任务清单](../v0.4/README.md)

