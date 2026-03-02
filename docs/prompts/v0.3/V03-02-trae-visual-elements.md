# V03-02：TRAE 视觉元素识别

## 任务目标

实现 TRAE 视觉元素识别功能，使用 Nut.js 激活 TRAE 窗口，并基于图像模板识别关键 UI 元素。

## 上下文

依赖：
- V03-01 TRAE Adapter 基础架构
- `@nut-tree/nut-js`
- `@nut-tree/template-matcher`

参考：
- `src/adapters/trae/index.ts` - TRAE Adapter 入口
- `src/adapters/trae/types.ts` - 类型定义

## 产物清单

```
src/
└── adapters/
    └── trae/
        ├── visual-elements.ts    # 视觉元素定义
        ├── screen-finder.ts      # 屏幕查找策略
        └── app-manager.ts        # 应用窗口管理
tests/
└── adapters/
    └── trae/
        ├── visual-elements.test.ts
        └── screen-finder.test.ts
```

## 功能要求

### 1. 视觉元素定义 (src/adapters/trae/visual-elements.ts)

```typescript
import { VisualElement } from './types';

export const TRAE_VISUAL_ELEMENTS: Record<string, VisualElement> = {
  newTaskButton: {
    id: 'newTaskButton',
    imageTemplate: 'new-task-btn.png', // templates/trae/new-task-btn.png
    description: '新建任务按钮 (+)',
    role: 'button',
  },

  chatInputArea: {
    id: 'chatInputArea',
    imageTemplate: 'chat-input-empty.png',
    description: '聊天输入框',
    role: 'input',
  },

  submitButton: {
    id: 'submitButton',
    imageTemplate: 'submit-btn.png',
    description: '提交按钮',
    role: 'button',
  },

  taskCompleteIndicator: {
    id: 'taskCompleteIndicator',
    imageTemplate: 'task-done.png',
    description: '任务完成图标',
    role: 'indicator',
  },
  
  // 辅助定位点
  traeLogo: {
    id: 'traeLogo',
    imageTemplate: 'trae-logo.png',
    description: 'TRAE Logo (用于确认窗口)',
    role: 'indicator',
  },
};

export type VisualElementKey = keyof typeof TRAE_VISUAL_ELEMENTS;
```

### 2. 屏幕查找策略 (src/adapters/trae/screen-finder.ts)

```typescript
import { Region, Point } from '@nut-tree/nut-js';
import { VisualElementKey, TRAE_VISUAL_ELEMENTS } from './visual-elements';
import { TraeConfig } from './config';

export interface FindElementResult {
  found: boolean;
  region?: Region;
  center?: Point;
  confidence?: number;
  error?: string;
}

export class ScreenFinder {
  private nutjs: any;
  private config: TraeConfig;

  constructor(nutjs: any, config: TraeConfig) {
    this.nutjs = nutjs;
    this.config = config;
  }

  async findElement(key: VisualElementKey): Promise<FindElementResult> {
    const element = TRAE_VISUAL_ELEMENTS[key];
    if (!element) {
      return { found: false, error: `Unknown element: ${key}` };
    }

    const templatePath = `${this.config.templateDir}/${element.imageTemplate}`;

    try {
      // 使用 Nut.js 的 screen.find
      const region = await this.nutjs.screen.find(
        this.nutjs.imageResource(templatePath),
        { confidence: this.config.confidence }
      );

      const center = await this.nutjs.centerOf(region);

      return {
        found: true,
        region,
        center,
      };
    } catch (error) {
      return {
        found: false,
        error: `Element not found: ${key} (${(error as Error).message})`,
      };
    }
  }

  async waitForElement(key: VisualElementKey, timeoutMs: number = 5000): Promise<FindElementResult> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.findElement(key);
      if (result.found) {
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return { found: false, error: `Timeout waiting for element: ${key}` };
  }
}
```

