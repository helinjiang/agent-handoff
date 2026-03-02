# V02-03：events.jsonl 写入

## 任务目标

实现 events.jsonl 事件日志写入功能，支持 step.started、step.done 等事件的自动记录。

## 上下文

根据 `docs/TECH_SPEC.md` 第 9 节，events.jsonl 是追加式日志，用于时间线展示。

事件类型（最小集合）：
- `step.started` - 步骤开始
- `step.done` - 步骤完成
- `artifact.updated` - 产物更新
- `workflow.updated` - 工作流更新
- `verify.passed` / `verify.failed` - 验证结果
- `accept.passed` / `accept.failed` - 验收结果
- `issue.raised` - 问题提出
- `handoff.sent` - 交接发送

参考示例：
- `examples/workspaces/demo-login/events.jsonl`
- `src/core/models/event.ts` 现有类型定义

## 产物清单

```
src/
└── core/
    └── events-writer.ts       # 事件写入逻辑
tests/
└── core/
    └── events-writer.test.ts
```

## 功能要求

### events-writer.ts

```typescript
import { Event, EventType, EventStep } from './models/event';

export interface WriteEventOptions {
  workspacePath: string;
  step: EventStep;
  type: EventType;
  summary: string;
  workItemId?: string;
  links?: string[];
}

export interface EventsWriterResult {
  success: boolean;
  event: Event;
  error?: string;
}

export async function writeEvent(options: WriteEventOptions): Promise<EventsWriterResult>;

export async function readEvents(workspacePath: string): Promise<Event[]>;

export async function getLatestEvent(workspacePath: string): Promise<Event | null>;

export async function getEventsByStep(workspacePath: string, stepId: string): Promise<Event[]>;

export async function getEventsByType(workspacePath: string, type: EventType): Promise<Event[]>;
```

## 事件格式

每条事件为单行 JSON（JSON Lines 格式）：

```json
{"ts": "2026-03-01T09:00:00+08:00", "step": {"index": 1, "id": "a-clarify"}, "type": "step.started", "summary": "开始需求澄清", "links": ["brief.md", "decisions.md"]}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ts | string | 是 | ISO 8601 时间戳 |
| step | object | 是 | 步骤信息（index, id） |
| step.index | number | 是 | 步骤序号（从 1 开始） |
| step.id | string | 是 | 步骤 ID |
| workItemId | string | 否 | 工作项 ID |
| type | string | 是 | 事件类型 |
| summary | string | 是 | 事件摘要 |
| links | string[] | 否 | 关联产物路径 |

## 实现要点

1. **追加写入**
   - 使用 `fs.appendFile` 追加到文件末尾
   - 每条事件独占一行
   - 文件不存在时自动创建

2. **时间戳生成**
   - 使用 `new Date().toISOString()` 生成 ISO 8601 格式
   - 包含时区信息

3. **原子操作**
   - 写入时使用文件锁（可选，v0.2 可简化）
   - 确保并发写入不会损坏文件

4. **读取解析**
   - 按行读取 JSON
   - 跳过空行和无效行
   - 返回解析后的事件数组

## CLI 集成

### 更新 next 命令

在 `src/cli/commands/next.ts` 中集成 step.started 事件：

```typescript
import { writeEvent } from '../../core/events-writer';

export const nextCommand = new Command('next')
  .description('输出下一步执行指令和 prompt')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('-c, --copy', '复制 prompt 到剪贴板')
  .option('--no-event', '不写入事件日志')
  .action(async (workspace: string, options: { copy: boolean; event: boolean }) => {
    // ... 获取当前步骤 ...
    
    if (options.event) {
      await writeEvent({
        workspacePath: workspace,
        step: { index: stepIndex + 1, id: step.id },
        type: 'step.started',
        summary: `开始执行步骤: ${step.id}`,
        workItemId: step.workItemId,
        links: [step.input],
      });
    }
    
    // ... 输出 prompt ...
  });
```

### 新增 advance 命令

在 `src/cli/commands/advance.ts` 中支持手动推进状态：

```typescript
import { Command } from 'commander';
import { writeEvent } from '../../core/events-writer';

export const advanceCommand = new Command('advance')
  .description('推进 workspace 状态')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('-e, --event <type>', '事件类型', 'step.done')
  .option('-s, --summary <text>', '事件摘要')
  .action(async (workspace: string, options: { event: string; summary: string }) => {
    // ... 获取当前步骤 ...
    
    await writeEvent({
      workspacePath: workspace,
      step: { index: stepIndex + 1, id: step.id },
      type: options.event as EventType,
      summary: options.summary || `步骤完成: ${step.id}`,
      workItemId: step.workItemId,
      links: [step.output],
    });
    
    console.log(`✅ Event written: ${options.event}`);
  });
