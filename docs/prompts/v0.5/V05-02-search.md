# V05-02：跨 workspace 搜索

## 任务目标

实现 `agent-handoff search`：在多个 workspace 的索引上进行搜索，支持：
- 关键字搜索（匹配 artifact preview、event summary）
- workspace/step/type/workItemId 过滤
- JSON 输出（便于二次集成）

## 上下文

依赖：
- V05-01 workspace 索引（index.json）与 registry

约束：
- 不引入外部搜索服务
- 优先做到“可用且稳定”，再考虑排序优化

## 产物清单

```
src/core/search/
  ├── search.ts                 # 新增：搜索入口
  └── types.ts                  # 新增：SearchResult 类型定义
src/cli/commands/
  └── search.ts                 # 新增：agent-handoff search
src/index.ts                    # 注册 searchCommand
tests/
  ├── core/search/search.test.ts
  └── cli/search.test.ts
```

## 功能要求

### 1) Search API

```ts
export interface SearchQuery {
  q: string;
  workspace?: string[];
  stepId?: string[];
  type?: string[];
  workItemId?: string[];
  limit?: number;
}

export type SearchTarget = 'events' | 'artifacts' | 'all';

export interface SearchOptions {
  targets: SearchTarget;
  registryOnly: boolean;
  indexDir?: string;
}

export interface SearchHit {
  workspaceName: string;
  workspacePath: string;
  kind: 'event' | 'artifact';
  score: number;
  title: string;
  snippet: string;
  link?: string;
  meta: Record<string, unknown>;
}

export async function search(query: SearchQuery, options: SearchOptions): Promise<SearchHit[]>;
```

规则：
- 数据来源：
  - `registryOnly=true`：只搜索 registry 列表里的 workspace
  - `registryOnly=false`：允许通过 `--workspace <path>` 指定临时搜索目标
- 索引读取：默认从 `<workspace>/.agenthandoff/index.json` 读取
- 匹配：
  - events：匹配 `summary`（大小写不敏感包含）
  - artifacts：匹配 `preview`（大小写不敏感包含）
- score：
  - 最小实现：命中=1，不命中=0；按 score desc + ts desc（若存在）排序

### 2) CLI：search 命令

形式：

```bash
agent-handoff search <query> [--workspace <pathOrName...>] [--type <t...>] [--step <id...>] [--work-item <id...>] [--limit <n>] [--json]
```

要求：
- 默认输出：人类可读列表（workspace、命中类型、标题、摘要片段）
- `--json`：输出 `SearchHit[]` JSON（stdout）
- 当索引不存在时：
  - 默认提示 “请先运行 agent-handoff index”
  - 不中断整个搜索（跳过该 workspace）

## 验收标准

1. 可在多个 workspace 上完成 events/artifacts 搜索并正确过滤
2. 输出稳定可读，json 输出可被解析
3. 单测覆盖：排序稳定性、过滤行为、索引缺失跳过策略

