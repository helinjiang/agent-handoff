import fs from 'fs/promises';
import path from 'path';
import { AutomationError } from './error-recovery';

export interface DiagnosticsData {
  timestamp: string;
  error?: {
    type: string;
    message: string;
    context?: AutomationError['context'];
  };
  env?: {
    platform: string;
    node: string;
  };
  hints?: string[];
}

export class DiagnosticsCollector {
  private data: DiagnosticsData;

  constructor() {
    this.data = { timestamp: new Date().toISOString() };
  }

  async save(input?: { error?: AutomationError; outputDir?: string; hints?: string[] }): Promise<string> {
    if (input?.error) {
      this.data.error = {
        type: input.error.type,
        message: input.error.message,
        context: input.error.context,
      };
    }

    this.data.env = {
      platform: process.platform,
      node: process.version,
    };

    if (input?.hints) {
      this.data.hints = input.hints;
    }

    const filePath = this.generatePath(input?.outputDir);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    return filePath;
  }

  private generatePath(outputDir?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseDir = outputDir ?? 'diagnostics';
    return path.join(baseDir, `diagnostics-${timestamp}.json`);
  }
}

