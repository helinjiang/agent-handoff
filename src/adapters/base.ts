export type AdapterType = 'trae' | 'shell' | 'api' | 'manual';

export interface AdapterConfig {
  type: AdapterType;
  enabled: boolean;
  timeout: number;
  retries: number;
}

export interface ExecuteOptions {
  workspacePath?: string;
  stepId?: string;
  screenshot?: boolean;
  timeout?: number;
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

export abstract class BaseAdapter implements Adapter {
  abstract readonly type: AdapterType;
  protected _config: AdapterConfig;
  protected _initialized: boolean = false;

  constructor(type: AdapterType, config: Partial<Omit<AdapterConfig, 'type'>> = {}) {
    this._config = {
      type,
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
    if (lastError) {
      throw lastError;
    }
    throw new Error('Retry failed without error');
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

