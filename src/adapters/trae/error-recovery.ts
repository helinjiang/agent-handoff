import { DiagnosticsCollector } from './diagnostics';

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

export interface RecoveryOptions {
  maxRetries: number;
  retryDelay: number;
  fallbackToAssisted: boolean;
  saveDiagnostics: boolean;
  diagnosticsDir?: string;
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
        result.diagnosticsPath = await this.diagnostics.save({
          error: autoError,
          outputDir: this.options.diagnosticsDir,
        });
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
        await new Promise((r) => setTimeout(r, this.options.retryDelay * attempt));
      }
    }

    result.finalError = result.finalError ?? autoError;
    result.fallbackUsed = this.options.fallbackToAssisted;

    if (this.options.saveDiagnostics) {
      result.diagnosticsPath = await this.diagnostics.save({
        error: result.finalError,
        outputDir: this.options.diagnosticsDir,
      });
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
    await new Promise((r) => setTimeout(r, 1000));
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
    await new Promise((r) => setTimeout(r, 1000));
    return true;
  }
}

