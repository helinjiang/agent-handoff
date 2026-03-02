# V03-04：操作日志记录

## 任务目标

实现操作日志记录功能，记录自动化操作序列，支持截图保存，生成操作报告。

## 上下文

依赖：
- V03-01 TRAE Adapter 基础架构
- V03-02 TRAE 界面元素识别
- V03-03 自动输入 prompt

根据 `docs/TECH_SPEC.md` 第 8 节，v0.3 自动化模式需要：
- 记录动作日志与关键截图
- 失败可降级到辅助模式

参考：
- `src/core/events-writer.ts` - 事件写入逻辑
- `src/adapters/trae/types.ts` - TraeOperation 类型定义

## 产物清单

```
src/
└── adapters/
    └── trae/
        ├── operation-logger.ts     # 操作日志记录
        └── operation-reporter.ts   # 操作报告生成
tests/
└── adapters/
    └── trae/
        ├── operation-logger.test.ts
        └── operation-reporter.test.ts
```

## 功能要求

### 1. 操作日志记录 (src/adapters/trae/operation-logger.ts)

```typescript
import fs from 'fs/promises';
import path from 'path';
import { TraeOperation, TraeSession } from './types';

export interface OperationLogOptions {
  workspacePath: string;
  stepId: string;
  logDir?: string;
}

export class OperationLogger {
  private operations: TraeOperation[] = [];
  private screenshots: string[] = [];
  private sessionId: string;
  private startTime: string;
  private workspacePath: string;
  private stepId: string;
  private logDir: string;

  constructor(options?: OperationLogOptions) {
    this.sessionId = this.generateSessionId();
    this.startTime = new Date().toISOString();
    this.workspacePath = options?.workspacePath ?? '';
    this.stepId = options?.stepId ?? '';
    this.logDir = options?.logDir ?? 'operations';
    this.operations = [];
    this.screenshots = [];
  }

  async log(type: TraeOperation['type'], target: string, value?: string): Promise<void> {
    const operation: TraeOperation = {
      type,
      target,
      value,
      timestamp: Date.now(),
    };

    this.operations.push(operation);
  }

  async logScreenshot(path: string): Promise<void> {
    this.screenshots.push(path);
  }

  getSession(): TraeSession {
    return {
      id: this.sessionId,
      startedAt: this.startTime,
      workspacePath: this.workspacePath,
      stepId: this.stepId,
      operations: [...this.operations],
      screenshots: [...this.screenshots],
    };
  }

  getOperations(): TraeOperation[] {
    return [...this.operations];
  }

  getScreenshots(): string[] {
    return [...this.screenshots];
  }

  async saveToFile(): Promise<string> {
    if (!this.workspacePath) {
      throw new Error('Workspace path not set');
    }

    const logPath = path.join(this.workspacePath, this.logDir);
    await fs.mkdir(logPath, { recursive: true });

    const filename = `operations-${this.sessionId}.jsonl`;
    const filePath = path.join(logPath, filename);

    const session = this.getSession();
    await fs.appendFile(filePath, JSON.stringify(session) + '\n', 'utf-8');

    return filePath;
  }

  async appendToEventsJsonl(): Promise<void> {
    if (!this.workspacePath) {
      return;
    }

    const eventsPath = path.join(this.workspacePath, 'events.jsonl');
    const session = this.getSession();

    const event = {
      ts: new Date().toISOString(),
      step: { index: 0, id: this.stepId },
      type: 'automation.session',
      summary: `Automation session completed with ${this.operations.length} operations`,
      data: {
        sessionId: this.sessionId,
        operations: this.operations.length,
        screenshots: this.screenshots.length,
      },
    };

    await fs.appendFile(eventsPath, JSON.stringify(event) + '\n', 'utf-8');
  }

  clear(): void {
    this.operations = [];
    this.screenshots = [];
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
```

### 2. 操作报告生成 (src/adapters/trae/operation-reporter.ts)

