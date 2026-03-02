# V03-01：TRAE Adapter 基础架构

## 任务目标

建立 TRAE 自动化适配器的基础架构，定义 Adapter 接口规范，实现 TRAE Adapter 基类。

## 上下文

根据 `docs/TECH_SPEC.md` 第 8 节，TRAE 执行端方案演进路线：
- v0：辅助模式（生成 prompt，用户手动粘贴）
- v0.2：半自动（剪贴板集成）
- v0.3：自动模式（UI 自动化）

本任务为 v0.3 的基础架构搭建，为后续自动化功能提供框架支撑。

参考：
- `src/core/prompt-generator.ts` - Prompt 生成逻辑
- `src/cli/commands/next.ts` - 现有 next 命令实现

## 产物清单

```
src/
└── adapters/
    ├── index.ts              # Adapter 导出入口
    ├── base.ts               # Adapter 基类与接口定义
    └── trae/
        ├── index.ts          # TRAE Adapter 入口
        ├── types.ts          # TRAE 特有类型定义
        └── config.ts         # TRAE 配置
tests/
└── adapters/
    ├── base.test.ts
    └── trae/
        └── index.test.ts
```

## 功能要求

### 1. Adapter 接口定义 (src/adapters/base.ts)

```typescript
export type AdapterType = 'trae' | 'shell' | 'api' | 'manual';

export interface AdapterConfig {
  type: AdapterType;
  enabled: boolean;
  timeout: number;
  retries: number;
}

export interface AdapterResult {
  success: boolean;
  error?: string;
  screenshot?: string;
  duration: number;
}

export interface Adapter {
  readonly type: AdapterType;
  readonly config: AdapterConfig;

  initialize(): Promise<void>;
  isReady(): Promise<boolean>;
  execute(prompt: string, options?: ExecuteOptions): Promise<AdapterResult>;
  cleanup(): Promise<void>;
}

export interface ExecuteOptions {
  workspacePath?: string;
  stepId?: string;
  screenshot?: boolean;
  timeout?: number;
}
```

### 2. Adapter 基类 (src/adapters/base.ts)

```typescript
export abstract class BaseAdapter implements Adapter {
  abstract readonly type: AdapterType;
  protected _config: AdapterConfig;
  protected _initialized: boolean = false;

  constructor(config: Partial<AdapterConfig>) {
    this._config = {
      type: this.type,
      enabled: config.enabled ?? false,
      timeout: config.timeout ?? 30000,
      retries: config.retries ?? 3,
    };
  }

  get config(): AdapterConfig {
    return this._config;
  }

  abstract initialize(): Promise<void>;
  abstract isReady(): Promise<boolean>;
  abstract execute(prompt: string, options?: ExecuteOptions): Promise<AdapterResult>;
  abstract cleanup(): Promise<void>;

  protected async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = this._config.retries
  ): Promise<T> {
    let lastError: Error | null = null;
    for (let i = 0; i <= retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i < retries) {
          await this.delay(1000 * (i + 1));
        }
      }
    }
    throw lastError;
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 3. TRAE Adapter 入口 (src/adapters/trae/index.ts)

```typescript
import { BaseAdapter, AdapterResult, ExecuteOptions, AdapterType } from '../base';
import { TraeConfig, DEFAULT_TRAE_CONFIG } from './config';

export class TraeAdapter extends BaseAdapter {
  readonly type: AdapterType = 'trae';
  private _traeConfig: TraeConfig;
  private _browser: Browser | null = null;
  private _page: Page | null = null;

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
    // 初始化逻辑将在 V03-02 中实现
  }

  async isReady(): Promise<boolean> {
    return this._initialized && this._browser !== null;
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

    // 执行逻辑将在 V03-03 中实现
    return {
      success: true,
      duration: Date.now() - startTime,
    };
  }

  async cleanup(): Promise<void> {
    if (this._browser) {
      await this._browser.close();
      this._browser = null;
      this._page = null;
    }
    this._initialized = false;
  }
}
```

### 4. TRAE 配置 (src/adapters/trae/config.ts)

```typescript
export interface TraeConfig {
  enabled: boolean;
  timeout: number;
  retries: number;
  screenshot: boolean;
  screenshotDir: string;
  headless: boolean;
  connectToExisting: boolean;
  traeUrl: string;
}

export const DEFAULT_TRAE_CONFIG: TraeConfig = {
  enabled: false,
  timeout: 30000,
  retries: 3,
  screenshot: false,
  screenshotDir: 'screenshots',
  headless: false,
  connectToExisting: true,
  traeUrl: 'http://localhost:3000',
};
```

### 5. TRAE 类型定义 (src/adapters/trae/types.ts)

```typescript
export interface TraeUIElement {
  selector: string;
  alternativeSelectors: string[];
  description: string;
  waitStrategy: 'visible' | 'attached' | 'hidden';
}

export interface TraeOperation {
  type: 'click' | 'fill' | 'wait' | 'screenshot' | 'navigate';
  target: string;
  value?: string;
  timestamp: number;
}

