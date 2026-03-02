import fs from 'fs/promises';
import path from 'path';
import { writeEvent } from '../../core/events-writer.js';
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
  private completedAt?: string;
  private status?: 'success' | 'failed' | 'partial';
  private error?: string;

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

  async logScreenshot(filePath: string): Promise<void> {
    this.screenshots.push(filePath);
  }

  getOperations(): TraeOperation[] {
    return [...this.operations];
  }

  getScreenshots(): string[] {
    return [...this.screenshots];
  }

  getSession(): TraeSession {
    return {
      id: this.sessionId,
      startedAt: this.startTime,
      workspacePath: this.workspacePath,
      stepId: this.stepId,
      operations: [...this.operations],
      screenshots: [...this.screenshots],
      ...(this.completedAt && { completedAt: this.completedAt }),
      ...(this.status && { status: this.status }),
      ...(this.error && { error: this.error }),
    };
  }

  markCompleted(status: 'success' | 'failed' | 'partial', error?: string): void {
    this.completedAt = new Date().toISOString();
    this.status = status;
    this.error = error;
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

    await writeEvent({
      workspacePath: this.workspacePath,
      step: { index: 0, id: this.stepId },
      type: 'automation.session',
      summary: `Automation session completed with ${this.operations.length} operations`,
      data: {
        sessionId: this.sessionId,
        operations: this.operations.length,
        screenshots: this.screenshots.length,
        status: this.status,
        error: this.error,
      },
    });
  }

  clear(): void {
    this.operations = [];
    this.screenshots = [];
  }

  logOperation(operation: TraeOperation): void {
    this.operations.push(operation);
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
