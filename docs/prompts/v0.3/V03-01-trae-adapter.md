# V03-01：TRAE Adapter 基础架构

## 任务目标

建立 TRAE 自动化适配器的基础架构，定义 Adapter 接口规范，实现基于 Nut.js 的 TRAE Adapter 基类。

## 上下文

鉴于 TRAE 是桌面 IDE，v0.3 采用 Nut.js 进行桌面自动化（键盘/鼠标模拟 + 屏幕视觉识别），而非基于 Web 的 Puppeteer。

依赖：
- `@nut-tree/nut-js`
- `@nut-tree/template-matcher`

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
// Nut.js imports will be dynamic to avoid load issues in non-desktop envs

export class TraeAdapter extends BaseAdapter {
  readonly type: AdapterType = 'trae';
  private _traeConfig: TraeConfig;
  private _nutjs: any = null; // 动态加载 Nut.js 实例

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
    
    // 动态加载 Nut.js，避免在服务器/CI 环境直接崩溃
    try {
      const { mouse, keyboard, screen, imageResource } = await import('@nut-tree/nut-js');
      this._nutjs = { mouse, keyboard, screen, imageResource };
      
      // 配置 Nut.js
      this._nutjs.screen.config.confidence = this._traeConfig.confidence;
      this._nutjs.keyboard.config.autoDelayMs = this._traeConfig.typingDelay;
      
      this._initialized = true;
    } catch (error) {
      throw new Error(`Failed to load Nut.js: ${(error as Error).message}`);
    }
  }

  async isReady(): Promise<boolean> {
    return this._initialized && this._nutjs !== null;
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

    // 执行逻辑将在 V03-03 中实现
    return {
      success: true,
      duration: Date.now() - startTime,
    };
  }

  async cleanup(): Promise<void> {
    this._nutjs = null;
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
  
  // Nut.js 特定配置
  confidence: number;       // 图像匹配置信度 (0-1)
  typingDelay: number;      // 打字延迟 (ms)
  templateDir: string;      // 图像模板目录
  appName: string;          // 应用名称 (用于激活窗口)
}

export const DEFAULT_TRAE_CONFIG: TraeConfig = {
  enabled: false,
  timeout: 30000,
  retries: 3,
  screenshot: false,
  screenshotDir: 'screenshots',
  
  confidence: 0.8,
  typingDelay: 10,
  templateDir: 'templates/trae',
  appName: 'Trae', // macOS: Trae, Windows: Trae.exe
};
```

### 5. TRAE 类型定义 (src/adapters/trae/types.ts)

```typescript
export interface VisualElement {
  id: string;
  imageTemplate: string; // 图像模板文件名
  description: string;
  role: 'button' | 'input' | 'indicator';
}

export interface TraeOperation {
  type: 'click' | 'type' | 'hotkey' | 'wait' | 'screenshot' | 'activate';
  target?: string;
  value?: string;
  modifiers?: string[]; // ['command', 'shift']
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
│       ├── visual-elements.ts # V03-02 (替换 ui-elements)
│       ├── auto-input.ts      # V03-03
│       ├── operation-logger.ts
│       └── error-recovery.ts
├── core/
└── cli/
```

## 实现要点

1. **动态加载**
   - `@nut-tree/nut-js` 包含原生依赖，在 CI/CD 或纯服务器环境可能无法加载
   - 使用 `import()` 动态加载，确保 CLI 在无 GUI 环境也能运行（辅助模式）

2. **跨平台兼容**
   - 快捷键差异（Command vs Control）需要处理
   - 应用激活方式在不同 OS 上可能不同

3. **配置集成**
   - 允许用户自定义 `templateDir`，以适应不同分辨率/主题

## 配置集成

更新 `src/core/config.ts`：

```typescript
export interface AgentHandoffConfig {
  // ... 现有配置 ...
  automation?: {
    enabled: boolean;
    provider: 'nutjs';
    screenshot: boolean;
    timeout: number;
    retries: number;
    confidence?: number;
  };
}
```

## 验收标准

1. Adapter 接口定义清晰
2. TraeAdapter 能动态加载 Nut.js
3. 配置项包含 Nut.js 必要参数
4. 单元测试（Mock Nut.js）通过

## 执行指令

请按照上述要求实现 TRAE Adapter 基础架构。
