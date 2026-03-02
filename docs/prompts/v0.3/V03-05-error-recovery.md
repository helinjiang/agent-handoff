# V03-05：错误恢复与降级

## 任务目标

实现错误检测、恢复与降级机制，确保自动化失败时能优雅地回退到辅助模式。

## 上下文

依赖：
- V03-01 TRAE Adapter 基础架构
- V03-02 TRAE 界面元素识别
- V03-03 自动输入 prompt

根据 `docs/TECH_SPEC.md` 第 8 节和第 10 节：
- v0.3 自动化模式需要：失败可降级到辅助模式
- UI 自动化脆弱：TRAE UI 更新可能导致模板失效 → 必须可降级
- 权限敏感：Accessibility/Screen Recording → 默认关闭自动化

参考：
- `src/adapters/base.ts` - BaseAdapter 的 withRetry 方法
- `src/adapters/trae/index.ts` - TraeAdapter 实现

## 产物清单

```
src/
└── adapters/
    └── trae/
        ├── error-recovery.ts     # 错误检测与恢复
        ├── fallback-handler.ts   # 降级处理
        └── diagnostics.ts        # 诊断工具
tests/
└── adapters/
    └── trae/
        ├── error-recovery.test.ts
        └── fallback-handler.test.ts
```

## 功能要求

### 1. 错误类型定义 (src/adapters/trae/error-recovery.ts)

```typescript
export type AutomationErrorType =
  | 'connection_failed'
  | 'element_not_found'
  | 'element_not_visible'
  | 'timeout'
  | 'permission_denied'
  | 'browser_crashed'
  | 'navigation_failed'
  | 'input_failed'
  | 'submit_failed'
  | 'unknown';

export interface AutomationError extends Error {
  type: AutomationErrorType;
  recoverable: boolean;
  context?: {
    selector?: string;
    operation?: string;
    screenshot?: string;
    timestamp: number;
  };
}

export interface RecoveryOptions {
  maxRetries: number;
  retryDelay: number;
  fallbackToAssisted: boolean;
  saveDiagnostics: boolean;
}

export interface RecoveryResult {
  recovered: boolean;
  attempts: number;
  finalError?: AutomationError;
  fallbackUsed: boolean;
  diagnosticsPath?: string;
}

export const DEFAULT_RECOVERY_OPTIONS: RecoveryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  fallbackToAssisted: true,
  saveDiagnostics: true,
};

export class AutomationError extends Error {
  type: AutomationErrorType;
  recoverable: boolean;
  context?: AutomationError['context'];

  constructor(
    type: AutomationErrorType,
    message: string,
    options: { recoverable?: boolean; context?: AutomationError['context'] } = {}
  ) {
    super(message);
    this.name = 'AutomationError';
    this.type = type;
    this.recoverable = options.recoverable ?? true;
    this.context = options.context;
  }

  static fromError(error: Error, context?: AutomationError['context']): AutomationError {
    if (error instanceof AutomationError) {
      return error;
    }

    const message = error.message.toLowerCase();
    let type: AutomationErrorType = 'unknown';
    let recoverable = true;

    if (message.includes('timeout')) {
      type = 'timeout';
    } else if (message.includes('not found') || message.includes('no element')) {
      type = 'element_not_found';
    } else if (message.includes('not visible')) {
      type = 'element_not_visible';
    } else if (message.includes('permission') || message.includes('access denied')) {
      type = 'permission_denied';
      recoverable = false;
    } else if (message.includes('connection') || message.includes('connect')) {
      type = 'connection_failed';
    } else if (message.includes('crash')) {
      type = 'browser_crashed';
    } else if (message.includes('navigate')) {
      type = 'navigation_failed';
    }

    return new AutomationError(type, error.message, { recoverable, context });
  }
}
```

### 2. 错误恢复处理器 (src/adapters/trae/error-recovery.ts)

