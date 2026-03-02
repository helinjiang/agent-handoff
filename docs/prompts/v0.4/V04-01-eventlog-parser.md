# V04-01：事件日志读取与规范化

## 任务目标

实现 `events.jsonl` 的读取与解析，输出用于 Timeline Viewer 的结构化数据（支持 `data` 扩展字段与 `automation.session`）。

## 上下文

参考：
- `src/core/events-writer.ts`：写入 `events.jsonl` 的实现
- `src/core/models/event.ts`：Event 类型（包含可选 `data`）
- `docs/TECH_SPEC.md` 第 9 节：EventLog 与时间线

约束：
- `events.jsonl` 为 JSON Lines，允许存在非法行（需要跳过）
- Viewer 需要稳定的排序（按 `ts` 升序），并能按 step/type 聚合

## 产物清单

```
src/core/
  ├── events-reader.ts           # 新增：读取与解析 events.jsonl
  └── models/
      └── event.ts               # 不新增字段；复用现有 Event/data
tests/
  └── core/
      └── events-reader.test.ts  # 新增
```

## 功能要求

### 1) 新增 events-reader.ts

提供以下 API：

```ts
import { Event } from './models/event.js';

export interface ReadEventsOptions {
  workspacePath: string;
  limit?: number;
}

export interface ReadEventsResult {
  events: Event[];
  invalidLines: number;
}

export async function readEventsJsonl(options: ReadEventsOptions): Promise<ReadEventsResult>;
```

行为：
- 从 `path.join(workspacePath, 'events.jsonl')` 读取
- 空文件/不存在：返回 `{ events: [], invalidLines: 0 }`
- 逐行解析 JSON；失败的行计入 `invalidLines`，但不中断
- `events` 必须按 `ts` 升序排序（以 ISO 时间字符串比较即可）
- 若 `limit` 存在：返回最后 `limit` 条（按时间排序后裁剪）

### 2) 增强：面向 Viewer 的“展示字段”派生（可选）

为后续导出 HTML 提供一个纯函数（不涉及 IO）：

```ts
import { Event } from './models/event.js';

export interface TimelineItem {
  ts: string;
  stepId: string;
  stepIndex: number;
  type: string;
  summary: string;
  workItemId?: string;
  links?: string[];
  data?: Record<string, unknown>;
}

export function toTimelineItems(events: Event[]): TimelineItem[];
```

派生规则：
- `stepIndex` 来自 `event.step.index`（保持原值，不 +1）
- `type/summary` 直接透传
- `data` 可透传（用于 `automation.session` 展示）

## 验收标准

1. 能正确解析 events.jsonl 并跳过非法行
2. 输出按时间顺序稳定排序
3. 对 `data` 字段与 `automation.session` 无特殊假设（透传）
4. 单元测试覆盖：空文件、不存在、非法行、limit 裁剪

## 测试用例

建议用临时目录写入 `events.jsonl`，包含：
- 两行合法 event + 一行非法 JSON
- ts 乱序，断言返回有序
- 设置 limit=1，断言只返回最后一条

