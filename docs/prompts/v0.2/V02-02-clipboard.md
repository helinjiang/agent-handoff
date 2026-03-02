# V02-02：剪贴板集成

## 任务目标

实现跨平台剪贴板功能，支持自动复制 prompt 到剪贴板，提升用户体验。

## 上下文

根据 `docs/roadmap.md` v0.2 规划：
- v0.1：用户手动复制 prompt
- v0.2：自动复制 prompt 到剪贴板

参考：
- `src/cli/commands/next.ts` 现有实现
- `docs/prompts/mvp/MVP-07-cli-next.md` 中的 `--copy` 选项规划

## 产物清单

```
src/
└── core/
    └── clipboard.ts           # 剪贴板操作封装
tests/
└── core/
    └── clipboard.test.ts
```

## 功能要求

### clipboard.ts

```typescript
export interface ClipboardResult {
  success: boolean;
  error?: string;
}

export async function copyToClipboard(text: string): Promise<ClipboardResult>;

export async function readFromClipboard(): Promise<string>;

export function isClipboardSupported(): boolean;
```

## 技术选型

推荐使用 `clipboardy` 库，原因：
- 跨平台支持（macOS / Windows / Linux）
- 无需系统权限
- 轻量级，无原生依赖
- 活跃维护

### 安装依赖

```bash
pnpm add clipboardy
```

### package.json 更新

```json
{
  "dependencies": {
    "clipboardy": "^4.0.0"
  }
}
```

## 实现要点

1. **跨平台兼容**
   - macOS：使用 `pbcopy` / `pbpaste`
   - Windows：使用 `clip` / `powershell`
   - Linux：使用 `xclip` / `xsel` / `wl-copy`

2. **错误处理**
   - 剪贴板不可用时优雅降级
   - 提供清晰的错误信息

3. **异步操作**
   - 所有剪贴板操作使用 async/await
   - 超时处理（防止挂起）

## CLI 集成

### 更新 next 命令

修改 `src/cli/commands/next.ts`：

```typescript
import { Command } from 'commander';
import { copyToClipboard, isClipboardSupported } from '../../core/clipboard';

export const nextCommand = new Command('next')
  .description('输出下一步执行指令和 prompt')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('-c, --copy', '复制 prompt 到剪贴板')
  .action(async (workspace: string, options: { copy: boolean }) => {
    // ... 生成 prompt 逻辑 ...
    
    if (options.copy) {
      if (!isClipboardSupported()) {
        console.log('⚠️  剪贴板功能在当前环境不可用');
        console.log('请手动复制上面的 Prompt');
        return;
      }
      
      const result = await copyToClipboard(prompt);
      if (result.success) {
        console.log('✅ Prompt 已复制到剪贴板');
      } else {
        console.log(`❌ 复制失败: ${result.error}`);
        console.log('请手动复制上面的 Prompt');
      }
    }
  });
```

## 命令行为

```bash
# 生成 prompt 并复制到剪贴板
agent-handoff next examples/workspaces/demo-login --copy
# 输出:
# Step: 03-login-implement
# ...
# ✅ Prompt 已复制到剪贴板

# 剪贴板不可用时
agent-handoff next --copy
# 输出:
# ⚠️  剪贴板功能在当前环境不可用
# 请手动复制上面的 Prompt
```

## 输出格式

### 成功

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
...
────────────────────────────────────────

✅ Prompt 已复制到剪贴板
```

### 失败

```
...
────────────────────────────────────────

❌ 复制失败: xclip not found
请手动复制上面的 Prompt
```

## 验收标准

1. macOS 上 `--copy` 选项正常工作
2. Linux 上 `--copy` 选项正常工作（需 xclip/xsel）
3. Windows 上 `--copy` 选项正常工作
4. 剪贴板不可用时优雅降级
5. 错误信息清晰友好
6. 单元测试覆盖

## 测试用例

```typescript
import { describe, it, expect } from 'vitest';
import { copyToClipboard, readFromClipboard, isClipboardSupported } from '../../../src/core/clipboard';

describe('clipboard', () => {
  it('should detect clipboard support', () => {
    const supported = isClipboardSupported();
    expect(typeof supported).toBe('boolean');
  });

  it('should copy and read text', async () => {
    if (!isClipboardSupported()) {
      return; // Skip if clipboard not supported
    }

    const testText = 'Hello, AgentHandoff!';
    const copyResult = await copyToClipboard(testText);
    expect(copyResult.success).toBe(true);

    const readText = await readFromClipboard();
    expect(readText).toBe(testText);
  });

  it('should handle empty text', async () => {
    if (!isClipboardSupported()) {
      return;
    }

    const result = await copyToClipboard('');
    expect(result.success).toBe(true);
  });

  it('should handle long text', async () => {
    if (!isClipboardSupported()) {
      return;
    }

    const longText = 'x'.repeat(10000);
    const result = await copyToClipboard(longText);
    expect(result.success).toBe(true);
  });
});
```

## 集成测试

```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('next command with --copy', () => {
  it('should copy prompt to clipboard', () => {
    const output = execSync(
      'node dist/index.js next examples/workspaces/demo-login --copy',
      { encoding: 'utf-8' }
    );
    expect(output).toContain('Prompt:');
    // 注意：无法在 CI 环境验证剪贴板内容
  });
});
```

## 注意事项

1. **CI 环境**
   - CI 环境通常没有剪贴板支持
   - 测试应跳过或 mock 剪贴板操作

2. **权限问题**
   - 某些 Linux 发行版可能需要安装 xclip/xsel
   - 提供安装提示

3. **超时处理**
   - 剪贴板操作设置合理超时（如 5 秒）
   - 超时后优雅降级

## 执行指令

请按照上述要求实现剪贴板功能，并集成到 next 命令的 `--copy` 选项中。