```typescript
import { Page } from 'puppeteer';
import { AutomationError, RecoveryOptions, RecoveryResult, DEFAULT_RECOVERY_OPTIONS } from './error-types';
import { DiagnosticsCollector } from './diagnostics';

export class ErrorRecovery {
  private page: Page | null;
  private options: RecoveryOptions;
  private diagnostics: DiagnosticsCollector;

  constructor(page: Page | null, options: Partial<RecoveryOptions> = {}) {
    this.page = page;
    this.options = { ...DEFAULT_RECOVERY_OPTIONS, ...options };
    this.diagnostics = new DiagnosticsCollector();
  }

  async handle(error: Error | AutomationError): Promise<RecoveryResult> {
    const automationError = AutomationError.fromError(error, {
      timestamp: Date.now(),
    });

    const result: RecoveryResult = {
      recovered: false,
      attempts: 0,
      fallbackUsed: false,
    };

    if (!automationError.recoverable) {
      result.finalError = automationError;
      result.fallbackUsed = this.options.fallbackToAssisted;
      return result;
    }

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      result.attempts = attempt;

      try {
        const recovered = await this.attemptRecovery(automationError);
        if (recovered) {
          result.recovered = true;
          return result;
        }
      } catch (retryError) {
        result.finalError = AutomationError.fromError(retryError as Error, {
          timestamp: Date.now(),
        });
      }

      if (attempt < this.options.maxRetries) {
        await this.delay(this.options.retryDelay * attempt);
      }
    }

    result.fallbackUsed = this.options.fallbackToAssisted;

    if (this.options.saveDiagnostics) {
      result.diagnosticsPath = await this.diagnostics.save();
    }

    return result;
  }

  private async attemptRecovery(error: AutomationError): Promise<boolean> {
    switch (error.type) {
      case 'element_not_found':
        return await this.recoverFromElementNotFound(error);

      case 'element_not_visible':
        return await this.recoverFromElementNotVisible(error);

      case 'timeout':
        return await this.recoverFromTimeout(error);

      case 'connection_failed':
        return await this.recoverFromConnectionFailed(error);

      case 'navigation_failed':
        return await this.recoverFromNavigationFailed(error);

      default:
        return false;
    }
  }

  private async recoverFromElementNotFound(error: AutomationError): Promise<boolean> {
    if (!this.page) return false;

    await this.page.waitForTimeout(500);

    if (error.context?.selector) {
      try {
        await this.page.waitForSelector(error.context.selector, { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }

  private async recoverFromElementNotVisible(error: AutomationError): Promise<boolean> {
    if (!this.page) return false;

    try {
      await this.page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await this.page.waitForTimeout(300);
      return true;
    } catch {
      return false;
    }
  }

  private async recoverFromTimeout(error: AutomationError): Promise<boolean> {
    if (!this.page) return false;

    try {
      const readyState = await this.page.evaluate(() => document.readyState);
      if (readyState === 'complete') {
        return true;
      }
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  private async recoverFromConnectionFailed(error: AutomationError): Promise<boolean> {
    return false;
  }

  private async recoverFromNavigationFailed(error: AutomationError): Promise<boolean> {
    if (!this.page) return false;

    try {
      await this.page.reload({ waitUntil: 'networkidle2', timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 3. 降级处理器 (src/adapters/trae/fallback-handler.ts)

```typescript
import { AutomationError } from './error-recovery';
import { copyToClipboard } from '../../core/clipboard';

export interface FallbackOptions {
  copyPrompt: boolean;
  showPrompt: boolean;
  saveDiagnostics: boolean;
}

export interface FallbackResult {
  success: boolean;
  promptCopied: boolean;
  message: string;
  diagnosticsPath?: string;
}

export const DEFAULT_FALLBACK_OPTIONS: FallbackOptions = {
  copyPrompt: true,
  showPrompt: true,
  saveDiagnostics: true,
};

export class FallbackHandler {
  private options: FallbackOptions;

  constructor(options: Partial<FallbackOptions> = {}) {
    this.options = { ...DEFAULT_FALLBACK_OPTIONS, ...options };
  }

