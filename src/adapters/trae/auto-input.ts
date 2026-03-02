import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ScreenFinder } from './screen-finder';
import { OperationLogger } from './operation-logger';
import { TraeOperation } from './types';

const execFileAsync = promisify(execFile);

export interface AutoInputOptions {
  prompt: string;
  timeout?: number;
  screenshot?: boolean;
  screenshotDir?: string;
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
      const openResult = await this.openNewTask();
      if (!openResult.success) {
        const clickResult = await this.clickNewTaskVisual();
        if (!clickResult.success) {
          throw new Error('Failed to open new task via shortcut or visual click');
        }
        operations.push(clickResult.operation);
        this.logger.logOperation(clickResult.operation);
      } else {
        operations.push(openResult.operation);
        this.logger.logOperation(openResult.operation);
      }

      const inputResult = await this.inputPrompt(options.prompt);
      if (!inputResult.success) {
        throw new Error(`Input failed: ${inputResult.error}`);
      }
      operations.push(inputResult.operation);
      this.logger.logOperation(inputResult.operation);

      const submitResult = await this.submitTask();
      if (!submitResult.success) {
        throw new Error(`Submit failed: ${submitResult.error}`);
      }
      operations.push(submitResult.operation);
      this.logger.logOperation(submitResult.operation);

      if (options.screenshot) {
        const p = await this.takeScreenshot(options.screenshotDir);
        if (p) {
          screenshots.push(p);
          this.logger.logOperation({ type: 'screenshot', value: p, timestamp: Date.now() });
          this.logger.logScreenshot(p);
        }
      }

      return { success: true, operations, screenshots };
    } catch (error) {
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

    try {
      await keyboard.pressKey(modifier, Key.L);
      await keyboard.releaseKey(modifier, Key.L);
      await new Promise(r => setTimeout(r, 500));
      return {
        success: true,
        operation: { type: 'hotkey', value: isMac ? 'Cmd+L' : 'Ctrl+L', timestamp: Date.now() },
      };
    } catch {
      return { success: false, operation: { type: 'hotkey', timestamp: Date.now() } };
    }
  }

  private async clickNewTaskVisual(): Promise<{ success: boolean; operation: TraeOperation }> {
    const { mouse, Button } = this.nutjs;
    const result = await this.finder.findElement('newTaskButton');
    if (result.found && result.center) {
      await mouse.setPosition(result.center);
      await mouse.click(Button.LEFT);
      await new Promise(r => setTimeout(r, 500));
      return {
        success: true,
        operation: { type: 'click', target: 'newTaskButton', timestamp: Date.now() },
      };
    }
    return { success: false, operation: { type: 'click', timestamp: Date.now() } };
  }

  private async inputPrompt(
    prompt: string
  ): Promise<{ success: boolean; error?: string; operation: TraeOperation }> {
    const { keyboard, Key } = this.nutjs;

    try {
      const isMac = process.platform === 'darwin';
      const modifier = isMac ? Key.LeftCmd : Key.LeftControl;

      const focus = await this.finder.findElement('chatInputArea');
      if (focus.found && focus.center) {
        const { mouse, Button } = this.nutjs;
        await mouse.setPosition(focus.center);
        await mouse.click(Button.LEFT);
        await new Promise(r => setTimeout(r, 200));
      }

      await keyboard.pressKey(modifier, Key.A);
      await keyboard.releaseKey(modifier, Key.A);
      await keyboard.pressKey(Key.Backspace);
      await keyboard.releaseKey(Key.Backspace);

      await keyboard.type(prompt);

      return {
        success: true,
        operation: { type: 'type', value: prompt, timestamp: Date.now() },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        operation: { type: 'type', timestamp: Date.now() },
      };
    }
  }

  private async submitTask(): Promise<{ success: boolean; error?: string; operation: TraeOperation }> {
    const { keyboard, Key } = this.nutjs;
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? Key.LeftCmd : Key.LeftControl;

    try {
      try {
        await keyboard.pressKey(modifier, Key.Enter);
        await keyboard.releaseKey(modifier, Key.Enter);
      } catch {
        await keyboard.pressKey(Key.Enter);
        await keyboard.releaseKey(Key.Enter);
      }

      return {
        success: true,
        operation: { type: 'hotkey', value: isMac ? 'Cmd+Enter' : 'Ctrl+Enter', timestamp: Date.now() },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        operation: { type: 'hotkey', timestamp: Date.now() },
      };
    }
  }

  private async takeScreenshot(screenshotDir?: string): Promise<string | null> {
    if (process.platform !== 'darwin') {
      return null;
    }

    const dir = screenshotDir ? path.resolve(screenshotDir) : process.cwd();
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `trae-${Date.now()}.png`);

    try {
      await execFileAsync('screencapture', ['-x', filePath]);
      return filePath;
    } catch {
      return null;
    }
  }
}

