# MVP-05：CLI 框架与 init 命令

## 任务目标

实现 CLI 框架和 `agent-handoff init` 命令，创建标准 workspace 结构。

## 上下文

参考示例：
- `/Users/bytedance/workspace/gitforgithub/agent-handoff/examples/workspaces/demo-login/`

## 产物清单

```
src/
├── cli/
│   ├── index.ts          # CLI 主入口
│   └── commands/
│       └── init.ts       # init 命令实现
└── templates/
    └── workspace/
        ├── workflow.yaml # workflow 模板
        ├── state.json    # state 模板
        └── brief.md      # brief 模板
```

## 功能要求

### CLI 主入口 (src/cli/index.ts)

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';

const program = new Command();

program
  .name('agent-handoff')
  .description('轻量级多 Agent 协作接力工具')
  .version('0.1.0');

program.addCommand(initCommand);

program.parse();
```

### init 命令 (src/cli/commands/init.ts)

```typescript
import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';

export const initCommand = new Command('init')
  .description('创建新的 workspace')
  .argument('<name>', 'workspace 名称')
  .option('-p, --path <path>', '父目录路径', process.cwd())
  .action(async (name: string, options: { path: string }) => {
    // 实现逻辑
  });
```

### 创建的 workspace 结构

```
<name>/
├── workflow.yaml
├── state.json
├── brief.md
└── steps/
```

### workflow.yaml 模板

```yaml
name: <name>
steps:
  - id: clarify
    executor: trae
    input: brief.md
    output: steps/01-clarify/output.md
    acceptance:
      - 澄清需求范围与非目标
      - 产出结构化需求文档
```

### state.json 模板

```json
{
  "currentIndex": 0,
  "status": "running",
  "updatedAt": "<ISO 8601 时间戳>"
}
```

### brief.md 模板

```markdown
# brief：需求描述

## 背景
（请描述项目背景）

## 目标
（请描述本轮目标）

## 非目标
（请描述本轮不做的事情）

## 验收标准
（请描述验收标准）
```

## 命令行为

```bash
# 在当前目录创建 my-project workspace
agent-handoff init my-project

# 在指定目录创建
agent-handoff init my-project --path /path/to/parent

# 目录已存在时报错
agent-handoff init my-project
# Error: workspace "my-project" already exists
```

## 验收标准

1. `agent-handoff --help` 显示帮助信息
2. `agent-handoff --version` 显示版本号
3. `agent-handoff init demo-test` 创建标准 workspace 结构
4. 目录已存在时显示错误信息
5. `--path` 参数正常工作

## 测试用例

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

describe('init command', () => {
  const testDir = path.join(process.cwd(), 'test-workspace');

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  it('should create workspace structure', async () => {
    execSync(`node dist/index.js init test-workspace`, { cwd: process.cwd() });
    
    const stat = await fs.stat(testDir);
    expect(stat.isDirectory()).toBe(true);
    
    const workflow = await fs.readFile(path.join(testDir, 'workflow.yaml'), 'utf-8');
    expect(workflow).toContain('name: test-workspace');
  });
});
```

## 执行指令

请按照上述要求实现 CLI 框架和 init 命令。