  async handle(
    error: AutomationError,
    prompt: string,
    workspacePath?: string
  ): Promise<FallbackResult> {
    const result: FallbackResult = {
      success: false,
      promptCopied: false,
      message: '',
    };

    const errorDescription = this.describeError(error);

    if (this.options.copyPrompt) {
      try {
        await copyToClipboard(prompt);
        result.promptCopied = true;
      } catch {
        result.promptCopied = false;
      }
    }

    result.message = this.buildFallbackMessage(error, result.promptCopied);
    result.success = true;

    return result;
  }

  private describeError(error: AutomationError): string {
    const descriptions: Record<string, string> = {
      connection_failed: '无法连接到 TRAE 应用',
      element_not_found: '未找到界面元素（可能 TRAE 界面已更新）',
      element_not_visible: '界面元素不可见',
      timeout: '操作超时',
      permission_denied: '权限不足',
      browser_crashed: '浏览器崩溃',
      navigation_failed: '页面导航失败',
      input_failed: '输入操作失败',
      submit_failed: '提交操作失败',
      unknown: '未知错误',
    };

    return descriptions[error.type] || error.message;
  }

  private buildFallbackMessage(error: AutomationError, promptCopied: boolean): string {
    const lines: string[] = [];

    lines.push(`⚠️  自动化失败: ${this.describeError(error)}`);
    lines.push('');
    lines.push('📋 已切换到辅助模式');

    if (promptCopied) {
      lines.push('✅ Prompt 已复制到剪贴板，请粘贴到 TRAE');
    } else {
      lines.push('请手动复制下面的 Prompt 到 TRAE');
    }

    if (!error.recoverable) {
      lines.push('');
      lines.push('💡 提示: 此错误不可恢复，请检查:');
      if (error.type === 'permission_denied') {
        lines.push('   - 确保已授予必要的系统权限');
        lines.push('   - 检查安全软件是否阻止了操作');
      }
    }

    return lines.join('\n');
  }
}
```

### 4. 诊断工具 (src/adapters/trae/diagnostics.ts)

```typescript
import { Page } from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { AutomationError } from './error-recovery';

export interface DiagnosticsData {
  timestamp: string;
  error?: {
    type: string;
    message: string;
    context?: AutomationError['context'];
  };
  browser?: {
    url: string;
    title: string;
    userAgent: string;
  };
  screenshot?: string;
  html?: string;
  console?: string[];
}

export class DiagnosticsCollector {
  private data: DiagnosticsData;
  private consoleMessages: string[] = [];

  constructor() {
    this.data = {
      timestamp: new Date().toISOString(),
    };
  }

  async collect(page: Page | null, error?: AutomationError): Promise<DiagnosticsData> {
    if (error) {
      this.data.error = {
        type: error.type,
        message: error.message,
        context: error.context,
      };
    }

    if (page) {
      try {
        this.data.browser = {
          url: page.url(),
          title: await page.title(),
          userAgent: await page.evaluate(() => navigator.userAgent),
        };

        this.data.screenshot = await this.takeScreenshot(page);
        this.data.html = await page.content();
      } catch {
        // Ignore collection errors
      }
    }

    return this.data;
  }

  async takeScreenshot(page: Page): Promise<string> {
    try {
      const base64 = await page.screenshot({ encoding: 'base64', fullPage: false });
      return `data:image/png;base64,${base64}`;
    } catch {
      return '';
    }
  }

  async save(outputPath?: string): Promise<string> {
    const filePath = outputPath || this.generatePath();
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    return filePath;
  }

  private generatePath(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `diagnostics/diagnostics-${timestamp}.json`;
  }

  getData(): DiagnosticsData {
    return { ...this.data };
  }
}
```

### 5. 更新 TraeAdapter (src/adapters/trae/index.ts)

```typescript
import { BaseAdapter, AdapterResult, ExecuteOptions, AdapterType } from '../base';
import { TraeConfig, DEFAULT_TRAE_CONFIG } from './config';
import { BrowserManager } from './browser-manager';
import { AutoInput } from './auto-input';
import { OperationLogger } from './operation-logger';
import { ErrorRecovery, AutomationError } from './error-recovery';
import { FallbackHandler } from './fallback-handler';
import { DiagnosticsCollector } from './diagnostics';
import path from 'path';
import fs from 'fs/promises';

