# V03-05：错误恢复与降级（Nut.js 路线）

## 任务目标

实现基于 Nut.js 的错误检测、恢复与降级机制，确保自动化失败时能优雅回退到辅助模式（assisted mode），并将必要诊断信息落盘，便于回放与复盘。

## 上下文

依赖：
- V03-01 TRAE Adapter 基础架构
- V03-02 TRAE 视觉元素识别（ScreenFinder / AppManager）
- V03-03 自动输入 prompt（AutoInput / TaskWaiter）
- V03-04 操作日志记录（OperationLogger / OperationReporter）

约束（来自 `docs/TECH_SPEC.md`）：
- UI 自动化脆弱：TRAE UI 更新、主题/分辨率差异会导致模板匹配失效 → 必须可降级
- 权限敏感：macOS/Windows 的辅助功能/录屏权限可能阻塞 → 默认关闭自动化
- 产物驱动：失败时必须输出“可继续手工执行”的指引，而不是中断在不可用状态

参考：
- `src/adapters/base.ts`：重试机制 withRetry
- `src/core/clipboard.ts`：复制到剪贴板
- `src/core/events-writer.ts`：事件追加（可用于记录 fallback/diagnostics）

## 产物清单

```
src/
└── adapters/
    └── trae/
        ├── error-recovery.ts     # 错误类型、恢复流程
        ├── fallback-handler.ts   # 降级处理（复制/展示 prompt）
        └── diagnostics.ts        # 诊断信息采集与落盘
tests/
└── adapters/
    └── trae/
        ├── error-recovery.test.ts
        └── fallback-handler.test.ts
```

## 功能要求

### 1) 错误类型与结构（src/adapters/trae/error-recovery.ts）

错误类型面向 Nut.js 的桌面自动化场景：

```typescript
export type AutomationErrorType =
  | 'app_not_found'
  | 'app_not_active'
  | 'image_not_found'
  | 'permission_denied'
  | 'timeout'
  | 'input_failed'
  | 'submit_failed'
  | 'unknown';

export class AutomationError extends Error {
  type: AutomationErrorType;
  recoverable: boolean;
  context?: {
    elementKey?: string;
    imageTemplate?: string;
    operation?: string;
    screenshotPath?: string;
    timestamp: number;
  };

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

  static fromError(error: unknown, context?: AutomationError['context']): AutomationError {
    if (error instanceof AutomationError) {
      return error;
    }

    const raw = error instanceof Error ? error.message : String(error);
    const message = raw.toLowerCase();

    if (message.includes('permission') || message.includes('accessibility') || message.includes('access denied')) {
      return new AutomationError('permission_denied', raw, { recoverable: false, context });
    }

    if (message.includes('timeout')) {
      return new AutomationError('timeout', raw, { recoverable: true, context });
    }

    if (message.includes('not found') || message.includes('no match') || message.includes('image')) {
      return new AutomationError('image_not_found', raw, { recoverable: true, context });
    }

    return new AutomationError('unknown', raw, { recoverable: true, context });
  }
}
```

约定：
- `permission_denied` 必须标记为不可恢复（需要用户授权）
- `image_not_found` 默认可恢复（可能是窗口未激活/界面未稳定/匹配置信度过高）

### 2) 恢复流程（src/adapters/trae/error-recovery.ts）

恢复器不依赖任何 Web/浏览器自动化能力，只依赖 Nut.js 与 V03-02 的能力（激活窗口、查找元素）。

