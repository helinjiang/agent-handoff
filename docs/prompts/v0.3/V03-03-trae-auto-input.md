# V03-03：自动输入 prompt

## 任务目标

实现自动输入 prompt 功能，完成从激活窗口、新建任务、输入 prompt、提交的完整自动化流程。

## 上下文

依赖：
- V03-01 TRAE Adapter 基础架构
- V03-02 TRAE 视觉元素识别
- `@nut-tree/nut-js`

参考：
- `src/adapters/trae/index.ts` - TRAE Adapter 入口
- `src/adapters/trae/visual-elements.ts` - 视觉元素定义
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
import { ScreenFinder } from './screen-finder';
import { TraeOperation } from './types';
import { OperationLogger } from './operation-logger';

export interface AutoInputOptions {
  prompt: string;
  timeout?: number;
  screenshot?: boolean;
}

export interface AutoInputResult {
  success: boolean;
  error?: string;
  operations: TraeOperation[];
  screenshots: string[];
}

export class AutoInput {
  private nutjs: any;
  private finder: ScreenFinder;
  private logger: OperationLogger;

  constructor(nutjs: any, finder: ScreenFinder, logger: OperationLogger) {
    this.nutjs = nutjs;
    this.finder = finder;
    this.logger = logger;
  }

  async execute(options: AutoInputOptions): Promise<AutoInputResult> {
    const operations: TraeOperation[] = [];
    const screenshots: string[] = [];

    try {
      await this.logger.log('start', 'Starting auto-input flow');

      // 1. 激活并打开新任务 (优先使用快捷键 Cmd+L/I)
      const openResult = await this.openNewTask();
      if (!openResult.success) {
        // 尝试视觉点击备选方案
        const clickResult = await this.clickNewTaskVisual();
        if (!clickResult.success) {
          throw new Error('Failed to open new task via shortcut or visual click');
        }
        operations.push(clickResult.operation);
      } else {
        operations.push(openResult.operation);
      }

      // 2. 输入 Prompt
      const inputResult = await this.inputPrompt(options.prompt);
      if (!inputResult.success) {
        throw new Error(`Input failed: ${inputResult.error}`);
      }
      operations.push(inputResult.operation);

      // 3. 提交任务 (Cmd+Enter 或 点击发送)
      const submitResult = await this.submitTask();
      if (!submitResult.success) {
        throw new Error(`Submit failed: ${submitResult.error}`);
      }
      operations.push(submitResult.operation);

      // 4. 截图 (可选)
      if (options.screenshot) {
        const path = await this.takeScreenshot();
        if (path) screenshots.push(path);
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

  private async openNewTask(): Promise<{ success: boolean; operation: TraeOperation }> {
    const { keyboard, Key } = this.nutjs;
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? Key.LeftCmd : Key.LeftControl;
    
    // 假设 TRAE 快捷键是 Cmd+L (Chat) 或 Cmd+I (Inline Chat)
    // 这里我们尝试 Cmd+L 打开侧边栏 Chat
    try {
      await keyboard.pressKey(modifier, Key.L);
      await keyboard.releaseKey(modifier, Key.L);
      await new Promise(r => setTimeout(r, 500)); // 等待面板打开

      // 再次确认焦点在输入框：Tab 一次或者直接点击输入框图像
      // 简单起见，假设 Cmd+L 会自动聚焦输入框
      
      return {
        success: true,
        operation: { type: 'hotkey', value: 'Cmd+L', timestamp: Date.now() }
      };
    } catch (e) {
      return { success: false, operation: { type: 'hotkey', timestamp: Date.now() } };
    }
  }

  private async clickNewTaskVisual(): Promise<{ success: boolean; operation: TraeOperation }> {
    const { mouse, Button } = this.nutjs;
    
    // 查找 + 号按钮
    const result = await this.finder.findElement('newTaskButton');
    if (result.found && result.center) {
      await mouse.setPosition(result.center);
      await mouse.click(Button.LEFT);
      await new Promise(r => setTimeout(r, 500));
      return {
        success: true,
        operation: { type: 'click', target: 'newTaskButton', timestamp: Date.now() }
      };
    }
    return { success: false, operation: { type: 'click', timestamp: Date.now() } };
  }

  private async inputPrompt(prompt: string): Promise<{ success: boolean; error?: string; operation: TraeOperation }> {
    const { keyboard, Key } = this.nutjs;
    
    try {
      // 确保清空输入框 (Cmd+A -> Backspace)
      const isMac = process.platform === 'darwin';
      const modifier = isMac ? Key.LeftCmd : Key.LeftControl;
      
      await keyboard.pressKey(modifier, Key.A);
      await keyboard.releaseKey(modifier, Key.A);
      await keyboard.pressKey(Key.Backspace);
      await keyboard.releaseKey(Key.Backspace);
      
      // 输入内容 (使用 clipboard 粘贴可能更快且支持特殊字符，但在某些环境下 nutjs type 更稳)
      // 这里使用 type，虽然慢一点但更原生
      await keyboard.type(prompt);
      
      return {
        success: true,
        operation: { type: 'type', value: 'prompt...', timestamp: Date.now() }
      };
    } catch (error) {
      return { success: false, error: (error as Error).message, operation: { type: 'type', timestamp: Date.now() } };
    }
  }

  private async submitTask(): Promise<{ success: boolean; error?: string; operation: TraeOperation }> {
    const { keyboard, Key } = this.nutjs;
    
    try {
      // 提交通常是 Enter 或 Cmd+Enter
      await keyboard.pressKey(Key.Enter);
      await keyboard.releaseKey(Key.Enter);
      
      return {
        success: true,
        operation: { type: 'hotkey', value: 'Enter', timestamp: Date.now() }
      };
    } catch (error) {
      return { success: false, error: (error as Error).message, operation: { type: 'hotkey', timestamp: Date.now() } };
    }
  }

  private async takeScreenshot(): Promise<string | null> {
    // Nut.js 截图功能需要集成
    try {
      const { screen, imageResource } = this.nutjs;
      const region = await screen.highlight(await screen.width(), await screen.height()); // 全屏
      // Nut.js 截图保存逻辑需查阅文档，此处简化
      return 'screenshot.png';
    } catch {
      return null;
    }
  }
}
```

### 2. 任务等待与状态检测 (src/adapters/trae/task-waiter.ts)

```typescript
import { ScreenFinder } from './screen-finder';

export class TaskWaiter {
  private finder: ScreenFinder;

  constructor(finder: ScreenFinder) {
    this.finder = finder;
  }

  async waitForCompletion(timeoutMs: number = 60000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      // 查找 "任务完成" 图标
      const result = await this.finder.findElement('taskCompleteIndicator');
      if (result.found) {
        return true;
      }
      
      // 也可以查找 "Stop" 按钮消失，或者 "Regenerate" 按钮出现
      
      await new Promise(r => setTimeout(r, 2000));
    }
    return false;
  }
}
```

### 3. 更新 TraeAdapter (src/adapters/trae/index.ts)

```typescript
// ... imports ...

export class TraeAdapter extends BaseAdapter {
  // ... 现有属性 ...
  private _autoInput: AutoInput | null = null;
  private _taskWaiter: TaskWaiter | null = null;

  async execute(prompt: string, options?: ExecuteOptions): Promise<AdapterResult> {
    // ... 初始化检查 ...

    if (!this._autoInput) {
      this._autoInput = new AutoInput(this._nutjs, this._screenFinder!, this._operationLogger!);
    }

    const result = await this._autoInput.execute({
      prompt,
      timeout: options?.timeout,
      screenshot: options?.screenshot,
    });

    if (result.success && options?.wait) {
       // 如果需要等待任务完成
       if (!this._taskWaiter) {
         this._taskWaiter = new TaskWaiter(this._screenFinder!);
       }
       await this._taskWaiter.waitForCompletion();
    }

    return {
      success: result.success,
      error: result.error,
      // ...
    };
  }
}
```

## 实现要点

1. **快捷键映射**
   - 必须处理 macOS (`Cmd`) 与 Windows (`Ctrl`) 的差异。
   - Nut.js 的 `Key.LeftCmd` 和 `Key.LeftControl`。

2. **输入延迟**
   - 为了模拟真实用户并避免输入丢失，设置 `keyboard.config.autoDelayMs`。

3. **焦点管理**
   - 在执行任何键盘操作前，必须确保 TRAE 窗口处于前台且获得焦点（通过 `AppManager`）。

## 验收标准

1. 能通过快捷键打开 TRAE 的聊天/任务面板
2. 能正确输入 prompt
3. 能提交任务
4. 单元测试（Mock Nut.js）通过

## 执行指令

请按照上述要求实现自动输入 prompt 功能。
