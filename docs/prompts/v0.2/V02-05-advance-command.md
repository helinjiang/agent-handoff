# V02-05：advance 命令

## 任务目标

实现 `agent-handoff advance` 命令，支持手动推进工作流状态并触发事件写入。

## 上下文

根据 `docs/roadmap.md` v0.2 规划，需要提供手动推进状态的能力。

advance 命令用于：
- 手动标记步骤完成
- 触发自定义事件写入
- 推进 state.json 的 currentIndex

依赖：
- V02-03 events-writer
- MVP-04 state-machine

## 产物清单

```
src/
└── cli/
    └── commands/
        └── advance.ts          # advance 命令实现
tests/
└── cli/
    └── commands/
        └── advance.test.ts
```

## 功能要求

### advance.ts

```typescript
import { Command } from 'commander';
import { loadWorkspace } from '../../core/workspace';
import { writeEvent } from '../../core/events-writer';
import { advanceState } from '../../core/state-machine';
import { EventType } from '../../core/models/event';
import fs from 'fs/promises';
import path from 'path';

export const advanceCommand = new Command('advance')
  .description('推进 workspace 状态')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('-e, --event <type>', '事件类型', 'step.done')
  .option('-s, --summary <text>', '事件摘要')
  .option('--no-state', '不更新 state.json')
  .option('--no-event', '不写入事件日志')
  .action(async (workspace: string, options: AdvanceOptions) => {
    // 实现逻辑
  });

interface AdvanceOptions {
  event: string;
  summary?: string;
  state: boolean;
  eventLog: boolean;
}
```

## 命令行为

### 基本用法

```bash
# 推进当前 workspace 到下一步
agent-handoff advance
# 输出:
# Current step: 01-a-clarify
# Advanced to step: 02-b-plan
# ✅ State updated
# ✅ Event written: step.done

# 指定 workspace
agent-handoff advance examples/workspaces/demo-login

# 自定义事件类型
agent-handoff advance --event verify.passed
# 输出:
# ✅ Event written: verify.passed

# 自定义摘要
agent-handoff advance --event accept.passed --summary "验收通过，所有测试通过"
```

### 高级用法

```bash
# 只更新状态，不写事件
agent-handoff advance --no-event

# 只写事件，不更新状态
agent-handoff advance --no-state

# 组合使用
agent-handoff advance --event artifact.updated --summary "产物已更新" --no-state
```

## 输出格式

### 成功推进

```
Workspace: demo-login
Current step: 01-a-clarify (index: 0)

Advanced to step: 02-b-plan (index: 1)

✅ State updated: state.json
✅ Event written: step.done
```

### 已完成所有步骤

```
Workspace: demo-login
Status: done

⚠️  Workflow already completed. No steps to advance.
```

### 自定义事件

```
Workspace: demo-login
Current step: 03-login-implement (index: 2)

✅ Event written: verify.passed
  Summary: 测试全部通过
  Links: steps/03-login-implement/output.md
```

## 实现要点

1. **状态推进**
   - 读取当前 state.json
   - 根据 stepOutputs 计算新状态
   - 更新 currentIndex 和 updatedAt
   - 写回 state.json

2. **事件写入**
   - 调用 writeEvent 写入 events.jsonl
   - 支持所有事件类型
   - 自动填充 step 信息

3. **边界处理**
   - workflow 已完成时提示
   - 无效事件类型时报错
   - workspace 不存在时提示

4. **原子操作**
   - 先写事件，再更新状态
   - 失败时回滚（可选）

## 状态更新逻辑

```typescript
async function updateState(workspacePath: string): Promise<State> {
  const statePath = path.join(workspacePath, 'state.json');
  const stateContent = await fs.readFile(statePath, 'utf-8');
  const state = JSON.parse(stateContent) as State;

  const workspace = await loadWorkspace(workspacePath);
  const newState = advanceState(state, workspace.workflow!, workspace.stepOutputs);

  newState.updatedAt = new Date().toISOString();
  await fs.writeFile(statePath, JSON.stringify(newState, null, 2));

  return newState;
}
```

## 支持的事件类型

| 事件类型 | 说明 | 默认摘要模板 |
|----------|------|--------------|
| step.started | 步骤开始 | 开始执行步骤: {stepId} |
| step.done | 步骤完成 | 步骤完成: {stepId} |
| artifact.updated | 产物更新 | 产物已更新 |
| workflow.updated | 工作流更新 | 工作流已更新 |
| verify.passed | 验证通过 | 验证通过 |
| verify.failed | 验证失败 | 验证失败 |
| accept.passed | 验收通过 | 验收通过 |
| accept.failed | 验收失败 | 验收失败 |
| issue.raised | 问题提出 | 发现问题 |
| handoff.sent | 交接发送 | 已交接给下一步 |

