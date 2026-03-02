import path from 'path';
import { AdapterResult, AdapterType, BaseAdapter, ExecuteOptions } from '../base';
import { DEFAULT_TRAE_CONFIG, TraeConfig } from './config';
import { AppManager } from './app-manager';
import { ScreenFinder } from './screen-finder';
import { AutoInput } from './auto-input';
import { OperationLogger } from './operation-logger';
import { TaskWaiter } from './task-waiter';

type NutJsModule = {
  mouse: unknown;
  keyboard: { config?: { autoDelayMs?: number } };
  screen: { config?: { confidence?: number } };
  imageResource: (path: string) => unknown;
  centerOf?: (region: unknown) => unknown;
};

type NutJsImporter = () => Promise<NutJsModule>;

const defaultNutJsImporter: NutJsImporter = async () => {
  const mod = (await import('@nut-tree/nut-js')) as unknown as NutJsModule;
  return mod;
};

export class TraeAdapter extends BaseAdapter {
  readonly type: AdapterType = 'trae';
  private _traeConfig: TraeConfig;
  private _nutjs: NutJsModule | null = null;
  private _importNutJs: NutJsImporter;
  private _screenFinder: ScreenFinder | null = null;
  private _appManager: AppManager | null = null;
  private _taskWaiter: TaskWaiter | null = null;

  constructor(config: Partial<TraeConfig> = {}, nutJsImporter: NutJsImporter = defaultNutJsImporter) {
    super('trae', {
      enabled: config.enabled ?? DEFAULT_TRAE_CONFIG.enabled,
      timeout: config.timeout ?? DEFAULT_TRAE_CONFIG.timeout,
      retries: config.retries ?? DEFAULT_TRAE_CONFIG.retries,
    });
    this._traeConfig = { ...DEFAULT_TRAE_CONFIG, ...config };
    this._importNutJs = nutJsImporter;
  }

  async initialize(): Promise<void> {
    if (!this._config.enabled) {
      return;
    }

    try {
      this._nutjs = await this._importNutJs();
      if (this._nutjs.screen?.config) {
        this._nutjs.screen.config.confidence = this._traeConfig.confidence;
      }
      if (this._nutjs.keyboard?.config) {
        this._nutjs.keyboard.config.autoDelayMs = this._traeConfig.typingDelay;
      }
      this._screenFinder = new ScreenFinder(this._nutjs, this._traeConfig);
      this._appManager = new AppManager(this._nutjs, this._traeConfig.appName);
      await this._appManager.activateApp();
      this._initialized = true;
    } catch (error) {
      throw new Error(`Failed to load Nut.js: ${(error as Error).message}`);
    }
  }

  async isReady(): Promise<boolean> {
    return this._initialized && this._nutjs !== null;
  }

  getScreenFinder(): ScreenFinder | null {
    return this._screenFinder;
  }

  getAppManager(): AppManager | null {
    return this._appManager;
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

    if (!(await this.isReady())) {
      return {
        success: false,
        error: 'Adapter not initialized',
        duration: Date.now() - startTime,
      };
    }

    if (!this._screenFinder || !this._nutjs) {
      return {
        success: false,
        error: 'ScreenFinder not available',
        duration: Date.now() - startTime,
      };
    }

    const operationLogger = new OperationLogger({
      workspacePath: options?.workspacePath ?? '',
      stepId: options?.stepId ?? '',
    });

    const screenshotEnabled = options?.screenshot ?? this._traeConfig.screenshot;
    const screenshotDir = options?.workspacePath
      ? path.join(options.workspacePath, this._traeConfig.screenshotDir)
      : undefined;

    const autoInput = new AutoInput(this._nutjs, this._screenFinder, operationLogger);
    const result = await autoInput.execute({
      prompt,
      timeout: options?.timeout ?? this._traeConfig.timeout,
      screenshot: screenshotEnabled,
      screenshotDir,
    });

    if (result.success && options?.wait) {
      if (!this._taskWaiter) {
        this._taskWaiter = new TaskWaiter(this._screenFinder);
      }
      await this._taskWaiter.waitForCompletion(options?.waitTimeoutMs);
    }

    operationLogger.markCompleted(result.success ? 'success' : 'failed', result.error);
    if (options?.workspacePath) {
      try {
        await operationLogger.saveToFile();
        await operationLogger.appendToEventsJsonl();
      } catch {
        operationLogger.clear();
      }
    }

    return {
      success: result.success,
      error: result.error,
      screenshot: result.screenshots[0],
      duration: Date.now() - startTime,
    };
  }

  async cleanup(): Promise<void> {
    this._nutjs = null;
    this._screenFinder = null;
    this._appManager = null;
    this._taskWaiter = null;
    this._initialized = false;
  }
}
