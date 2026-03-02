# MVP-07：Prompt 生成与 next 命令

## 任务目标

实现 TRAE prompt 生成器和 `agent-handoff next` 命令。

## 上下文

参考示例：
- `examples/workspaces/demo-login/steps/`

## 产物清单

```
src/
├── core/
│   └── prompt-generator.ts  # Prompt 生成逻辑
└── cli/
    └── commands/
        └── next.ts          # next 命令实现
```

## 功能要求

### prompt-generator.ts

```typescript
import { Workflow, Step } from './models/workflow';

export interface PromptContext {
  workflow: Workflow;
  step: Step;
  stepIndex: number;
  workspacePath: string;
}

export function generatePrompt(context: PromptContext): string;
```

### Prompt 模板结构

生成的 Prompt 应包含：

```markdown
# 任务：<step-id>

## 上下文
- Workflow: <workflow-name>
- Step: <index+1> / <total>
- Executor: <executor>

## 输入产物
请阅读以下输入产物：
- <input-path>

## 输出产物
请将结果写入：
- <output-path>

## 验收标准
<acceptance 列表>

## 输出要求
完成后请在 output.md 中包含以下区块：
- 产物更新
- 关键决策
- 风险与待确认
- 下一步交接

---
AgentHandoff Step Prompt
```

### next 命令 (src/cli/commands/next.ts)

```typescript
import { Command } from 'commander';

export const nextCommand = new Command('next')
  .description('输出下一步执行指令和 prompt')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('-c, --copy', '复制 prompt 到剪贴板（v0.2）')
  .action(async (workspace: string, options: { copy: boolean }) => {
    // 实现逻辑
  });
```

## 输出格式

### 默认格式

```
Step: 03-login-implement
Executor: trae
Work Item: login

Input:
  - steps/02-b-plan/output.md

Output:
  - steps/03-login-implement/output.md

Prompt:
────────────────────────────────────────
# 任务：login-implement

## 上下文
- Workflow: demo-login
- Step: 3 / 6
- Executor: trae
- Work Item: login

## 输入产物
请阅读以下输入产物：
- steps/02-b-plan/output.md

## 输出产物
请将结果写入：
- steps/03-login-implement/output.md

## 验收标准
- 实现注册/登录/登出/受保护接口（API）
- 密码哈希存储与基础校验

## 输出要求
完成后请在 output.md 中包含以下区块：
- 产物更新
- 关键决策
- 风险与待确认
- 下一步交接

---
AgentHandoff Step Prompt
────────────────────────────────────────

提示：将上述 Prompt 复制到 TRAE 新 Task 中执行
```

### workflow 已完成

```
Workflow "demo-login" 已完成所有步骤。
无下一步操作。
```

## 命令行为

```bash
# 显示当前 workspace 下一步
agent-handoff next

# 显示指定 workspace 下一步
agent-handoff next examples/workspaces/demo-login
```

## 验收标准

1. 对未完成的 workspace 正确输出 prompt
2. prompt 包含所有必要信息（上下文、输入输出、验收标准）
3. workflow 完成时显示完成提示
4. 正确显示 workItemId（如有）

## 测试用例

```typescript
import { describe, it, expect } from 'vitest';
import { generatePrompt } from '../../../src/core/prompt-generator';
import { Step, Workflow } from '../../../src/core/models/workflow';

describe('prompt-generator', () => {
  it('should generate prompt with all sections', () => {
    const step: Step = {
      id: 'test-step',
      executor: 'trae',
      input: 'brief.md',
      output: 'steps/01-test-step/output.md',
      acceptance: ['验收点1', '验收点2'],
    };
    const workflow: Workflow = { name: 'test', steps: [step] };
    
    const prompt = generatePrompt({
      workflow,
      step,
      stepIndex: 0,
      workspacePath: '/test',
    });
    
    expect(prompt).toContain('# 任务：test-step');
    expect(prompt).toContain('brief.md');
    expect(prompt).toContain('验收点1');
  });
});
```

## 执行指令

请按照上述要求实现 prompt 生成器和 next 命令。