## CLI 集成

### 注册命令

在 `src/cli/index.ts` 中注册：

```typescript
import { advanceCommand } from './commands/advance';

program.addCommand(advanceCommand);
```

### 帮助信息

```bash
agent-handoff advance --help

Usage: agent-handoff advance [options] [workspace]

推进 workspace 状态

Arguments:
  workspace           workspace 路径 (default: ".")

Options:
  -e, --event <type>  事件类型 (default: "step.done")
  -s, --summary <text> 事件摘要
  --no-state          不更新 state.json
  --no-event          不写入事件日志
  -h, --help          display help for command
```

## 验收标准

1. 能正确推进 state.json 的 currentIndex
2. 能写入指定类型的事件到 events.jsonl
3. 支持自定义事件摘要
4. workflow 完成时正确提示
5. `--no-state` 和 `--no-event` 选项正常工作
6. 单元测试覆盖

## 测试用例

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

describe('advance command', () => {
  const testDir = path.join(process.cwd(), 'test-advance-workspace');

  beforeEach(async () => {
    // 创建测试 workspace
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'steps'), { recursive: true });
    
    // 创建 workflow.yaml
    await fs.writeFile(path.join(testDir, 'workflow.yaml'), `
name: test-advance
steps:
  - id: step1
    executor: trae
    input: brief.md
    output: steps/01-step1/output.md
  - id: step2
    executor: trae
    input: steps/01-step1/output.md
    output: steps/02-step2/output.md
`);
    
    // 创建 state.json
    await fs.writeFile(path.join(testDir, 'state.json'), JSON.stringify({
      currentIndex: 0,
      status: 'running',
      updatedAt: new Date().toISOString(),
    }));
    
    // 创建第一个步骤的输出
    await fs.mkdir(path.join(testDir, 'steps/01-step1'), { recursive: true });
    await fs.writeFile(
      path.join(testDir, 'steps/01-step1/output.md'),
      '# Output\n## 产物更新\n- done\n## 关键决策\n- done\n## 风险与待确认\n- none\n## 下一步交接\n- next'
    );
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  it('should advance state', () => {
    const output = execSync(
      `node dist/index.js advance ${testDir}`,
      { encoding: 'utf-8' }
    );
    expect(output).toContain('Advanced to step');
    expect(output).toContain('step.done');
  });

  it('should write custom event', () => {
    const output = execSync(
      `node dist/index.js advance ${testDir} --event verify.passed --summary "测试通过"`,
      { encoding: 'utf-8' }
    );
    expect(output).toContain('verify.passed');
    expect(output).toContain('测试通过');
  });

  it('should warn when workflow completed', async () => {
    // 完成所有步骤
    await fs.mkdir(path.join(testDir, 'steps/02-step2'), { recursive: true });
    await fs.writeFile(
      path.join(testDir, 'steps/02-step2/output.md'),
      '# Output\n## 产物更新\n- done\n## 关键决策\n- done\n## 风险与待确认\n- none\n## 下一步交接\n- done'
    );
    await fs.writeFile(path.join(testDir, 'state.json'), JSON.stringify({
      currentIndex: 2,
      status: 'done',
      updatedAt: new Date().toISOString(),
    }));

    const output = execSync(
      `node dist/index.js advance ${testDir}`,
      { encoding: 'utf-8' }
    );
    expect(output).toContain('already completed');
  });

  it('should not update state with --no-state', async () => {
    const stateBefore = JSON.parse(await fs.readFile(path.join(testDir, 'state.json'), 'utf-8'));
    
    execSync(`node dist/index.js advance ${testDir} --no-state`, { encoding: 'utf-8' });
    
    const stateAfter = JSON.parse(await fs.readFile(path.join(testDir, 'state.json'), 'utf-8'));
    expect(stateAfter.currentIndex).toBe(stateBefore.currentIndex);
  });
});
```

## 与其他命令的关系

| 命令 | 说明 |
|------|------|
| `next` | 显示下一步并写入 step.started |
| `advance` | 推进状态并写入 step.done（或其他事件） |
| `status` | 显示当前状态 |
| `validate` | 校验产物结构 |

典型工作流：
```bash
# 1. 查看当前状态
agent-handoff status

# 2. 获取下一步 prompt
agent-handoff next --copy

# 3. 执行任务...

# 4. 推进状态
agent-handoff advance

# 5. 重复...
```

## 执行指令

请按照上述要求实现 advance 命令，并注册到 CLI。