### 3. 应用窗口管理 (src/adapters/trae/app-manager.ts)

```typescript
// 注意：Nut.js 的 window 模块是付费插件，或者是实验性的。
// 为了保持开源/免费，我们可能需要使用快捷键 (Cmd+Tab) 或 Spotlight 来激活应用。
// 或者简单地假设用户已经把 TRAE 放在前台。
// 
// 这里我们实现一个基于 Spotlight/快捷键的简单激活策略。

export class AppManager {
  private nutjs: any;
  private appName: string;

  constructor(nutjs: any, appName: string) {
    this.nutjs = nutjs;
    this.appName = appName;
  }

  async activateApp(): Promise<boolean> {
    const { keyboard, Key } = this.nutjs;
    const isMac = process.platform === 'darwin';

    try {
      if (isMac) {
        // macOS: Cmd + Space -> 输入 Trae -> Enter
        await keyboard.pressKey(Key.LeftCmd, Key.Space);
        await keyboard.releaseKey(Key.LeftCmd, Key.Space);
        await new Promise(r => setTimeout(r, 500));
        
        await keyboard.type(this.appName);
        await new Promise(r => setTimeout(r, 500));
        
        await keyboard.pressKey(Key.Enter);
        await keyboard.releaseKey(Key.Enter);
      } else {
        // Windows: Win -> 输入 Trae -> Enter
        await keyboard.pressKey(Key.LeftSuper);
        await keyboard.releaseKey(Key.LeftSuper);
        await new Promise(r => setTimeout(r, 500));
        
        await keyboard.type(this.appName);
        await new Promise(r => setTimeout(r, 500));
        
        await keyboard.pressKey(Key.Enter);
        await keyboard.releaseKey(Key.Enter);
      }
      
      // 等待窗口激活动画
      await new Promise(r => setTimeout(r, 2000));
      return true;
    } catch (error) {
      console.error('Failed to activate app:', error);
      return false;
    }
  }
}
```

### 4. 更新 TraeAdapter (src/adapters/trae/index.ts)

```typescript
import { BaseAdapter, AdapterResult, ExecuteOptions, AdapterType } from '../base';
import { TraeConfig, DEFAULT_TRAE_CONFIG } from './config';
import { ScreenFinder } from './screen-finder';
import { AppManager } from './app-manager';

export class TraeAdapter extends BaseAdapter {
  // ... 现有属性 ...
  private _screenFinder: ScreenFinder | null = null;
  private _appManager: AppManager | null = null;

  async initialize(): Promise<void> {
    // ... Nut.js 加载逻辑 ...

    this._screenFinder = new ScreenFinder(this._nutjs, this._traeConfig);
    this._appManager = new AppManager(this._nutjs, this._traeConfig.appName);
    
    // 激活窗口
    await this._appManager.activateApp();
    
    // 简单校验：查找 Logo 或某个特征
    // const check = await this._screenFinder.findElement('traeLogo');
    // if (!check.found) {
    //   console.warn('Trae window not detected visually, but continuing...');
    // }
  }

  getScreenFinder(): ScreenFinder | null {
    return this._screenFinder;
  }
}
```

## 实现要点

1. **模板图准备**
   - 需要截取 TRAE 默认主题下的关键 UI 元素，保存为 PNG
   - 存放在 `templates/trae/` 目录
   - 需提供默认模板，但也允许用户自定义

2. **激活策略**
   - Spotlight/Search 是最通用的激活方式
   - 避免使用复杂的 Window API，以减少依赖

3. **置信度调整**
   - `confidence` 默认 0.8，允许微小的像素差异

## 验收标准

1. 能通过 Spotlight/WinKey 激活 TRAE 窗口
2. 能基于模板图找到屏幕上的元素
3. 找不到元素时返回明确错误
4. 单元测试（Mock Screen.find）通过

## 执行指令

请按照上述要求实现 TRAE 视觉元素识别功能。
