# MVP-03：Workspace 读取与 Workflow 解析

## 任务目标

实现 workspace 目录读取和 workflow.yaml 解析功能。

## 上下文

参考示例：
- `examples/workspaces/demo-login/`

## 产物清单

```
src/
└── core/
    ├── workspace.ts       # Workspace 读取逻辑
    ├── workflow-parser.ts # workflow.yaml 解析
    └── types.ts           # 统一类型别名
tests/
└── core/
    └── workspace.test.ts  # 单元测试
```

## 功能要求

### workspace.ts

```typescript
import { Workflow } from './models/workflow';
import { State } from './models/state';

export interface WorkspaceInfo {
  path: string;
  exists: boolean;
  hasWorkflow: boolean;
  hasState: boolean;
  workflow?: Workflow;
  state?: State;
  stepOutputs: Map<string, boolean>; // stepId -> output exists
}

export async function loadWorkspace(workspacePath: string): Promise<WorkspaceInfo>;
export async function detectStepOutputs(workspacePath: string, workflow: Workflow): Promise<Map<string, boolean>>;
```

### workflow-parser.ts

```typescript
import { Workflow } from './models/workflow';

export async function parseWorkflow(filePath: string): Promise<Workflow>;
export function validateWorkflow(workflow: Workflow): string[]; // 返回错误列表
```

## 实现要点

1. 使用 `yaml` 库解析 YAML 文件
2. 使用 `fs/promises` 进行文件读取
3. 检测步骤输出文件是否存在：
   - 路径相对于 workspace 根目录
   - 检查文件是否存在且非空
4. 错误处理：
   - workflow.yaml 不存在
   - workflow.yaml 格式错误
   - 必填字段缺失

## 验收标准

1. 能正确解析 `examples/workspaces/demo-login/workflow.yaml`
2. 能正确读取 `examples/workspaces/demo-login/state.json`
3. 能检测 demo-login 所有步骤的 output.md 存在状态
4. 单元测试覆盖正常和异常场景

## 测试用例

```typescript
import { describe, it, expect } from 'vitest';
import { loadWorkspace } from '../../../src/core/workspace';

describe('loadWorkspace', () => {
  it('should load demo-login workspace', async () => {
    const info = await loadWorkspace('examples/workspaces/demo-login');
    expect(info.exists).toBe(true);
    expect(info.hasWorkflow).toBe(true);
    expect(info.workflow?.name).toBe('demo-login');
    expect(info.workflow?.steps.length).toBe(6);
  });

  it('should detect step outputs', async () => {
    const info = await loadWorkspace('examples/workspaces/demo-login');
    expect(info.stepOutputs.size).toBe(6);
  });
});
```

## 执行指令

请按照上述要求实现 workspace 读取和 workflow 解析功能。
