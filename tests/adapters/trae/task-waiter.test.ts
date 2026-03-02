import { describe, expect, it, vi } from 'vitest';
import { TaskWaiter } from '../../../src/adapters/trae/task-waiter';

describe('TaskWaiter', () => {
  it('should resolve true when completion indicator appears', async () => {
    vi.useFakeTimers();
    const finder: any = {
      findElement: vi
        .fn()
        .mockResolvedValueOnce({ found: false })
        .mockResolvedValueOnce({ found: false })
        .mockResolvedValueOnce({ found: true }),
    };
    const waiter = new TaskWaiter(finder);

    const p = waiter.waitForCompletion(10000);
    await vi.advanceTimersByTimeAsync(4000);
    await expect(p).resolves.toBe(true);
    vi.useRealTimers();
  });

  it('should resolve false on timeout', async () => {
    vi.useFakeTimers();
    const finder: any = {
      findElement: vi.fn().mockResolvedValue({ found: false }),
    };
    const waiter = new TaskWaiter(finder);

    const p = waiter.waitForCompletion(3000);
    await vi.advanceTimersByTimeAsync(4000);
    await expect(p).resolves.toBe(false);
    vi.useRealTimers();
  });
});

