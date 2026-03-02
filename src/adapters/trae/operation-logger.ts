import { TraeOperation } from './types';

export class OperationLogger {
  private operations: TraeOperation[] = [];
  private screenshots: string[] = [];

  logOperation(operation: TraeOperation): void {
    this.operations.push(operation);
  }

  logScreenshot(filePath: string): void {
    this.screenshots.push(filePath);
  }

  getOperations(): TraeOperation[] {
    return [...this.operations];
  }

  getScreenshots(): string[] {
    return [...this.screenshots];
  }

  clear(): void {
    this.operations = [];
    this.screenshots = [];
  }
}

