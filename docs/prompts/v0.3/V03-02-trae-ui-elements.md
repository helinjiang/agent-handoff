# V03-02：TRAE 界面元素识别

## 任务目标

实现 TRAE 界面元素识别功能，使用 Puppeteer 连接 TRAE 应用，识别关键 UI 元素（新建任务、输入框、提交按钮等）。

## 上下文

依赖：
- V03-01 TRAE Adapter 基础架构

根据 `docs/TECH_SPEC.md` 第 8 节，v0.3 自动化模式需要：
- 通过视觉/模板匹配实现：点击"+新任务"→输入→提交→等待✅
- 记录动作日志与关键截图
- 失败可降级到辅助模式

参考：
- `src/adapters/trae/index.ts` - TRAE Adapter 入口
- `src/adapters/trae/types.ts` - 类型定义

## 产物清单

```
src/
└── adapters/
    └── trae/
        ├── ui-elements.ts       # UI 元素定义与识别
        ├── element-finder.ts    # 元素查找策略
        └── browser-manager.ts   # 浏览器连接管理
tests/
└── adapters/
    └── trae/
        ├── ui-elements.test.ts
        └── element-finder.test.ts
```

## 功能要求

### 1. UI 元素定义 (src/adapters/trae/ui-elements.ts)

```typescript
import { TraeUIElement } from './types';

export const TRAE_UI_ELEMENTS: Record<string, TraeUIElement> = {
  newTaskButton: {
    selector: '[data-testid="new-task-button"]',
    alternativeSelectors: [
      'button:has-text("新任务")',
      'button:has-text("New Task")',
      '[aria-label="创建新任务"]',
      '.new-task-btn',
      '#new-task-btn',
    ],
    description: '新建任务按钮',
    waitStrategy: 'visible',
  },

  taskInputArea: {
    selector: '[data-testid="task-input"]',
    alternativeSelectors: [
      'textarea[placeholder*="输入"]',
      'textarea[placeholder*="prompt"]',
      '.task-input textarea',
      '[contenteditable="true"]',
    ],
    description: '任务输入区域',
    waitStrategy: 'visible',
  },

  submitButton: {
    selector: '[data-testid="submit-task"]',
    alternativeSelectors: [
      'button:has-text("提交")',
      'button:has-text("Submit")',
      'button[type="submit"]',
      '.submit-btn',
    ],
    description: '提交按钮',
    waitStrategy: 'visible',
  },

  taskCompleteIndicator: {
    selector: '[data-testid="task-complete"]',
    alternativeSelectors: [
      '.task-status:has-text("完成")',
      '.task-status:has-text("Complete")',
      '[data-status="done"]',
      '.task-done-icon',
    ],
    description: '任务完成指示器',
    waitStrategy: 'visible',
  },

  taskList: {
    selector: '[data-testid="task-list"]',
    alternativeSelectors: [
      '.task-list',
      '.tasks-container',
      '[role="list"]',
    ],
    description: '任务列表',
    waitStrategy: 'attached',
  },

  activeTask: {
    selector: '[data-testid="active-task"]',
    alternativeSelectors: [
      '.task-item.active',
      '.task-item[data-active="true"]',
      '[aria-selected="true"]',
    ],
    description: '当前活动任务',
    waitStrategy: 'visible',
  },
};

export type UIElementKey = keyof typeof TRAE_UI_ELEMENTS;
```

### 2. 元素查找策略 (src/adapters/trae/element-finder.ts)

