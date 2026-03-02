import { copyToClipboard } from '../../core/clipboard.js';
import { AutomationError } from './error-recovery';

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
      const r = await copyToClipboard(prompt);
      promptCopied = r.success;
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

