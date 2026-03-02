# V03-03：自动输入 prompt

## 任务目标

实现自动输入 prompt 功能，完成从点击新建任务、输入 prompt、提交的完整自动化流程。

## 上下文

依赖：
- V03-01 TRAE Adapter 基础架构
- V03-02 TRAE 界面元素识别

根据 `docs/TECH_SPEC.md` 第 8 节，v0.3 自动化模式需要：
- 通过视觉/模板匹配实现：点击"+新任务"→输入→提交→等待✅

参考：
- `src/adapters/trae/index.ts` - TRAE Adapter 入口
- `src/adapters/trae/ui-elements.ts` - UI 元素定义
- `src/core/prompt-generator.ts` - Prompt 生成逻辑

## 产物清单

```
src/
└── adapters/
    └── trae/
        ├── auto-input.ts         # 自动输入逻辑
        └── task-waiter.ts        # 任务等待与状态检测
tests/
└── adapters/
    └── trae/
        ├── auto-input.test.ts
        └── task-waiter.test.ts
```

## 功能要求

### 1. 自动输入逻辑 (src/adapters/trae/auto-input.ts)

```typescript
import { Page, ElementHandle } from 'puppeteer';
import { ElementFinder } from './element-finder';
import { TraeOperation } from './types';
import { OperationLogger } from './operation-logger';

export interface AutoInputOptions {
  prompt: string;
  taskName?: string;
  timeout?: number;
  screenshot?: boolean;
  screenshotDir?: string;
}

export interface AutoInputResult {
  success: boolean;
  error?: string;
  operations: TraeOperation[];
  screenshots: string[];
  taskId?: string;
}

export class AutoInput {
  private page: Page;
  private finder: ElementFinder;
  private logger: OperationLogger;

  constructor(page: Page, finder: ElementFinder, logger: OperationLogger) {
    this.page = page;
    this.finder = finder;
    this.logger = logger;
  }

  async execute(options: AutoInputOptions): Promise<AutoInputResult> {
    const operations: TraeOperation[] = [];
    const screenshots: string[] = [];

    try {
      await this.logger.log('start', 'Starting auto-input flow');

      const clickResult = await this.clickNewTask();
      if (!clickResult.success) {
        return {
          success: false,
          error: clickResult.error,
          operations,
          screenshots,
        };
      }
      operations.push(clickResult.operation);

      const inputResult = await this.inputPrompt(options.prompt);
      if (!inputResult.success) {
        return {
          success: false,
          error: inputResult.error,
          operations,
          screenshots,
        };
      }
      operations.push(inputResult.operation);

      const submitResult = await this.submitTask();
      if (!submitResult.success) {
        return {
          success: false,
          error: submitResult.error,
          operations,
          screenshots,
        };
      }
      operations.push(submitResult.operation);

      if (options.screenshot) {
        const screenshotPath = await this.takeScreenshot(options.screenshotDir);
        if (screenshotPath) {
          screenshots.push(screenshotPath);
        }
      }

      await this.logger.log('complete', 'Auto-input flow completed');

      return {
        success: true,
        operations,
        screenshots,
      };
    } catch (error) {
      await this.logger.log('error', `Auto-input failed: ${(error as Error).message}`);
      return {
        success: false,
        error: (error as Error).message,
        operations,
        screenshots,
      };
    }
  }

  private async clickNewTask(): Promise<{ success: boolean; error?: string; operation: TraeOperation }> {
    const timestamp = Date.now();

    const result = await this.finder.findElement('newTaskButton');
    if (!result.found || !result.element) {
      return {
        success: false,
        error: 'New task button not found',
        operation: { type: 'click', target: 'newTaskButton', timestamp },
      };
    }

    try {
      await result.element.click();
      await this.page.waitForTimeout(500);

      return {
        success: true,
        operation: { type: 'click', target: 'newTaskButton', timestamp },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to click new task button: ${(error as Error).message}`,
        operation: { type: 'click', target: 'newTaskButton', timestamp },
      };
    }
  }

  private async inputPrompt(prompt: string): Promise<{ success: boolean; error?: string; operation: TraeOperation }> {
    const timestamp = Date.now();

    const result = await this.finder.findElement('taskInputArea');
    if (!result.found || !result.element) {
      return {
        success: false,
        error: 'Task input area not found',
        operation: { type: 'fill', target: 'taskInputArea', value: prompt, timestamp },
      };
    }

    try {
      await result.element.click();
      await this.page.waitForTimeout(200);

      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await this.page.waitForTimeout(100);

      await result.element.type(prompt, { delay: 10 });

      return {
        success: true,
        operation: { type: 'fill', target: 'taskInputArea', value: prompt, timestamp },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to input prompt: ${(error as Error).message}`,
        operation: { type: 'fill', target: 'taskInputArea', value: prompt, timestamp },
      };
    }
  }

  private async submitTask(): Promise<{ success: boolean; error?: string; operation: TraeOperation }> {
    const timestamp = Date.now();

    const result = await this.finder.findElement('submitButton');
    if (!result.found || !result.element) {
      return {
        success: false,
        error: 'Submit button not found',
        operation: { type: 'click', target: 'submitButton', timestamp },
      };
    }

    try {
      await result.element.click();
      await this.page.waitForTimeout(1000);

      return {
        success: true,
        operation: { type: 'click', target: 'submitButton', timestamp },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to submit task: ${(error as Error).message}`,
        operation: { type: 'click', target: 'submitButton', timestamp },
      };
    }
  }

  private async takeScreenshot(dir?: string): Promise<string | null> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `auto-input-${timestamp}.png`;
      const path = dir ? `${dir}/${filename}` : filename;
      await this.page.screenshot({ path, fullPage: false });
      return path;
    } catch {
      return null;
    }
  }
}
```

### 2. 任务等待与状态检测 (src/adapters/trae/task-waiter.ts)

```typescript
import { Page } from 'puppeteer';
import { ElementFinder } from './element-finder';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'unknown';

