import fs from 'fs/promises';
import { TraeSession } from './types';

export interface ReportOptions {
  format: 'json' | 'markdown' | 'html';
  includeScreenshots: boolean;
}

export class OperationReporter {
  private session: TraeSession;

  constructor(session: TraeSession) {
    this.session = session;
  }

  generate(options: ReportOptions): string {
    switch (options.format) {
      case 'json':
        return this.generateJson();
      case 'markdown':
        return this.generateMarkdown(options.includeScreenshots);
      case 'html':
        return this.generateHtml(options.includeScreenshots);
      default:
        return this.generateMarkdown(options.includeScreenshots);
    }
  }

  private generateJson(): string {
    return JSON.stringify(this.session, null, 2);
  }

  private generateMarkdown(includeScreenshots: boolean): string {
    const lines: string[] = [
      '# Automation Session Report',
      '',
      `**Session ID:** ${this.session.id}`,
      `**Started At:** ${this.session.startedAt}`,
      `**Workspace:** ${this.session.workspacePath}`,
      `**Step ID:** ${this.session.stepId}`,
      ...(this.session.status ? [`**Status:** ${this.session.status}`] : []),
      ...(this.session.error ? [`**Error:** ${this.session.error}`] : []),
      '',
      `## Operations (${this.session.operations.length})`,
      '',
    ];

    this.session.operations.forEach((op, index) => {
      lines.push(`### ${index + 1}. ${op.type}`);
      if (op.target) {
        lines.push(`- **Target:** ${op.target}`);
      }
      if (op.value) {
        lines.push(
          `- **Value:** ${op.value.substring(0, 100)}${op.value.length > 100 ? '...' : ''}`
        );
      }
      lines.push(`- **Timestamp:** ${new Date(op.timestamp).toISOString()}`);
      lines.push('');
    });

    if (includeScreenshots && this.session.screenshots.length > 0) {
      lines.push(`## Screenshots (${this.session.screenshots.length})`);
      lines.push('');
      this.session.screenshots.forEach((screenshot, index) => {
        lines.push(`### Screenshot ${index + 1}`);
        lines.push(`![Screenshot ${index + 1}](${screenshot})`);
        lines.push('');
      });
    }

    return lines.join('\n');
  }

  private generateHtml(includeScreenshots: boolean): string {
    const operationsHtml = this.session.operations
      .map(
        (op, index) => `
      <div class="operation">
        <h3>${index + 1}. ${op.type}</h3>
        ${op.target ? `<p><strong>Target:</strong> ${op.target}</p>` : ''}
        ${
          op.value
            ? `<p><strong>Value:</strong> ${op.value.substring(0, 100)}${
                op.value.length > 100 ? '...' : ''
              }</p>`
            : ''
        }
        <p><strong>Timestamp:</strong> ${new Date(op.timestamp).toISOString()}</p>
      </div>
    `
      )
      .join('');

    const screenshotsHtml =
      includeScreenshots && this.session.screenshots.length > 0
        ? `
        <h2>Screenshots (${this.session.screenshots.length})</h2>
        ${this.session.screenshots
          .map(
            (s, i) => `
          <div class="screenshot">
            <h3>Screenshot ${i + 1}</h3>
            <img src="${s}" alt="Screenshot ${i + 1}" />
          </div>
        `
          )
          .join('')}
      `
        : '';

    const statusLine = this.session.status
      ? `<p><strong>Status:</strong> ${this.session.status}</p>`
      : '';
    const errorLine = this.session.error ? `<p><strong>Error:</strong> ${this.session.error}</p>` : '';

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Automation Session Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .operation {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .screenshot img {
      max-width: 100%;
      border-radius: 8px;
    }
    h1 { color: #333; }
    h2 { color: #555; border-bottom: 1px solid #eee; padding-bottom: 10px; }
    h3 { color: #666; margin: 0 0 10px 0; }
    p { margin: 5px 0; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Automation Session Report</h1>
    <p><strong>Session ID:</strong> ${this.session.id}</p>
    <p><strong>Started At:</strong> ${this.session.startedAt}</p>
    <p><strong>Workspace:</strong> ${this.session.workspacePath}</p>
    <p><strong>Step ID:</strong> ${this.session.stepId}</p>
    ${statusLine}
    ${errorLine}
  </div>

  <h2>Operations (${this.session.operations.length})</h2>
  ${operationsHtml}

  ${screenshotsHtml}
</body>
</html>
    `.trim();
  }

  async saveToFile(outputPath: string, options: ReportOptions): Promise<string> {
    const content = this.generate(options);
    await fs.writeFile(outputPath, content, 'utf-8');
    return outputPath;
  }
}

