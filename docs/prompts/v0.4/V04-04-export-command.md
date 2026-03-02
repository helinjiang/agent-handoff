# V04-04：export 命令（静态导出 Web Timeline）

## 任务目标

新增 `agent-handoff export --format=web` 命令：把 workspace 导出为可离线打开的 Web Timeline Viewer（静态 HTML）。

## 上下文

v0.4 形态优先：`export --format=web` 生成一个目录（如 `timeline/`），里面包含：
- `index.html`：时间线
- `assets/`：css/js
- `artifacts/`：产物页面（V04-03 生成）

依赖：
- V04-01：events.jsonl 读取与规范化
- V04-02：timeline-renderer
- V04-03：artifact-renderer + link map

参考：
- `src/index.ts` 的 CLI 注册方式
- `src/cli/commands/*` 的 commander 风格

## 产物清单

```
src/cli/commands/
  └── export.ts                 # 新增
src/index.ts                    # 注册 exportCommand
src/export/web/
  └── exporter.ts               # 新增：导出总编排（读 events → render → 写文件）
tests/
  └── cli/
      └── export.test.ts        # 新增（使用 node dist/index.js export ...）
```

## 功能要求

### 1) CLI：export 命令

命令形式：

```bash
agent-handoff export [workspace] --format web --output <dir>
```

参数建议：
- `[workspace]` 默认 `.`
- `--format <format>` 默认 `web`（保留扩展空间）
- `-o, --output <dir>` 默认 `<workspace>/timeline`
- `--limit <n>`（可选）只导出最近 n 条事件

行为：
- workspace 不存在 / workflow.yaml 不存在：与其他命令一致，输出 Error 并 exit(1)
- 成功时输出：
  - 导出目录路径
  - 如何打开：`open <dir>/index.html`（macOS 提示即可）

### 2) 导出编排（exporter.ts）

职责：
- 读取 events.jsonl（可选 limit）
- 派生 timeline items
- 收集所有 links（去重）
- 为每个 link 生成 artifact 页面（读取 workspace 文件内容；缺失则生成提示页）
- 生成 index.html 与 assets
- 将所有文件写入 outputDir

重要：导出产物必须是纯静态文件，打开不依赖 Node 运行时。

## 验收标准

1. `node dist/index.js export examples/workspaces/demo-login --format web` 可生成目录并包含 index.html
2. index.html 可离线打开，能看到事件列表
3. links 可点击跳转到 artifacts 页面（至少对 demo-login 的 paths 生效）
4. 单测覆盖：导出目录结构、关键文件存在性、至少 1 个 artifacts 页面生成

