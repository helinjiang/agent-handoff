import { ScreenFinder } from './screen-finder';

export class TaskWaiter {
  private finder: ScreenFinder;

  constructor(finder: ScreenFinder) {
    this.finder = finder;
  }

  async waitForCompletion(timeoutMs: number = 60000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.finder.findElement('taskCompleteIndicator');
      if (result.found) {
        return true;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    return false;
  }
}