export interface TraeSession {
  id: string;
  startedAt: string;
  workspacePath: string;
  stepId: string;
  operations: TraeOperation[];
  screenshots: string[];
}
```

### 6. Adapter 导出入口 (src/adapters/index.ts)

```typescript
export { BaseAdapter, Adapter, AdapterConfig, AdapterResult, AdapterType, ExecuteOptions } from './base';
export { TraeAdapter } from './trae';
export { TraeConfig, DEFAULT_TRAE_CONFIG } from './trae/config';
```

## 目录结构

创建 adapters 目录：

```
src/
├── adapters/
│   ├── index.ts
│   ├── base.ts
│   └── trae/
│       ├── index.ts
│       ├── types.ts
│       ├── config.ts
│       ├── ui-elements.ts    # V03-02
│       ├── auto-input.ts     # V03-03
│       ├── operation-logger.ts # V03-04
│       └── error-recovery.ts # V03-05
├── core/
└── cli/
```

## 实现要点

1. **接口隔离**
   - Adapter 接口定义在 `src/adapters/base.ts`
   - TRAE 特有逻辑在 `src/adapters/trae/` 目录
   - 不在 core 中引入 Puppeteer 依赖

2. **懒加载**
   - Puppeteer 仅在需要时加载
   - 使用动态 import 减少启动时间

3. **配置优先级**
   - 默认配置 < 配置文件 < 命令行参数

4. **生命周期管理**
   - initialize：初始化浏览器连接
   - execute：执行自动化操作
   - cleanup：清理资源

## 配置集成

更新 `src/core/config.ts`：

```typescript
export interface AgentHandoffConfig {
  // ... 现有配置 ...
  automation?: {
    enabled: boolean;
    provider: 'puppeteer';
    screenshot: boolean;
    timeout: number;
    retries: number;
  };
}

export const DEFAULT_CONFIG: AgentHandoffConfig = {
  // ... 现有默认值 ...
  automation: {
    enabled: false,
    provider: 'puppeteer',
    screenshot: false,
    timeout: 30000,
    retries: 3,
  },
};
```

## CLI 集成准备

更新 `src/cli/commands/next.ts`：

```typescript
import { TraeAdapter } from '../../adapters/trae';

export const nextCommand = new Command('next')
  .description('输出下一步执行指令和 prompt')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('-c, --copy', '复制 prompt 到剪贴板')
  .option('--auto', '启用自动化模式')
  .option('--screenshot', '自动截图')
  .action(async (workspace: string, options: NextOptions) => {
    // ... 现有逻辑 ...

    if (options.auto) {
      const adapter = new TraeAdapter({
        enabled: true,
        screenshot: options.screenshot,
      });
      
      try {
        await adapter.initialize();
        const result = await adapter.execute(prompt, {
          workspacePath: workspace,
          stepId: step.id,
          screenshot: options.screenshot,
        });
        
        if (result.success) {
          console.log('✅ Prompt submitted automatically');
        } else {
          console.log(`⚠️  Automation failed: ${result.error}`);
          console.log('📋 Falling back to assisted mode');
          console.log(prompt);
        }
      } finally {
        await adapter.cleanup();
      }
    } else {
      // 现有辅助模式逻辑
      console.log(prompt);
    }
  });
```

## 验收标准

1. adapters 目录结构正确创建
2. Adapter 接口定义清晰完整
3. BaseAdapter 实现了通用逻辑（重试、延迟）
4. TraeAdapter 基本框架可编译
5. 配置集成到 config.ts
6. 单元测试覆盖基础逻辑

## 测试用例

```typescript
import { describe, it, expect } from 'vitest';
import { BaseAdapter, AdapterType } from '../../../src/adapters/base';

describe('BaseAdapter', () => {
  class TestAdapter extends BaseAdapter {
    readonly type: AdapterType = 'manual';
    
    async initialize() { this._initialized = true; }
    async isReady() { return this._initialized; }
    async execute() { return { success: true, duration: 0 }; }
    async cleanup() { this._initialized = false; }
  }

  it('should create adapter with default config', () => {
    const adapter = new TestAdapter({});
    expect(adapter.config.enabled).toBe(false);
    expect(adapter.config.timeout).toBe(30000);
    expect(adapter.config.retries).toBe(3);
  });

  it('should merge config correctly', () => {
    const adapter = new TestAdapter({ enabled: true, timeout: 5000 });
    expect(adapter.config.enabled).toBe(true);
    expect(adapter.config.timeout).toBe(5000);
    expect(adapter.config.retries).toBe(3);
  });

  it('should retry on failure', async () => {
    const adapter = new TestAdapter({ retries: 2 });
    let attempts = 0;
    
    await adapter['withRetry'](async () => {
      attempts++;
      if (attempts < 2) throw new Error('fail');
      return 'success';
    });
    
    expect(attempts).toBe(2);
  });
});

describe('TraeAdapter', () => {
  it('should be disabled by default', () => {
    const adapter = new TraeAdapter();
    expect(adapter.config.enabled).toBe(false);
  });

  it('should return disabled error when not enabled', async () => {
    const adapter = new TraeAdapter();
    const result = await adapter.execute('test prompt');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Adapter is disabled');
  });
});
```

## 执行指令

请按照上述要求实现 TRAE Adapter 基础架构，创建必要的目录结构和文件，确保接口定义清晰、可扩展。
