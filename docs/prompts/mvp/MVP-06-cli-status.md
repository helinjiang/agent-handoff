# MVP-06：status 命令

## 任务目标

实现 `agent-handoff status` 命令，显示 workspace 当前状态。

## 上下文

依赖：
- MVP-03 的 workspace 读取功能
- MVP-04 的状态机功能

参考示例：
- `examples/workspaces/demo-login/`

## 产物清单

```
src/
└── cli/
    └── commands/
        └── status.ts     # status 命令实现
```

## 功能要求

### status 命令 (src/cli/commands/status.ts)

```typescript
import { Command } from 'commander';

export const statusCommand = new Command('status')
  .description('显示 workspace 状态')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('-j, --json', 'JSON 格式输出')
  .action(async (workspace: string, options: { json: boolean }) => {
    // 实现逻辑
  });
```

## 输出格式

### 默认格式（人类可读）

```
Workspace: demo-login
Status: done

Steps:
  ✅ 01-a-clarify (trae)
  ✅ 02-b-plan (trae)
  ✅ 03-login-implement (trae) [login]
  ✅ 04-login-test (trae) [login]
  ✅ 05-login-accept (trae) [login]
  ✅ 06-b-summary (trae)

Current: completed
```

### JSON 格式

```json
{
  "name": "demo-login",
  "path": "examples/workspaces/demo-login",
  "status": "done",
  "currentIndex": 6,
  "totalSteps": 6,
  "completedSteps": 6,
  "steps": [
    { "index": 0, "id": "a-clarify", "executor": "trae", "completed": true },
    { "index": 1, "id": "b-plan", "executor": "trae", "completed": true },
    { "index": 2, "id": "login-implement", "executor": "trae", "workItemId": "login", "completed": true },
    { "index": 3, "id": "login-test", "executor": "trae", "workItemId": "login", "completed": true },
    { "index": 4, "id": "login-accept", "executor": "trae", "workItemId": "login", "completed": true },
    { "index": 5, "id": "b-summary", "executor": "trae", "completed": true }
  ]
}
```

## 命令行为

```bash
# 显示当前目录 workspace 状态
agent-handoff status

# 显示指定 workspace 状态
agent-handoff status examples/workspaces/demo-login

# JSON 格式输出
agent-handoff status --json
```

## 错误处理

- workspace 不存在：`Error: workspace not found: <path>`
- workflow.yaml 不存在：`Error: workflow.yaml not found`
- state.json 不存在：`Error: state.json not found`

## 验收标准

1. 对 demo-login 显示 `Status: done`，所有步骤显示 ✅
2. 对 demo-login-long 显示正确状态
3. `--json` 输出有效 JSON
4. 错误情况有友好提示

## 测试用例

```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('status command', () => {
  it('should show demo-login as done', () => {
    const output = execSync(
      'node dist/index.js status examples/workspaces/demo-login',
      { encoding: 'utf-8' }
    );
    expect(output).toContain('Status: done');
    expect(output).toContain('✅');
  });

  it('should output valid JSON', () => {
    const output = execSync(
      'node dist/index.js status examples/workspaces/demo-login --json',
      { encoding: 'utf-8' }
    );
    const json = JSON.parse(output);
    expect(json.name).toBe('demo-login');
    expect(json.status).toBe('done');
  });
});
```

## 执行指令

请按照上述要求实现 status 命令。
