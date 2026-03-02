# V05-01：Workspace 索引与注册表

## 任务目标

实现“多 workspace 管理”的基础设施：
- 管理一个可持久化的 workspace 注册表（registry）
- 对 workspace 进行索引（index），生成可用于搜索/统计/diff 的结构化数据

## 上下文

参考：
- `src/core/workspace.ts`：workspace 检测与读取
- `src/core/events-reader.ts`：events.jsonl 读取与规范化
- `src/core/models/*`：workflow/state/event 模型

约束：
- v0.5 仍然 CLI-first，不引入数据库服务端
- 默认索引结果可读、可 diff（优先 JSON 文件）

## 产物清单

```
src/core/index/
  ├── registry.ts              # 新增：workspace 注册表（读/写/增删）
  ├── indexer.ts               # 新增：构建索引（workspace → index json）
  └── types.ts                 # 新增：Index 类型定义
src/cli/commands/
  └── index.ts                 # 新增：agent-handoff index
src/index.ts                   # 注册 indexCommand
tests/
  ├── core/index/
  │   ├── registry.test.ts
  │   └── indexer.test.ts
  └── cli/
      └── index.test.ts
```

## 功能要求

### 1) Registry：workspace 注册表

提供 API：

```ts
export interface WorkspaceRegistryItem {
  name: string;
  path: string;
  addedAt: string;
  updatedAt: string;
}

export interface WorkspaceRegistry {
  version: 1;
  items: WorkspaceRegistryItem[];
}

export interface RegistryStore {
  load(): Promise<WorkspaceRegistry>;
  save(registry: WorkspaceRegistry): Promise<void>;
}

export function createDefaultRegistryStore(): RegistryStore;

export async function registerWorkspace(path: string, name?: string): Promise<void>;
export async function unregisterWorkspace(pathOrName: string): Promise<void>;
export async function listWorkspaces(): Promise<WorkspaceRegistryItem[]>;
```

行为：
- 默认 store 文件位置：`~/.agenthandoff/registry.json`（如无法获取 HOME，则退化到 `process.cwd()/.agenthandoff/registry.json`）
- `registerWorkspace`：写入或更新 item（按 path 去重），`updatedAt` 变更
- `unregisterWorkspace`：按 path 或 name 删除
- `listWorkspaces`：返回按 name 排序的列表

### 2) Index：workspace 索引

索引格式（可扩展）：

```ts
export interface WorkspaceIndex {
  version: 1;
  workspacePath: string;
  workspaceName: string;
  indexedAt: string;
  workflowName?: string;
  steps: Array<{
    id: string;
    index: number;
    outputPath?: string;
    outputExists: boolean;
  }>;
  artifacts: Array<{
    path: string;
    kind: 'step.output' | 'brief' | 'other';
    bytes?: number;
    updatedAt?: string;
    preview?: string;
  }>;
  events: Array<{
    ts: string;
    stepId: string;
    stepIndex: number;
    type: string;
    summary: string;
    workItemId?: string;
    links?: string[];
  }>;
}

export async function buildWorkspaceIndex(workspacePath: string): Promise<WorkspaceIndex>;
```

规则：
- `steps`：来自 workflow.yaml；`outputExists` 基于文件存在性判断
- `artifacts`：
  - 至少包含 brief.md（存在则 kind=brief）
  - 至少包含每个 step 的 output（存在则 kind=step.output）
  - `preview` 取前 2000 字符（不做 markdown 渲染），用于搜索摘要
- `events`：读取 events.jsonl，按 ts 升序，保留必要字段（不强依赖 data）

### 3) CLI：index 命令

形式：

```bash
agent-handoff index [workspace] [--add] [--remove] [--list] [--output <dir>] [--json]
```

建议行为：
- `index <workspace> --add`：注册 workspace 后，生成 index 并写入输出目录
- `index <workspace>`：仅生成 index
- `--output` 默认 `<workspace>/.agenthandoff/index.json`
- `--list`：列出 registry
- `--remove <pathOrName>`：从 registry 删除

## 验收标准

1. registry 可增删改查，且可重复注册不产生重复项
2. workspace 索引可构建，events/steps/artifacts 字段完整
3. index 命令可生成 index.json，并支持 --list/--add/--remove
4. 单测覆盖：registry 文件落盘、索引内容、CLI 行为