```typescript
import { Page, ElementHandle, Locator } from 'puppeteer';
import { TraeUIElement } from './types';
import { TRAE_UI_ELEMENTS, UIElementKey } from './ui-elements';

export interface FindElementOptions {
  timeout?: number;
  retries?: number;
}

export interface FindElementResult {
  element: ElementHandle | Locator | null;
  selector: string;
  found: boolean;
}

export class ElementFinder {
  private page: Page;
  private elementCache: Map<string, ElementHandle> = new Map();

  constructor(page: Page) {
    this.page = page;
  }

  async findElement(
    key: UIElementKey,
    options: FindElementOptions = {}
  ): Promise<FindElementResult> {
    const elementDef = TRAE_UI_ELEMENTS[key];
    if (!elementDef) {
      throw new Error(`Unknown element key: ${key}`);
    }

    const timeout = options.timeout ?? 5000;

    const selectors = [elementDef.selector, ...elementDef.alternativeSelectors];

    for (const selector of selectors) {
      try {
        const element = await this.waitForElement(selector, elementDef.waitStrategy, timeout);
        if (element) {
          return { element, selector, found: true };
        }
      } catch {
        continue;
      }
    }

    return { element: null, selector: '', found: false };
  }

  private async waitForElement(
    selector: string,
    strategy: 'visible' | 'attached' | 'hidden',
    timeout: number
  ): Promise<ElementHandle | null> {
    try {
      switch (strategy) {
        case 'visible':
          await this.page.waitForSelector(selector, { visible: true, timeout });
          break;
        case 'attached':
          await this.page.waitForSelector(selector, { timeout });
          break;
        case 'hidden':
          await this.page.waitForSelector(selector, { hidden: true, timeout });
          break;
      }
      return await this.page.$(selector);
    } catch {
      return null;
    }
  }

  async findMultiple(
    keys: UIElementKey[],
    options: FindElementOptions = {}
  ): Promise<Map<UIElementKey, FindElementResult>> {
    const results = new Map<UIElementKey, FindElementResult>();

    await Promise.all(
      keys.map(async (key) => {
        const result = await this.findElement(key, options);
        results.set(key, result);
      })
    );

    return results;
  }

  async verifyUIReady(): Promise<{ ready: boolean; missing: UIElementKey[] }> {
    const essentialElements: UIElementKey[] = ['newTaskButton', 'taskInputArea'];
    const results = await this.findMultiple(essentialElements, { timeout: 3000 });

    const missing: UIElementKey[] = [];
    results.forEach((result, key) => {
      if (!result.found) {
        missing.push(key);
      }
    });

    return {
      ready: missing.length === 0,
      missing,
    };
  }

  clearCache(): void {
    this.elementCache.clear();
  }
}
```

### 3. 浏览器连接管理 (src/adapters/trae/browser-manager.ts)

```typescript
import puppeteer, { Browser, Page, ConnectOptions } from 'puppeteer';
import { TraeConfig } from './config';
import { ElementFinder } from './element-finder';

export interface BrowserConnectionResult {
  success: boolean;
  error?: string;
  page?: Page;
}

export class BrowserManager {
  private config: TraeConfig;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private elementFinder: ElementFinder | null = null;

  constructor(config: TraeConfig) {
    this.config = config;
  }

  async connect(): Promise<BrowserConnectionResult> {
    try {
      if (this.config.connectToExisting) {
        return await this.connectToExisting();
      } else {
        return await this.launchNew();
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private async connectToExisting(): Promise<BrowserConnectionResult> {
    const browserUrl = this.config.traeUrl;
    
    try {
      this.browser = await puppeteer.connect({
        browserURL: browserUrl,
        defaultViewport: null,
      } as ConnectOptions);

      const pages = await this.browser.pages();
      this.page = pages[0] || await this.browser.newPage();

      return {
        success: true,
        page: this.page,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to connect to TRAE at ${browserUrl}: ${(error as Error).message}`,
      };
    }
  }

  private async launchNew(): Promise<BrowserConnectionResult> {
    try {
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        defaultViewport: null,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      });

      this.page = await this.browser.newPage();

      await this.page.goto(this.config.traeUrl, {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout,
      });

      return {
        success: true,
        page: this.page,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to launch browser: ${(error as Error).message}`,
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.browser) {
      if (this.config.connectToExisting) {
        await this.browser.disconnect();
      } else {
        await this.browser.close();
      }
      this.browser = null;
      this.page = null;
      this.elementFinder = null;
    }
  }

  getPage(): Page | null {
    return this.page;
  }

  getElementFinder(): ElementFinder | null {
    if (!this.page) return null;
    if (!this.elementFinder) {
      this.elementFinder = new ElementFinder(this.page);
    }
    return this.elementFinder;
  }

  async takeScreenshot(path: string): Promise<void> {
    if (this.page) {
      await this.page.screenshot({ path, fullPage: false });
    }
  }

  isConnected(): boolean {
    return this.browser !== null && this.browser.connected;
  }
}
```

### 4. 更新 TraeAdapter (src/adapters/trae/index.ts)

```typescript
import { BaseAdapter, AdapterResult, ExecuteOptions, AdapterType } from '../base';
import { TraeConfig, DEFAULT_TRAE_CONFIG } from './config';
import { BrowserManager } from './browser-manager';
import { ElementFinder } from './element-finder';

export class TraeAdapter extends BaseAdapter {
  readonly type: AdapterType = 'trae';
  private _traeConfig: TraeConfig;
  private _browserManager: BrowserManager | null = null;

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

    // 执行逻辑将在 V03-03 中实现
    return {
      success: true,
      duration: Date.now() - startTime,
    };
  }

  async cleanup(): Promise<void> {
    if (this._browserManager) {
      await this._browserManager.disconnect();
      this._browserManager = null;
    }
    this._initialized = false;
  }

  getBrowserManager(): BrowserManager | null {
    return this._browserManager;
  }
}
```

## TRAE 界面元素说明

### 主要界面元素

| 元素 | 选择器 | 描述 |
|------|--------|------|
| newTaskButton | `[data-testid="new-task-button"]` | 新建任务按钮 |
| taskInputArea | `[data-testid="task-input"]` | 任务输入区域 |
| submitButton | `[data-testid="submit-task"]` | 提交按钮 |
| taskCompleteIndicator | `[data-testid="task-complete"]` | 任务完成指示器 |
| taskList | `[data-testid="task-list"]` | 任务列表 |
| activeTask | `[data-testid="active-task"]` | 当前活动任务 |

### 选择器策略

采用多层备选策略，按优先级尝试：

1. **data-testid** - 最稳定，推荐 TRAE 团队添加
2. **文本内容** - `:has-text()` 选择器
3. **aria 属性** - 无障碍属性
4. **CSS 类名** - 可能变化的类名
5. **ID** - 全局唯一标识

## 实现要点

1. **多选择器备选**
   - 主选择器优先使用 data-testid
   - 备选选择器覆盖常见变体
   - 按顺序尝试直到成功

2. **等待策略**
   - visible：元素可见
   - attached：元素存在于 DOM
   - hidden：元素隐藏

3. **连接模式**
   - connectToExisting：连接已运行的 TRAE
   - launchNew：启动新实例

4. **错误处理**
   - 元素未找到时返回详细错误
   - 连接失败时提供友好提示

## 验收标准

1. 能连接到运行中的 TRAE 应用
2. 能识别新建任务按钮
3. 能识别任务输入区域
4. 能识别提交按钮
5. UI 未就绪时返回缺失元素列表
6. 单元测试覆盖

## 测试用例

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ElementFinder } from '../../../src/adapters/trae/element-finder';
import { TRAE_UI_ELEMENTS } from '../../../src/adapters/trae/ui-elements';

