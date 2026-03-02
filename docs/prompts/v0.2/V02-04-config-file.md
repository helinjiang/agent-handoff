# V02-04：配置文件支持

## 任务目标

实现 `.agenthandoffrc` 配置文件支持，允许用户自定义默认行为。

## 上下文

根据 `docs/roadmap.md` v0.2 规划，需要支持配置文件以提升易用性。

配置文件可用于：
- 设置默认 workspace 路径
- 配置事件日志行为
- 自定义 prompt 模板路径
- 设置剪贴板默认行为

## 产物清单

```
src/
└── core/
    └── config.ts              # 配置文件读取与处理
tests/
└── core/
    └── config.test.ts
```

## 功能要求

### config.ts

```typescript
export interface AgentHandoffConfig {
  defaultWorkspace?: string;
  events?: {
    enabled: boolean;
    logStepStarted: boolean;
    logStepDone: boolean;
  };
  clipboard?: {
    autoCopy: boolean;
  };
  prompt?: {
    templatePath?: string;
    language: 'zh' | 'en';
  };
  validation?: {
    strict: boolean;
    warnOnShortContent: boolean;
  };
}

export const DEFAULT_CONFIG: AgentHandoffConfig = {
  events: {
    enabled: true,
    logStepStarted: true,
    logStepDone: true,
  },
  clipboard: {
    autoCopy: false,
  },
  prompt: {
    language: 'zh',
  },
  validation: {
    strict: false,
    warnOnShortContent: true,
  },
};

export async function loadConfig(workspacePath?: string): Promise<AgentHandoffConfig>;

export async function findConfigFile(startPath: string): Promise<string | null>;

export function mergeConfig(base: AgentHandoffConfig, override: Partial<AgentHandoffConfig>): AgentHandoffConfig;
```

## 配置文件格式

支持以下格式（按优先级排序）：

1. `.agenthandoffrc` (JSON)
2. `.agenthandoffrc.json` (JSON)
3. `.agenthandoffrc.yaml` (YAML)
4. `agenthandoff.config.js` (JavaScript)
5. `package.json` 中的 `agenthandoff` 字段

### 示例配置文件

`.agenthandoffrc`:
```json
{
  "defaultWorkspace": "./workspaces",
  "events": {
    "enabled": true,
    "logStepStarted": true,
    "logStepDone": true
  },
  "clipboard": {
    "autoCopy": true
  },
  "prompt": {
    "language": "zh"
  },
  "validation": {
    "strict": false,
    "warnOnShortContent": true
  }
}
```

`.agenthandoffrc.yaml`:
```yaml
defaultWorkspace: ./workspaces
events:
  enabled: true
  logStepStarted: true
  logStepDone: true
clipboard:
  autoCopy: true
prompt:
  language: zh
validation:
  strict: false
  warnOnShortContent: true
```

## 配置查找规则

从当前目录向上查找，直到找到配置文件或到达用户主目录：

```
/project/workspace/.agenthandoffrc     ← 优先级最高
/project/.agenthandoffrc
/home/user/.agenthandoffrc             ← 全局配置
```

配置合并顺序（后者覆盖前者）：
1. 默认配置 (`DEFAULT_CONFIG`)
2. 全局配置 (`~/.agenthandoffrc`)
3. 项目配置 (`项目根目录/.agenthandoffrc`)
4. workspace 配置 (`workspace 目录/.agenthandoffrc`)
5. 命令行参数

## 实现要点

1. **配置查找**
   - 从指定目录开始向上查找
   - 支持多种文件格式
   - 找到第一个有效配置文件即停止

2. **配置合并**
   - 深度合并配置对象
   - 数组不合并，直接覆盖

3. **错误处理**
   - 配置文件格式错误时使用默认配置
   - 提供友好的错误提示

4. **缓存**
   - 缓存已加载的配置
   - 监听配置文件变化（可选）

## CLI 集成

### 更新各命令

```typescript
import { loadConfig } from '../../core/config';

// 在命令处理函数中
const config = await loadConfig(workspace);

// 使用配置
if (config.clipboard?.autoCopy) {
  // 自动复制到剪贴板
}

if (config.events?.enabled && config.events?.logStepStarted) {
  // 写入 step.started 事件
}
```

