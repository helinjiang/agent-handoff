# V05-04：统计与报表

## 任务目标

实现 `agent-handoff stats`：对单个或多个 workspace 输出统计信息，用于管理与回顾：
- step 完成率、事件数量
- timeline 时长估算（基于 step.started/step.done）
- 自动化会话统计（基于 automation.session 的 data）

## 上下文

依赖：
- V05-01 的 workspace index
- v0.3/v0.4 已存在的 `automation.session`、`events.jsonl`、`report` 命令思路（但 stats 不复用 report 格式）

约束：
- 输出优先 JSON 与 markdown（方便集成与阅读）

## 产物清单

```
src/core/stats/
  ├── stats.ts                 # 新增：统计计算
  └── types.ts                 # 新增：StatsResult 类型
src/cli/commands/
  └── stats.ts                 # 新增：agent-handoff stats
src/index.ts                   # 注册 statsCommand
tests/
  ├── core/stats/stats.test.ts
  └── cli/stats.test.ts
```

## 功能要求

### 1) Stats API

```ts
export interface StatsQuery {
  workspaces: string[];
  mode: 'summary' | 'full';
}

export interface WorkspaceStats {
  workspaceName: string;
  workspacePath: string;
  indexedAt: string;
  stepsTotal: number;
  stepsDone: number;
  eventsTotal: number;
  eventsByType: Record<string, number>;
  durations?: Array<{
    stepId: string;
    startedAt?: string;
    doneAt?: string;
    durationMs?: number;
  }>;
  automation?: {
    sessions: number;
    summary: Record<string, unknown>;
  };
}

export interface StatsResult {
  generatedAt: string;
  workspaces: WorkspaceStats[];
}

export async function buildStats(query: StatsQuery): Promise<StatsResult>;
```

规则：
- `stepsDone`：以 `outputExists=true` 判定
- durations：
  - 对同一 stepId，取最早 started 与最晚 done
  - 任一缺失则 durationMs 为空
- automation：
  - 统计 `type=automation.session` 事件数
  - `summary` 只做聚合占位（可先输出 sessions 与若干常见字段的累计/平均）

### 2) CLI：stats 命令

形式：

```bash
agent-handoff stats [workspace...] [--registry] [--mode summary|full] [--format json|markdown]
```

规则：
- 若 `--registry`：统计 registry 中所有 workspace
- `--format json`：输出 StatsResult
- `--format markdown`：输出表格（workspace、stepsDone/stepsTotal、eventsTotal、automation.sessions）

## 验收标准

1. 能对多个 workspace 输出统计（registry 或显式参数）
2. durations 计算正确且稳定
3. automation.session data 不做强假设（容错）
4. 单测覆盖：step 完成率、duration 计算、markdown 输出包含关键字段