export interface TaskWaitOptions {
  timeout?: number;
  pollInterval?: number;
}

export interface TaskWaitResult {
  status: TaskStatus;
  waitedMs: number;
  error?: string;
}

export class TaskWaiter {
  private page: Page;
  private finder: ElementFinder;

  constructor(page: Page, finder: ElementFinder) {
    this.page = page;
    this.finder = finder;
  }

  async waitForCompletion(options: TaskWaitOptions = {}): Promise<TaskWaitResult> {
    const timeout = options.timeout ?? 300000;
    const pollInterval = options.pollInterval ?? 2000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.getTaskStatus();

      if (status === 'completed') {
        return {
          status: 'completed',
          waitedMs: Date.now() - startTime,
        };
      }

      if (status === 'failed') {
        return {
          status: 'failed',
          waitedMs: Date.now() - startTime,
          error: 'Task execution failed',
        };
      }

      await this.delay(pollInterval);
    }

    return {
      status: 'unknown',
      waitedMs: Date.now() - startTime,
      error: 'Timeout waiting for task completion',
    };
  }

  async getTaskStatus(): Promise<TaskStatus> {
    const completeResult = await this.finder.findElement('taskCompleteIndicator');
    if (completeResult.found) {
      return 'completed';
    }

    const activeResult = await this.finder.findElement('activeTask');
    if (activeResult.found) {
      const element = activeResult.element;
      if (element) {
        const className = await element.evaluate(el => el.className);
        if (className.includes('error') || className.includes('failed')) {
          return 'failed';
        }
        if (className.includes('running') || className.includes('processing')) {
          return 'running';
        }
      }
    }

    return 'pending';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 3. 更新 TraeAdapter (src/adapters/trae/index.ts)

```typescript
import { BaseAdapter, AdapterResult, ExecuteOptions, AdapterType } from '../base';
import { TraeConfig, DEFAULT_TRAE_CONFIG } from './config';
import { BrowserManager } from './browser-manager';
import { AutoInput, AutoInputOptions } from './auto-input';
import { TaskWaiter } from './task-waiter';
import { OperationLogger } from './operation-logger';
import path from 'path';
import fs from 'fs/promises';

export class TraeAdapter extends BaseAdapter {
  readonly type: AdapterType = 'trae';
  private _traeConfig: TraeConfig;
  private _browserManager: BrowserManager | null = null;
  private _operationLogger: OperationLogger | null = null;

  constructor(config: Partial<TraeConfig> = {}) {
    super({
      enabled: config.enabled ?? DEFAULT_TRAE_CONFIG.enabled,
      timeout: config.timeout ?? DEFAULT_TRAE_CONFIG.timeout,
      retries: config.retries ?? DEFAULT_TRAE_CONFIG.retries,
    });
    this._traeConfig = { ...DEFAULT_TRAE_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (!this._config.enabled) {
      return;
    }

    this._browserManager = new BrowserManager(this._traeConfig);
    const result = await this._browserManager.connect();

    if (!result.success) {
      throw new Error(`Failed to initialize TRAE adapter: ${result.error}`);
    }

    const finder = this._browserManager.getElementFinder();
    if (!finder) {
      throw new Error('Failed to create element finder');
    }

    const uiStatus = await finder.verifyUIReady();
    if (!uiStatus.ready) {
      throw new Error(`TRAE UI not ready. Missing elements: ${uiStatus.missing.join(', ')}`);
    }

    this._operationLogger = new OperationLogger();
    this._initialized = true;
  }

  async isReady(): Promise<boolean> {
    return this._initialized && 
           this._browserManager !== null && 
           this._browserManager.isConnected();
  }

  async execute(prompt: string, options?: ExecuteOptions): Promise<AdapterResult> {
    const startTime = Date.now();
    
    if (!this._config.enabled) {
      return {
        success: false,
        error: 'Adapter is disabled',
        duration: Date.now() - startTime,
      };
    }

    if (!await this.isReady()) {
      return {
        success: false,
        error: 'Adapter not initialized',
        duration: Date.now() - startTime,
      };
    }

    const page = this._browserManager!.getPage();
    const finder = this._browserManager!.getElementFinder();

    if (!page || !finder) {
      return {
        success: false,
        error: 'Browser or element finder not available',
        duration: Date.now() - startTime,
      };
    }

    const autoInput = new AutoInput(page, finder, this._operationLogger!);

    const screenshotDir = options?.workspacePath
      ? path.join(options.workspacePath, this._traeConfig.screenshotDir)
      : this._traeConfig.screenshotDir;

    if (options?.screenshot || this._traeConfig.screenshot) {
      await fs.mkdir(screenshotDir, { recursive: true });
    }

    const result = await autoInput.execute({
      prompt,
      timeout: options?.timeout ?? this._traeConfig.timeout,
      screenshot: options?.screenshot ?? this._traeConfig.screenshot,
      screenshotDir,
    });

    return {
      success: result.success,
      error: result.error,
      screenshot: result.screenshots[0],
      duration: Date.now() - startTime,
    };
  }

  async cleanup(): Promise<void> {
    if (this._browserManager) {
      await this._browserManager.disconnect();
      this._browserManager = null;
    }
    this._operationLogger = null;
    this._initialized = false;
  }
}
```

## 自动化流程

```
┌─────────────────────────────────────────────────────────────┐
│                    Auto-Input Flow                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. clickNewTask()                                          │
│     └── 查找新建任务按钮                                      │
│     └── 点击按钮                                             │
│     └── 等待 500ms                                           │
│                                                             │
│  2. inputPrompt(prompt)                                     │
│     └── 查找输入区域                                         │
│     └── 点击聚焦                                             │
│     └── Ctrl+A 全选                                          │
│     └── 输入 prompt（带延迟模拟人工输入）                      │
│                                                             │
│  3. submitTask()                                            │
│     └── 查找提交按钮                                         │
│     └── 点击提交                                             │
│     └── 等待 1000ms                                          │
│                                                             │
│  4. takeScreenshot() (可选)                                 │
│     └── 保存截图到指定目录                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## CLI 集成

### 更新 next 命令

```typescript
import { Command } from 'commander';
import { TraeAdapter } from '../../adapters/trae';
import { loadConfig } from '../../core/config';

export const nextCommand = new Command('next')
  .description('输出下一步执行指令和 prompt')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('-c, --copy', '复制 prompt 到剪贴板')
  .option('--auto', '启用自动化模式')
  .option('--screenshot', '自动截图')
  .option('--wait', '等待任务完成')
  .action(async (workspace: string, options: NextOptions) => {
    const config = await loadConfig(workspace);
    const prompt = generatePrompt(step, workspace);

    if (options.auto || config.automation?.enabled) {
      const adapter = new TraeAdapter({
        enabled: true,
        screenshot: options.screenshot ?? config.automation?.screenshot,
        timeout: config.automation?.timeout,
        retries: config.automation?.retries,
      });

      try {
        console.log('🤖 Initializing automation...');
        await adapter.initialize();

        console.log('📝 Submitting prompt...');
        const result = await adapter.execute(prompt, {
          workspacePath: workspace,
          stepId: step.id,
          screenshot: options.screenshot,
        });

        if (result.success) {
          console.log('✅ Prompt submitted automatically');
          if (result.screenshot) {
            console.log(`📸 Screenshot saved: ${result.screenshot}`);
          }
        } else {
          console.log(`⚠️  Automation failed: ${result.error}`);
          console.log('📋 Falling back to assisted mode');
          console.log(prompt);
        }
      } catch (error) {
        console.log(`❌ Automation error: ${(error as Error).message}`);
        console.log('📋 Falling back to assisted mode');
        console.log(prompt);
      } finally {
        await adapter.cleanup();
      }
    } else {
      console.log(prompt);
      if (options.copy) {
        await copyToClipboard(prompt);
        console.log('✅ Prompt copied to clipboard');
      }
    }
  });
```

## 命令行为

```bash
# 自动化模式
agent-handoff next examples/workspaces/demo-login --auto
# 输出:
# 🤖 Initializing automation...
# 📝 Submitting prompt...
# ✅ Prompt submitted automatically

# 自动化 + 截图
agent-handoff next --auto --screenshot
# 输出:
# 🤖 Initializing automation...
# 📝 Submitting prompt...
# ✅ Prompt submitted automatically
# 📸 Screenshot saved: screenshots/auto-input-2026-03-02T10-30-00.png

# 自动化失败降级
agent-handoff next --auto
# 输出:
# 🤖 Initializing automation...
# ❌ Automation error: Failed to connect to TRAE
# 📋 Falling back to assisted mode
# Prompt: ...
```

## 实现要点

1. **输入模拟**
   - 使用 type 方法模拟人工输入
   - 添加适当延迟避免被检测为自动化

2. **错误恢复**
   - 每一步都返回详细错误信息
   - 失败时记录已执行的操作

3. **截图功能**
   - 支持在关键步骤截图
   - 截图保存到 workspace 目录

4. **超时处理**
   - 每个操作有独立超时
   - 总体执行时间限制

## 验收标准

1. 能自动点击新建任务按钮
2. 能正确输入 prompt 内容
3. 能自动提交任务
4. 支持截图功能
5. 失败时返回详细错误
6. 单元测试覆盖

## 测试用例

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoInput } from '../../../src/adapters/trae/auto-input';

describe('AutoInput', () => {
  let autoInput: AutoInput;
  let mockPage: any;
  let mockFinder: any;
  let mockLogger: any;

  beforeEach(() => {
    mockPage = {
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      keyboard: {
        down: vi.fn().mockResolvedValue(undefined),
        up: vi.fn().mockResolvedValue(undefined),
        press: vi.fn().mockResolvedValue(undefined),
      },
      screenshot: vi.fn().mockResolvedValue(undefined),
    };

    mockFinder = {
      findElement: vi.fn().mockImplementation((key: string) => ({
        found: true,
        element: {
          click: vi.fn().mockResolvedValue(undefined),
          type: vi.fn().mockResolvedValue(undefined),
          evaluate: vi.fn().mockResolvedValue(''),
        },
        selector: `[data-testid="${key}"]`,
      })),
    };

    mockLogger = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    autoInput = new AutoInput(mockPage, mockFinder, mockLogger);
  });

  it('should execute auto-input flow successfully', async () => {
    const result = await autoInput.execute({
      prompt: 'Test prompt',
    });

    expect(result.success).toBe(true);
    expect(result.operations).toHaveLength(3);
    expect(result.operations[0].type).toBe('click');
    expect(result.operations[1].type).toBe('fill');
    expect(result.operations[2].type).toBe('click');
  });

  it('should fail when new task button not found', async () => {
    mockFinder.findElement = vi.fn().mockResolvedValue({
      found: false,
      element: null,
      selector: '',
    });

    const result = await autoInput.execute({
      prompt: 'Test prompt',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('New task button not found');
  });

  it('should take screenshot when enabled', async () => {
    const result = await autoInput.execute({
      prompt: 'Test prompt',
      screenshot: true,
      screenshotDir: '/tmp',
    });

    expect(result.success).toBe(true);
    expect(mockPage.screenshot).toHaveBeenCalled();
  });
});
```

## 执行指令

请按照上述要求实现自动输入 prompt 功能，确保能完成完整的自动化流程，并集成到 next 命令中。
