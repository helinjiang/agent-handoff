import { describe, expect, it } from 'vitest';
import { AdapterResult, AdapterType, BaseAdapter } from '../../src/adapters/base';

class TestAdapter extends BaseAdapter {
  readonly type: AdapterType = 'manual';
  constructor() {
    super('manual', { enabled: true, retries: 2, timeout: 1234 });
  }
  async initialize(): Promise<void> {}
  async isReady(): Promise<boolean> {
    return true;
  }
  async execute(): Promise<AdapterResult> {
    return { success: true, duration: 0 };
  }
  async cleanup(): Promise<void> {}
  protected delay(): Promise<void> {
    return Promise.resolve();
  }
  async runWithRetry<T>(op: () => Promise<T>): Promise<T> {
    return this.withRetry(op);
  }
}

describe('BaseAdapter', () => {
  it('should initialize config defaults', () => {
    const adapter = new TestAdapter();
    expect(adapter.config.type).toBe('manual');
    expect(adapter.config.enabled).toBe(true);
    expect(adapter.config.retries).toBe(2);
    expect(adapter.config.timeout).toBe(1234);
  });

  it('should retry operation until success', async () => {
    const adapter = new TestAdapter();
    let attempts = 0;
    const result = await adapter.runWithRetry(async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error('fail');
      }
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('should throw after retries exhausted', async () => {
    const adapter = new TestAdapter();
    let attempts = 0;
    await expect(
      adapter.runWithRetry(async () => {
        attempts += 1;
        throw new Error(`fail-${attempts}`);
      })
    ).rejects.toThrow('fail-3');
  });
});