describe('ui-elements', () => {
  it('should have all required elements defined', () => {
    const requiredKeys = ['newTaskButton', 'taskInputArea', 'submitButton'];
    requiredKeys.forEach(key => {
      expect(TRAE_UI_ELEMENTS[key]).toBeDefined();
      expect(TRAE_UI_ELEMENTS[key].selector).toBeTruthy();
      expect(TRAE_UI_ELEMENTS[key].alternativeSelectors.length).toBeGreaterThan(0);
    });
  });

  it('should have valid wait strategies', () => {
    Object.values(TRAE_UI_ELEMENTS).forEach(element => {
      expect(['visible', 'attached', 'hidden']).toContain(element.waitStrategy);
    });
  });
});

describe('ElementFinder', () => {
  let finder: ElementFinder;
  let mockPage: any;

  beforeEach(() => {
    mockPage = {
      waitForSelector: vi.fn().mockResolvedValue({}),
      $: vi.fn().mockResolvedValue({}),
    };
    finder = new ElementFinder(mockPage);
  });

  it('should find element with primary selector', async () => {
    const result = await finder.findElement('newTaskButton');
    expect(result.found).toBe(true);
    expect(result.selector).toBe(TRAE_UI_ELEMENTS.newTaskButton.selector);
  });

  it('should fallback to alternative selectors', async () => {
    mockPage.waitForSelector = vi.fn()
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({});

    const result = await finder.findElement('newTaskButton');
    expect(result.found).toBe(true);
  });

  it('should return not found when all selectors fail', async () => {
    mockPage.waitForSelector = vi.fn().mockRejectedValue(new Error('not found'));

    const result = await finder.findElement('newTaskButton');
    expect(result.found).toBe(false);
  });
});
```

## 调试技巧

1. **查看当前页面元素**
   ```typescript
   const page = browserManager.getPage();
   const html = await page?.content();
   console.log(html);
   ```

2. **截图调试**
   ```typescript
   await browserManager.takeScreenshot('debug.png');
   ```

3. **测试选择器**
   ```typescript
   const element = await page.$(selector);
   console.log('Found:', !!element);
   ```

## 执行指令

请按照上述要求实现 TRAE 界面元素识别功能，确保能稳定连接 TRAE 并识别关键 UI 元素。
