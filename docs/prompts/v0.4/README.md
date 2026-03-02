# AgentHandoff v0.4 任务清单（Web Timeline Viewer / 静态导出）

本文档汇总 v0.4 的所有任务，每个任务对应一个独立的 Prompt 文件。

## 版本目标

提供 “Web Timeline Viewer（静态导出）”，将 workspace 的 `events.jsonl` 与相关产物导出为可离线打开的 HTML（不依赖服务端），用于回放、审计与分享。

## 设计约束（来自 TECH_SPEC / roadmap）

- 静态导出优先：`file://` 直接打开可用，不依赖 fetch 读取本地文件（避免浏览器安全策略问题）
- 数据源：以 `events.jsonl` 为时间线主索引；允许 Event 扩展 `data` 字段（如 `automation.session`）
- 产物可达：时间线中的 links 可点击查看（通过导出时生成独立 artifact 页面或拷贝文件）
- 可用性优先：不引入 React/Vite 等前端构建链，优先使用 “生成 HTML + 轻量 JS（可选）”

## 任务依赖关系

```
V04-01 events.jsonl 读取与规范化
    │
    ├──→ V04-02 Timeline 静态页面生成（基础 UI）
    │         │
    │         └──→ V04-05 过滤与搜索（前端交互）
    │
    └──→ V04-03 Artifact 页面生成（产物查看）
              │
              └──→ V04-04 export 命令集成（对外 CLI）
```

## 任务列表

| 序号 | 任务 | 产物 | 优先级 |
|------|------|------|--------|
| [V04-01](./V04-01-eventlog-parser.md) | 事件日志读取与规范化 | `src/core/events-reader.ts`（新增） | P0 |
| [V04-02](./V04-02-timeline-export-html.md) | Timeline 静态页面生成 | `src/export/web/timeline-renderer.ts`（新增） | P0 |
| [V04-03](./V04-03-artifact-pages.md) | Artifact 页面生成与链接 | `src/export/web/artifact-renderer.ts`（新增） | P0 |
| [V04-04](./V04-04-export-command.md) | export 命令（静态导出） | `src/cli/commands/export.ts`（新增） | P0 |
| [V04-05](./V04-05-filters-search.md) | 过滤与搜索 | `src/export/web/assets/viewer.js`（新增） | P1 |

## 执行顺序建议

1. V04-01：先把 events.jsonl 读出来、结构化、可测试
2. V04-02：生成可以打开的静态 HTML（无交互也可）
3. V04-03：把 “links 指向的产物” 导出为可点击页面
4. V04-04：把导出能力接入 CLI：`agent-handoff export --format=web`
5. V04-05：在不引入构建链的前提下做过滤/搜索（可选）