export class TraeAdapter extends BaseAdapter {
  readonly type: AdapterType = 'trae';
  private _traeConfig: TraeConfig;
  private _browserManager: BrowserManager | null = null;
  private _operationLogger: OperationLogger | null = null;
  private _errorRecovery: ErrorRecovery | null = null;
  private _fallbackHandler: FallbackHandler | null = null;

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

    try {
      this._browserManager = new BrowserManager(this._traeConfig);
      const result = await this._browserManager.connect();

      if (!result.success) {
        throw new AutomationError('connection_failed', result.error || 'Failed to connect', {
          recoverable: false,
        });
      }

      const finder = this._browserManager.getElementFinder();
      if (!finder) {
        throw new AutomationError('element_not_found', 'Failed to create element finder');
      }

      const uiStatus = await finder.verifyUIReady();
      if (!uiStatus.ready) {
        throw new AutomationError(
          'element_not_found',
          `TRAE UI not ready. Missing elements: ${uiStatus.missing.join(', ')}`,
          { context: { timestamp: Date.now() } }
        );
      }

      this._operationLogger = new OperationLogger();
      this._errorRecovery = new ErrorRecovery(this._browserManager.getPage());
      this._fallbackHandler = new FallbackHandler();
      this._initialized = true;
    } catch (error) {
      const autoError = AutomationError.fromError(error as Error);
      if (!autoError.recoverable) {
        throw error;
      }
      throw error;
    }
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

    try {
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
    } catch (error) {
      const autoError = AutomationError.fromError(error as Error, {
        timestamp: Date.now(),
      });

      const recoveryResult = await this._errorRecovery!.handle(autoError);

      if (recoveryResult.recovered) {
        return await this.execute(prompt, options);
      }

      const fallbackResult = await this._fallbackHandler!.handle(
        autoError,
        prompt,
        options?.workspacePath
      );

      return {
        success: false,
        error: fallbackResult.message,
        duration: Date.now() - startTime,
      };
    }
  }

  async cleanup(): Promise<void> {
    if (this._browserManager) {
      await this._browserManager.disconnect();
      this._browserManager = null;
    }
    this._operationLogger = null;
    this._errorRecovery = null;
    this._fallbackHandler = null;
    this._initialized = false;
  }
}
```

## 错误类型与恢复策略

| 错误类型 | 描述 | 可恢复 | 恢复策略 |
|----------|------|--------|----------|
| connection_failed | 无法连接 TRAE | 否 | 降级到辅助模式 |
| element_not_found | 元素未找到 | 是 | 等待后重试 |
| element_not_visible | 元素不可见 | 是 | 滚动页面 |
| timeout | 操作超时 | 是 | 等待页面就绪 |
| permission_denied | 权限不足 | 否 | 提示用户授权 |
| browser_crashed | 浏览器崩溃 | 否 | 降级到辅助模式 |
| navigation_failed | 导航失败 | 是 | 刷新页面 |
| input_failed | 输入失败 | 是 | 重试输入 |
| submit_failed | 提交失败 | 是 | 重试提交 |

## 降级流程

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Recovery Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 捕获错误                                                 │
│     └── 转换为 AutomationError                               │
│                                                             │
│  2. 判断可恢复性                                             │
│     ├── 可恢复 → 尝试恢复                                    │
│     │   ├── 成功 → 继续执行                                  │
│     │   └── 失败 → 进入降级                                  │
│     └── 不可恢复 → 直接进入降级                               │
│                                                             │
│  3. 降级处理                                                 │
│     ├── 收集诊断信息                                         │
│     ├── 复制 prompt 到剪贴板                                 │
│     └── 显示友好的错误信息                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## CLI 输出示例

### 可恢复错误（重试成功）

```
⚠️  元素未找到，正在重试... (1/3)
✅ 重试成功，继续执行
✅ Prompt submitted automatically
```

### 不可恢复错误（降级）

```
❌ 自动化失败: 无法连接到 TRAE 应用

