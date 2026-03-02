# MVP-04：状态机

## 任务目标

实现工作流状态机，根据产物存在性推导当前步骤和状态。

## 上下文

参考文档：
- `/Users/bytedance/workspace/gitforgithub/agent-handoff/docs/protocol.md` 第 2.2 节

状态推进规则：
1. 若 `steps[i].output` 不存在或为空 → `currentIndex = i`，`status = running`
2. 若 `steps[i].output` 存在且有效 → `currentIndex++`
3. 若 `currentIndex` 超过最后一步 → `status = done`
4. 若验证失败或阻塞 → `status = blocked`，记录 `blockedReason`

## 产物清单

```
src/
└── core/
    └── state-machine.ts   # 状态机逻辑
tests/
└── core/
    └── state-machine.test.ts
```

## 功能要求

### state-machine.ts

```typescript
import { Workflow } from './models/workflow';
import { State, WorkflowStatus } from './models/state';

export interface StateMachineResult {
  currentIndex: number;
  status: WorkflowStatus;
  nextStepIndex: number | null; // null 表示已完成
  completedSteps: number[];
  pendingSteps: number[];
}

export function computeState(
  workflow: Workflow,
  stepOutputs: Map<string, boolean>
): StateMachineResult;

export function advanceState(
  state: State,
  workflow: Workflow,
  stepOutputs: Map<string, boolean>
): State;

export function isWorkflowComplete(
  workflow: Workflow,
  stepOutputs: Map<string, boolean>
): boolean;
```

## 实现要点

1. `computeState`：
   - 遍历所有步骤，找到第一个 output 不存在的步骤
   - 如果所有步骤都完成，返回 `status: 'done'`
   - 记录已完成和待完成的步骤索引

2. `advanceState`：
   - 根据当前 stepOutputs 更新 state
   - 更新 `updatedAt` 时间戳

3. `isWorkflowComplete`：
   - 检查所有步骤的 output 是否都存在

## 验收标准

1. 对 demo-login（全部完成）返回 `status: 'done'`
2. 对部分完成的 workspace 正确识别当前步骤
3. 边界情况处理：
   - 空 workflow
   - 单步骤 workflow
   - 所有步骤都未完成

## 测试用例

```typescript
import { describe, it, expect } from 'vitest';
import { computeState, isWorkflowComplete } from '../../../src/core/state-machine';
import { Workflow } from '../../../src/core/models/workflow';

describe('state-machine', () => {
  const workflow: Workflow = {
    name: 'test',
    steps: [
      { id: 'step1', executor: 'trae', input: 'brief.md', output: 'steps/01-step1/output.md' },
      { id: 'step2', executor: 'trae', input: 'steps/01-step1/output.md', output: 'steps/02-step2/output.md' },
      { id: 'step3', executor: 'trae', input: 'steps/02-step2/output.md', output: 'steps/03-step3/output.md' },
    ],
  };

  it('should return done when all steps complete', () => {
    const outputs = new Map([
      ['step1', true],
      ['step2', true],
      ['step3', true],
    ]);
    const result = computeState(workflow, outputs);
    expect(result.status).toBe('done');
    expect(result.nextStepIndex).toBeNull();
  });

  it('should return running when first step incomplete', () => {
    const outputs = new Map([
      ['step1', false],
      ['step2', false],
      ['step3', false],
    ]);
    const result = computeState(workflow, outputs);
    expect(result.status).toBe('running');
    expect(result.currentIndex).toBe(0);
  });

  it('should return running when middle step incomplete', () => {
    const outputs = new Map([
      ['step1', true],
      ['step2', false],
      ['step3', false],
    ]);
    const result = computeState(workflow, outputs);
    expect(result.status).toBe('running');
    expect(result.currentIndex).toBe(1);
  });
});
```

## 执行指令

请按照上述要求实现状态机功能。
