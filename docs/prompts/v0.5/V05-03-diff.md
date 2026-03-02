# V05-03：Workspace / Artifact diff

## 任务目标

实现 `agent-handoff diff`，支持对两个 workspace（或同一 workspace 的两个快照索引）进行 diff：
- step 输出文件 diff（优先文本 diff）
- workflow 变化提示（步骤增删改）
- events 差异摘要（新增事件数、最近事件等）

## 上下文

依赖：
- V05-01 的 `WorkspaceIndex`（index.json）

约束：
- v0.5 先做 CLI diff（markdown/纯文本），不做 Web UI
- 不要求与 git diff 完全一致，但输出必须稳定

## 产物清单

```
src/core/diff/
  ├── diff.ts                 # 新增：diff 核心逻辑
  └── types.ts                # 新增：DiffResult 类型
src/cli/commands/
  └── diff.ts                 # 新增：agent-handoff diff
src/index.ts                  # 注册 diffCommand
tests/
  ├── core/diff/diff.test.ts
  └── cli/diff.test.ts
```

## 功能要求

### 1) Diff API

```ts
export interface DiffOptions {
  leftWorkspace: string;
  rightWorkspace: string;
  format: 'text' | 'markdown' | 'json';
  paths?: string[];
  contextLines?: number;
}

export interface DiffResult {
  summary: {
    left: { name: string; path: string };
    right: { name: string; path: string };
    changedArtifacts: number;
    addedArtifacts: number;
    removedArtifacts: number;
    changedSteps: number;
  };
  artifacts: Array<{
    path: string;
    status: 'added' | 'removed' | 'changed' | 'unchanged';
    diff?: string;
  }>;
  workflow?: {
    changed: boolean;
    details?: string;
  };
  events?: {
    leftCount: number;
    rightCount: number;
    added: number;
    latestRight?: { ts: string; summary: string };
  };
}

export async function diffWorkspaces(options: DiffOptions): Promise<DiffResult>;
```

规则：
- 读取 `<workspace>/.agenthandoff/index.json`，若不存在则给出可理解错误（提示先 index）
- artifact 比较默认范围：
  - `brief.md`
  - `steps/*/output.md`
  - 若 `paths` 指定则只比较指定路径
- 文本 diff：可实现一个最小行级 diff（LCS 或 patience diff），`contextLines` 默认 3

### 2) CLI：diff 命令

形式：

```bash
agent-handoff diff <left> <right> [--format text|markdown|json] [--path <p...>] [--context <n>]
```

要求：
- `text/markdown` 输出必须包含 summary 概览与逐文件 diff（对 changed/added/removed）
- `json` 输出为 `DiffResult`

## 验收标准

1. 能对 demo workspace 输出稳定 diff（无索引则提示先 index）
2. 对文本文件输出可读 diff（带 context）
3. 单测覆盖：added/removed/changed 分类、paths 过滤、json 输出结构