📋 已切换到辅助模式
✅ Prompt 已复制到剪贴板，请粘贴到 TRAE

💡 提示: 此错误不可恢复，请检查:
   - 确保 TRAE 应用正在运行
   - 检查 TRAE 的远程调试端口是否开启

────────────────────────────────────────
# 任务：实现登录功能
...
────────────────────────────────────────
```

### 权限错误

```
❌ 自动化失败: 权限不足

📋 已切换到辅助模式
✅ Prompt 已复制到剪贴板，请粘贴到 TRAE

💡 提示: 此错误不可恢复，请检查:
   - 确保已授予必要的系统权限
   - 检查安全软件是否阻止了操作

请手动复制下面的 Prompt 到 TRAE
────────────────────────────────────────
...
```

## 验收标准

1. 能正确识别和分类错误类型
2. 可恢复错误能自动重试
3. 不可恢复错误能优雅降级
4. 降级时自动复制 prompt 到剪贴板
5. 提供友好的错误提示
6. 支持诊断信息收集
7. 单元测试覆盖

## 测试用例

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutomationError, ErrorRecovery } from '../../../src/adapters/trae/error-recovery';
import { FallbackHandler } from '../../../src/adapters/trae/fallback-handler';

describe('AutomationError', () => {
  it('should create error with correct type', () => {
    const error = new AutomationError('element_not_found', 'Element not found');
    expect(error.type).toBe('element_not_found');
    expect(error.recoverable).toBe(true);
  });

  it('should create non-recoverable error', () => {
    const error = new AutomationError('permission_denied', 'Permission denied', {
      recoverable: false,
    });
    expect(error.recoverable).toBe(false);
  });

  it('should convert regular error to AutomationError', () => {
    const regularError = new Error('Connection timeout');
    const autoError = AutomationError.fromError(regularError);
    expect(autoError.type).toBe('timeout');
  });
});

describe('ErrorRecovery', () => {
  let recovery: ErrorRecovery;
  let mockPage: any;

  beforeEach(() => {
    mockPage = {
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue({}),
      evaluate: vi.fn().mockResolvedValue('complete'),
      reload: vi.fn().mockResolvedValue(undefined),
    };

    recovery = new ErrorRecovery(mockPage, { maxRetries: 2, retryDelay: 100 });
  });

  it('should recover from element_not_found', async () => {
    const error = new AutomationError('element_not_found', 'Not found', {
      context: { selector: '#test', timestamp: Date.now() },
    });

    const result = await recovery.handle(error);
    expect(result.recovered).toBe(true);
  });

  it('should not recover from permission_denied', async () => {
    const error = new AutomationError('permission_denied', 'Permission denied', {
      recoverable: false,
    });

    const result = await recovery.handle(error);
    expect(result.recovered).toBe(false);
    expect(result.fallbackUsed).toBe(true);
  });
});

describe('FallbackHandler', () => {
  let handler: FallbackHandler;

  beforeEach(() => {
    handler = new FallbackHandler({ copyPrompt: false, showPrompt: true });
  });

  it('should generate fallback message', async () => {
    const error = new AutomationError('element_not_found', 'Element not found');
    const result = await handler.handle(error, 'test prompt');

    expect(result.success).toBe(true);
    expect(result.message).toContain('自动化失败');
    expect(result.message).toContain('辅助模式');
  });

  it('should include tips for non-recoverable errors', async () => {
    const error = new AutomationError('permission_denied', 'Permission denied', {
      recoverable: false,
    });
    const result = await handler.handle(error, 'test prompt');

    expect(result.message).toContain('不可恢复');
    expect(result.message).toContain('权限');
  });
});
```

## 执行指令

请按照上述要求实现错误恢复与降级机制，确保自动化失败时能优雅地回退到辅助模式，并提供友好的用户提示。