```typescript
import { AutomationError } from './error-recovery';
import { DiagnosticsCollector } from './diagnostics';

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

export class ErrorRecovery {
  private nutjs: any;
  private appManager: any;
  private screenFinder: any;
  private options: RecoveryOptions;
  private diagnostics: DiagnosticsCollector;

  constructor(
    deps: { nutjs: any; appManager: any; screenFinder: any },
    options: Partial<RecoveryOptions> = {}
  ) {
    this.nutjs = deps.nutjs;
    this.appManager = deps.appManager;
    this.screenFinder = deps.screenFinder;
    this.options = { ...DEFAULT_RECOVERY_OPTIONS, ...options };
    this.diagnostics = new DiagnosticsCollector();
  }

  async handle(error: unknown, context?: AutomationError['context']): Promise<RecoveryResult> {
    const autoError = AutomationError.fromError(error, {
      timestamp: Date.now(),
      ...context,
    });

    const result: RecoveryResult = {
      recovered: false,
      attempts: 0,
      fallbackUsed: false,
    };

    if (!autoError.recoverable) {
      result.finalError = autoError;
      result.fallbackUsed = this.options.fallbackToAssisted;
      if (this.options.saveDiagnostics) {
        result.diagnosticsPath = await this.diagnostics.save({ error: autoError });
      }
      return result;
    }

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      result.attempts = attempt;
      try {
        const ok = await this.attemptRecovery(autoError);
        if (ok) {
          result.recovered = true;
          return result;
        }
      } catch (retryErr) {
        result.finalError = AutomationError.fromError(retryErr, { timestamp: Date.now() });
      }

      if (attempt < this.options.maxRetries) {
        await new Promise(r => setTimeout(r, this.options.retryDelay * attempt));
      }
    }

    result.finalError = result.finalError ?? autoError;
    result.fallbackUsed = this.options.fallbackToAssisted;

    if (this.options.saveDiagnostics) {
      result.diagnosticsPath = await this.diagnostics.save({ error: result.finalError });
    }

    return result;
  }

  private async attemptRecovery(error: AutomationError): Promise<boolean> {
    switch (error.type) {
      case 'app_not_active':
      case 'app_not_found':
        return await this.recoverByActivatingApp();

      case 'image_not_found':
        return await this.recoverFromImageNotFound(error);

      case 'timeout':
        return await this.recoverFromTimeout();

      case 'input_failed':
      case 'submit_failed':
        return await this.recoverByRefocus();

      default:
        return false;
    }
  }

  private async recoverByActivatingApp(): Promise<boolean> {
    const ok = await this.appManager.activateApp();
    await new Promise(r => setTimeout(r, 1000));
    return ok;
  }

  private async recoverByRefocus(): Promise<boolean> {
    await this.recoverByActivatingApp();
    return true;
  }

  private async recoverFromImageNotFound(error: AutomationError): Promise<boolean> {
    await this.recoverByActivatingApp();

    if (error.context?.elementKey) {
      const found = await this.screenFinder.waitForElement(error.context.elementKey, 3000);
      return Boolean(found?.found);
    }

    return false;
  }

  private async recoverFromTimeout(): Promise<boolean> {
    await this.recoverByActivatingApp();
    await new Promise(r => setTimeout(r, 1000));
    return true;
  }
}
```

要点：
- “恢复”只做轻量、确定性的动作（激活窗口、等待元素出现、重新聚焦）
- 更复杂的“多路径执行”应放在 V03-03 的 AutoInput（先快捷键后视觉点击）里

### 3) 降级处理（src/adapters/trae/fallback-handler.ts）

降级目标：让用户无需依赖对话上下文即可继续完成执行。

```typescript
import { AutomationError } from './error-recovery';
import { copyToClipboard } from '../../core/clipboard';

export interface FallbackOptions {
  copyPrompt: boolean;
  showPrompt: boolean;
}

export interface FallbackResult {
  success: boolean;
  promptCopied: boolean;
  message: string;
}

export const DEFAULT_FALLBACK_OPTIONS: FallbackOptions = {
  copyPrompt: true,
  showPrompt: true,
};

export class FallbackHandler {
  private options: FallbackOptions;

  constructor(options: Partial<FallbackOptions> = {}) {
    this.options = { ...DEFAULT_FALLBACK_OPTIONS, ...options };
  }

  async handle(error: AutomationError, prompt: string): Promise<FallbackResult> {
    let promptCopied = false;
    if (this.options.copyPrompt) {
      try {
        await copyToClipboard(prompt);
        promptCopied = true;
      } catch {
        promptCopied = false;
      }
    }

    return {
      success: true,
      promptCopied,
      message: this.buildMessage(error, promptCopied, prompt),
    };
  }

  private buildMessage(error: AutomationError, promptCopied: boolean, prompt: string): string {
    const lines: string[] = [];

    lines.push(`❌ 自动化失败（Nut.js）: ${this.describeError(error)}`);
    lines.push('');
    lines.push('📋 已切换到辅助模式（手工执行）');

    if (promptCopied) {
      lines.push('✅ Prompt 已复制到剪贴板，请在 TRAE 中粘贴并执行');
    } else {
      lines.push('请手动复制下面的 Prompt 到 TRAE 并执行');
    }

    if (!error.recoverable) {
      lines.push('');
      lines.push('💡 提示: 此错误不可自动恢复，请先处理：');
      if (error.type === 'permission_denied') {
        lines.push('- 为 agent-handoff 或终端授予“辅助功能/输入监控”等系统权限');
        lines.push('- 如需截图诊断，授予录屏权限（可选）');
      }
    }

    if (this.options.showPrompt) {
      lines.push('');
      lines.push('────────────────────────────────────────');
      lines.push(prompt);
      lines.push('────────────────────────────────────────');
    }

    return lines.join('\n');
  }

  private describeError(error: AutomationError): string {
    const descriptions: Record<string, string> = {
      app_not_found: '未找到或无法启动 TRAE 应用',
      app_not_active: 'TRAE 未处于前台/未获得焦点',
      image_not_found: '未找到界面元素（可能模板失效/主题分辨率变化）',
      permission_denied: '权限不足（系统阻止键鼠控制或截图）',
      timeout: '操作超时',
      input_failed: '输入失败',
      submit_failed: '提交失败',
      unknown: '未知错误',
    };

    return descriptions[error.type] ?? error.message;
  }
}
```