### 新增 config 命令

```typescript
import { Command } from 'commander';

export const configCommand = new Command('config')
  .description('查看或管理配置')
  .argument('[action]', '操作: show, init', 'show')
  .option('-g, --global', '操作全局配置')
  .action(async (action: string, options: { global: boolean }) => {
    if (action === 'show') {
      const config = await loadConfig(options.global ? '~' : '.');
      console.log(JSON.stringify(config, null, 2));
    } else if (action === 'init') {
      // 创建默认配置文件
    }
  });
```

## 命令行为

```bash
# 显示当前配置
agent-handoff config show
# 输出:
# {
#   "events": { "enabled": true, ... },
#   "clipboard": { "autoCopy": false },
#   ...
# }

# 显示配置文件路径
agent-handoff config show --verbose
# 输出:
# Config file: /project/.agenthandoffrc
# {
#   ...
# }

# 初始化配置文件
agent-handoff config init
# 创建: .agenthandoffrc

# 初始化全局配置
agent-handoff config init --global
# 创建: ~/.agenthandoffrc
```

## 验收标准

1. 能正确查找和加载配置文件
2. 支持多种配置文件格式
3. 配置合并逻辑正确
4. 配置文件不存在时使用默认配置
5. 配置文件格式错误时优雅处理
6. 单元测试覆盖

## 测试用例

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { loadConfig, findConfigFile, mergeConfig, DEFAULT_CONFIG } from '../../../src/core/config';

describe('config', () => {
  const testDir = path.join(process.cwd(), 'test-config-workspace');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  it('should return default config when no config file', async () => {
    const config = await loadConfig(testDir);
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('should load .agenthandoffrc json file', async () => {
    await fs.writeFile(
      path.join(testDir, '.agenthandoffrc'),
      JSON.stringify({ clipboard: { autoCopy: true } })
    );

    const config = await loadConfig(testDir);
    expect(config.clipboard?.autoCopy).toBe(true);
  });

  it('should load .agenthandoffrc.yaml file', async () => {
    await fs.writeFile(
      path.join(testDir, '.agenthandoffrc.yaml'),
      'clipboard:\n  autoCopy: true'
    );

    const config = await loadConfig(testDir);
    expect(config.clipboard?.autoCopy).toBe(true);
  });

  it('should merge configs correctly', () => {
    const base = DEFAULT_CONFIG;
    const override = {
      clipboard: { autoCopy: true },
    };

    const merged = mergeConfig(base, override);
    expect(merged.clipboard?.autoCopy).toBe(true);
    expect(merged.events?.enabled).toBe(true); // 保留默认值
  });

  it('should find config file in parent directory', async () => {
    const subDir = path.join(testDir, 'subdir');
    await fs.mkdir(subDir, { recursive: true });
    await fs.writeFile(
      path.join(testDir, '.agenthandoffrc'),
      JSON.stringify({ clipboard: { autoCopy: true } })
    );

    const configFile = await findConfigFile(subDir);
    expect(configFile).toBe(path.join(testDir, '.agenthandoffrc'));
  });

  it('should handle invalid json gracefully', async () => {
    await fs.writeFile(
      path.join(testDir, '.agenthandoffrc'),
      'invalid json'
    );

    const config = await loadConfig(testDir);
    expect(config).toEqual(DEFAULT_CONFIG);
  });
});
```

## 配置项说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| defaultWorkspace | string | - | 默认 workspace 路径 |
| events.enabled | boolean | true | 是否启用事件日志 |
| events.logStepStarted | boolean | true | 是否记录 step.started |
| events.logStepDone | boolean | true | 是否记录 step.done |
| clipboard.autoCopy | boolean | false | 是否自动复制 prompt |
| prompt.templatePath | string | - | 自定义 prompt 模板路径 |
| prompt.language | 'zh' \| 'en' | 'zh' | prompt 语言 |
| validation.strict | boolean | false | 严格校验模式 |
| validation.warnOnShortContent | boolean | true | 内容过短时警告 |

## 执行指令

请按照上述要求实现配置文件支持，并集成到现有命令中。