```typescript
import { TraeSession, TraeOperation } from './types';
import fs from 'fs/promises';
import path from 'path';

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
      `# Automation Session Report`,
      '',
      `**Session ID:** ${this.session.id}`,
      `**Started At:** ${this.session.startedAt}`,
      `**Workspace:** ${this.session.workspacePath}`,
      `**Step ID:** ${this.session.stepId}`,
      '',
      `## Operations (${this.session.operations.length})`,
      '',
    ];

    this.session.operations.forEach((op, index) => {
      lines.push(`### ${index + 1}. ${op.type}`);
      lines.push(`- **Target:** ${op.target}`);
      if (op.value) {
        lines.push(`- **Value:** ${op.value.substring(0, 100)}${op.value.length > 100 ? '...' : ''}`);
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
    const operationsHtml = this.session.operations.map((op, index) => `
      <div class="operation">
        <h3>${index + 1}. ${op.type}</h3>
        <p><strong>Target:</strong> ${op.target}</p>
        ${op.value ? `<p><strong>Value:</strong> ${op.value.substring(0, 100)}${op.value.length > 100 ? '...' : ''}</p>` : ''}
        <p><strong>Timestamp:</strong> ${new Date(op.timestamp).toISOString()}</p>
      </div>
    `).join('');

    const screenshotsHtml = includeScreenshots && this.session.screenshots.length > 0
      ? `
        <h2>Screenshots (${this.session.screenshots.length})</h2>
        ${this.session.screenshots.map((s, i) => `
          <div class="screenshot">
            <h3>Screenshot ${i + 1}</h3>
            <img src="${s}" alt="Screenshot ${i + 1}" />
          </div>
        `).join('')}
      `
      : '';

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
```

### 3. 更新类型定义 (src/adapters/trae/types.ts)

```typescript
export interface TraeUIElement {
  selector: string;
  alternativeSelectors: string[];
  description: string;
  waitStrategy: 'visible' | 'attached' | 'hidden';
}

export interface TraeOperation {
  type: 'click' | 'type' | 'hotkey' | 'wait' | 'screenshot' | 'activate';
  target?: string;
  value?: string;
  modifiers?: string[];
  timestamp: number;
}

export interface TraeSession {
  id: string;
  startedAt: string;
  workspacePath: string;
  stepId: string;
  operations: TraeOperation[];
  screenshots: string[];
  completedAt?: string;
  status?: 'success' | 'failed' | 'partial';
  error?: string;
}
```

## 日志格式

### operations.jsonl

每行一个 session 记录：

```json
{"id":"session-1677123456789-abc123","startedAt":"2026-03-02T10:30:00+08:00","workspacePath":"examples/workspaces/demo-login","stepId":"03-login-implement","operations":[{"type":"click","target":"newTaskButton","timestamp":1677123456800},{"type":"fill","target":"taskInputArea","value":"# 任务：实现登录功能...","timestamp":1677123457300},{"type":"click","target":"submitButton","timestamp":1677123458500}],"screenshots":["screenshots/step-03-1.png"]}
```

### events.jsonl 集成

```json
{"ts":"2026-03-02T10:35:00+08:00","step":{"index":3,"id":"login-implement"},"type":"automation.session","summary":"Automation session completed with 3 operations","data":{"sessionId":"session-1677123456789-abc123","operations":3,"screenshots":1}}
```

## CLI 集成

### 新增 report 命令

```typescript
import { Command } from 'commander';
import { OperationReporter } from '../../adapters/trae/operation-reporter';
import fs from 'fs/promises';
import path from 'path';

export const reportCommand = new Command('report')
  .description('生成自动化操作报告')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('-f, --format <format>', '报告格式: json, markdown, html', 'markdown')
  .option('-s, --session <id>', '指定 session ID')
  .option('--screenshots', '包含截图', false)
  .option('-o, --output <path>', '输出路径')
  .action(async (workspace: string, options: ReportOptions) => {
    const logDir = path.join(workspace, 'operations');
    
    let sessionFile: string;
    if (options.session) {
      sessionFile = path.join(logDir, `operations-${options.session}.jsonl`);
    } else {
      const files = await fs.readdir(logDir);
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl')).sort().reverse();
      if (jsonlFiles.length === 0) {
        console.log('❌ No operation logs found');
        return;
      }
      sessionFile = path.join(logDir, jsonlFiles[0]);
    }

    const content = await fs.readFile(sessionFile, 'utf-8');
    const session = JSON.parse(content.trim());

    const reporter = new OperationReporter(session);
    const report = reporter.generate({
      format: options.format as 'json' | 'markdown' | 'html',
      includeScreenshots: options.screenshots,
    });

    if (options.output) {
      await fs.writeFile(options.output, report, 'utf-8');
      console.log(`✅ Report saved to: ${options.output}`);
    } else {
      console.log(report);
    }
  });
```

## 命令行为

```bash
# 查看最新操作报告
agent-handoff report examples/workspaces/demo-login
# 输出:
# # Automation Session Report
# **Session ID:** session-1677123456789-abc123
# ...

# 指定格式
agent-handoff report --format html --output report.html
# 输出: ✅ Report saved to: report.html

# 包含截图
agent-handoff report --format markdown --screenshots
# 输出包含截图链接的 markdown 报告

# 指定 session
agent-handoff report --session session-1677123456789-abc123
```

## 实现要点

1. **追加式日志**
   - 使用 JSON Lines 格式
   - 每行一个完整 session

2. **会话管理**
   - 每个 session 有唯一 ID
   - 记录开始时间、操作序列、截图

3. **报告格式**
   - JSON：机器可读
   - Markdown：文档友好
   - HTML：可视化展示

4. **与 events.jsonl 集成**
   - 自动追加 automation.session 事件
   - 便于时间线展示

## 验收标准

1. 能记录所有自动化操作
2. 能保存操作日志到文件
3. 能生成多种格式报告
4. 能集成到 events.jsonl
5. 单元测试覆盖

## 测试用例

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { OperationLogger } from '../../../src/adapters/trae/operation-logger';
import { OperationReporter } from '../../../src/adapters/trae/operation-reporter';

describe('OperationLogger', () => {
  const testDir = path.join(process.cwd(), 'test-operation-logger');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  it('should log operations', async () => {
    const logger = new OperationLogger({
      workspacePath: testDir,
      stepId: 'test-step',
    });

    await logger.log('click', 'newTaskButton');
    await logger.log('fill', 'taskInputArea', 'test prompt');

    const operations = logger.getOperations();
    expect(operations).toHaveLength(2);
    expect(operations[0].type).toBe('click');
    expect(operations[1].value).toBe('test prompt');
  });

  it('should save to file', async () => {
    const logger = new OperationLogger({
      workspacePath: testDir,
      stepId: 'test-step',
    });

    await logger.log('click', 'button');
    const filePath = await logger.saveToFile();

    const content = await fs.readFile(filePath, 'utf-8');
    const session = JSON.parse(content.trim());
    expect(session.operations).toHaveLength(1);
  });

  it('should generate session info', () => {
    const logger = new OperationLogger({
      workspacePath: testDir,
      stepId: 'test-step',
    });

    const session = logger.getSession();
    expect(session.id).toBeDefined();
    expect(session.stepId).toBe('test-step');
  });
});

describe('OperationReporter', () => {
  const mockSession: TraeSession = {
    id: 'test-session',
    startedAt: '2026-03-02T10:00:00+08:00',
    workspacePath: '/test',
    stepId: 'test-step',
    operations: [
      { type: 'click', target: 'button', timestamp: 1677123456000 },
      { type: 'fill', target: 'input', value: 'test', timestamp: 1677123457000 },
    ],
    screenshots: [],
  };

  it('should generate json report', () => {
    const reporter = new OperationReporter(mockSession);
    const report = reporter.generate({ format: 'json', includeScreenshots: false });
    const parsed = JSON.parse(report);
    expect(parsed.id).toBe('test-session');
  });

  it('should generate markdown report', () => {
    const reporter = new OperationReporter(mockSession);
    const report = reporter.generate({ format: 'markdown', includeScreenshots: false });
    expect(report).toContain('# Automation Session Report');
    expect(report).toContain('click');
  });

  it('should generate html report', () => {
    const reporter = new OperationReporter(mockSession);
    const report = reporter.generate({ format: 'html', includeScreenshots: false });
    expect(report).toContain('<!DOCTYPE html>');
    expect(report).toContain('test-session');
  });
});
```

## 执行指令

请按照上述要求实现操作日志记录功能，支持多种报告格式，并集成到 CLI 中。