### 4) 诊断信息（src/adapters/trae/diagnostics.ts）

诊断信息以“可落盘、可携带、与桌面自动化一致”为目标：记录错误、基础环境信息、以及可选提示信息。截图与操作序列由 V03-04 的 OperationLogger 负责。

```typescript
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
  env?: {
    platform: string;
    node: string;
  };
  hints?: string[];
}

export class DiagnosticsCollector {
  private data: DiagnosticsData;

  constructor() {
    this.data = { timestamp: new Date().toISOString() };
  }

  async save(input?: { error?: AutomationError; outputDir?: string; hints?: string[] }): Promise<string> {
    if (input?.error) {
      this.data.error = {
        type: input.error.type,
        message: input.error.message,
        context: input.error.context,
      };
    }

    this.data.env = {
      platform: process.platform,
      node: process.version,
    };

    if (input?.hints) {
      this.data.hints = input.hints;
    }

    const filePath = this.generatePath(input?.outputDir);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    return filePath;
  }

  private generatePath(outputDir?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseDir = outputDir ?? 'diagnostics';
    return path.join(baseDir, `diagnostics-${timestamp}.json`);
  }
}
```

### 5) 与 TraeAdapter 的集成点（示意）

在 `TraeAdapter.execute()` 中捕获异常：
- 转为 `AutomationError`
- 调用 `ErrorRecovery.handle()` 尝试恢复
- 恢复失败则调用 `FallbackHandler.handle()` 输出辅助模式文案
- 若 `saveDiagnostics` 开启，则把 diagnostics 文件写入 workspace（建议 `diagnostics/` 目录）并可追加到 `events.jsonl`

## 错误类型与恢复策略（Nut.js）

| 错误类型 | 描述 | 可恢复 | 恢复策略 |
|----------|------|--------|----------|
| permission_denied | 系统权限阻塞 | 否 | 直接降级 + 提示授权 |
| app_not_found | TRAE 不存在/无法启动 | 否 | 降级 + 提示检查安装/名称 |
| app_not_active | 窗口未激活/焦点丢失 | 是 | 通过 AppManager 激活应用 |
| image_not_found | 模板匹配失败 | 是 | 激活应用后等待/重试；必要时调整 confidence（后续实现） |
| timeout | 操作超时 | 是 | 激活应用 + 等待界面稳定 |
| input_failed | 输入失败 | 是 | 重新聚焦后重试输入 |
| submit_failed | 提交失败 | 是 | 重新聚焦后重试提交 |

## 降级输出示例

### 不可恢复（权限不足）

```
❌ 自动化失败（Nut.js）: 权限不足（系统阻止键鼠控制或截图）

📋 已切换到辅助模式（手工执行）
✅ Prompt 已复制到剪贴板，请在 TRAE 中粘贴并执行

💡 提示: 此错误不可自动恢复，请先处理：
- 为 agent-handoff 或终端授予“辅助功能/输入监控”等系统权限
- 如需截图诊断，授予录屏权限（可选）

────────────────────────────────────────
# 任务：...
...
────────────────────────────────────────
```

### 可恢复（元素未找到，重试失败后降级）

```
❌ 自动化失败（Nut.js）: 未找到界面元素（可能模板失效/主题分辨率变化）

📋 已切换到辅助模式（手工执行）
✅ Prompt 已复制到剪贴板，请在 TRAE 中粘贴并执行

────────────────────────────────────────
# 任务：...
...
────────────────────────────────────────
```

## 验收标准

1. 文档与 v0.3 技术路线一致（Nut.js），不引入 Web/浏览器自动化依赖
2. 错误类型覆盖权限、应用激活、模板匹配、输入与提交失败
3. 可恢复错误具备确定性恢复动作（激活/等待/重试），不可恢复错误直接降级
4. 降级文案可直接指导用户继续执行，并可选复制 prompt
5. 诊断信息可落盘（JSON），便于回放与复盘

## 执行指令

请按上述 Nut.js 路线实现错误恢复与降级机制，并在实现时保证默认关闭自动化（需用户显式开启）。
