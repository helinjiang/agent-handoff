# MVP-02：Core 模型定义

## 任务目标

定义 AgentRelay 核心数据模型，包括 Workflow、Step、State、Event 等类型。

## 上下文

参考文档：
- `/Users/bytedance/workspace/gitforgithub/agent-relay/docs/protocol.md`
- `/Users/bytedance/workspace/gitforgithub/agent-relay/examples/workspaces/demo-login/workflow.yaml`
- `/Users/bytedance/workspace/gitforgithub/agent-relay/examples/workspaces/demo-login/state.json`
- `/Users/bytedance/workspace/gitforgithub/agent-relay/examples/workspaces/demo-login/events.jsonl`

## 产物清单

```
src/
└── core/
    └── models/
        ├── workflow.ts    # Workflow / Step 类型
        ├── state.ts       # State 类型
        ├── event.ts       # Event 类型
        └── index.ts       # 统一导出
```

## 类型定义要求

### workflow.ts

```typescript
export interface Step {
  id: string;
  executor: 'trae' | 'shell' | 'manual' | 'api';
  input: string;
  output: string;
  workItemId?: string;
  acceptance?: string[];
}

export interface Workflow {
  name: string;
  steps: Step[];
}
```

### state.ts

```typescript
export type WorkflowStatus = 'running' | 'done' | 'blocked';

export interface State {
  currentIndex: number;
  status: WorkflowStatus;
  updatedAt: string;
  blockedReason?: string;
}
```

### event.ts

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

export interface EventStep {
  index: number;
  id: string;
}

export interface Event {
  ts: string;
  step: EventStep;
  workItemId?: string;
  type: EventType;
  summary: string;
  links?: string[];
}
```

## 验收标准

1. 所有类型定义完整
2. 类型与 protocol.md 描述一致
3. 能正确解析 demo-login 的 workflow.yaml 和 state.json
4. 编写单元测试验证类型

## 测试用例

创建 `tests/core/models/workflow.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { Workflow, Step } from '../../../src/core/models/workflow';

describe('Workflow types', () => {
  it('should define Step type correctly', () => {
    const step: Step = {
      id: 'test-step',
      executor: 'trae',
      input: 'brief.md',
      output: 'steps/01-test-step/output.md',
    };
    expect(step.id).toBe('test-step');
  });
});
```

## 执行指令

请按照上述要求创建模型文件和测试文件，确保类型定义准确。