```

## 命令行为

```bash
# next 命令自动写入 step.started
agent-handoff next examples/workspaces/demo-login
# events.jsonl 新增: {"ts": "...", "type": "step.started", ...}

# advance 命令写入 step.done
agent-handoff advance examples/workspaces/demo-login --event step.done
# events.jsonl 新增: {"ts": "...", "type": "step.done", ...}

# 自定义摘要
agent-handoff advance examples/workspaces/demo-login --event verify.passed --summary "测试全部通过"
# events.jsonl 新增: {"ts": "...", "type": "verify.passed", "summary": "测试全部通过", ...}
```

## 验收标准

1. 能正确写入事件到 events.jsonl
2. 事件格式符合 JSON Lines 规范
3. 时间戳为有效的 ISO 8601 格式
4. 能读取并解析所有事件
5. 能按步骤 ID 和事件类型过滤
6. 单元测试覆盖

## 测试用例

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { 
  writeEvent, 
  readEvents, 
  getLatestEvent,
  getEventsByStep,
  getEventsByType 
} from '../../../src/core/events-writer';

describe('events-writer', () => {
  const testDir = path.join(process.cwd(), 'test-events-workspace');
  const eventsFile = path.join(testDir, 'events.jsonl');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  it('should write event to file', async () => {
    const result = await writeEvent({
      workspacePath: testDir,
      step: { index: 1, id: 'test-step' },
      type: 'step.started',
      summary: 'Test event',
    });

    expect(result.success).toBe(true);
    expect(result.event.type).toBe('step.started');

    const content = await fs.readFile(eventsFile, 'utf-8');
    expect(content).toContain('step.started');
  });

  it('should read all events', async () => {
    await writeEvent({
      workspacePath: testDir,
      step: { index: 1, id: 'step1' },
      type: 'step.started',
      summary: 'Event 1',
    });
    await writeEvent({
      workspacePath: testDir,
      step: { index: 1, id: 'step1' },
      type: 'step.done',
      summary: 'Event 2',
    });

    const events = await readEvents(testDir);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('step.started');
    expect(events[1].type).toBe('step.done');
  });

  it('should get latest event', async () => {
    await writeEvent({
      workspacePath: testDir,
      step: { index: 1, id: 'step1' },
      type: 'step.started',
      summary: 'Event 1',
    });
    await writeEvent({
      workspacePath: testDir,
      step: { index: 1, id: 'step1' },
      type: 'step.done',
      summary: 'Event 2',
    });

    const latest = await getLatestEvent(testDir);
    expect(latest?.type).toBe('step.done');
  });

  it('should filter events by step', async () => {
    await writeEvent({
      workspacePath: testDir,
      step: { index: 1, id: 'step1' },
      type: 'step.started',
      summary: 'Event 1',
    });
    await writeEvent({
      workspacePath: testDir,
      step: { index: 2, id: 'step2' },
      type: 'step.started',
      summary: 'Event 2',
    });

    const events = await getEventsByStep(testDir, 'step1');
    expect(events).toHaveLength(1);
    expect(events[0].step.id).toBe('step1');
  });

  it('should filter events by type', async () => {
    await writeEvent({
      workspacePath: testDir,
      step: { index: 1, id: 'step1' },
      type: 'step.started',
      summary: 'Event 1',
    });
    await writeEvent({
      workspacePath: testDir,
      step: { index: 1, id: 'step1' },
      type: 'step.done',
      summary: 'Event 2',
    });

    const events = await getEventsByType(testDir, 'step.done');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('step.done');
  });

  it('should handle missing file', async () => {
    const events = await readEvents(testDir);
    expect(events).toHaveLength(0);
  });
});
```

## 与现有代码集成

### 更新 src/core/models/event.ts

确保 EventType 包含所有必要类型：

```typescript
export type EventType =
  | 'step.started'
  | 'step.done'
  | 'artifact.updated'
  | 'workflow.updated'
  | 'verify.passed'
  | 'verify.failed'
  | 'accept.passed'
  | 'accept.failed'
  | 'issue.raised'
  | 'handoff.sent';
```

## 执行指令

请按照上述要求实现 events.jsonl 写入功能，并集成到 next 和 advance 命令中。
