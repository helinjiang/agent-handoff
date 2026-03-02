import { describe, expect, it, vi } from 'vitest';
import { AutoInput } from '../../../src/adapters/trae/auto-input';
import { OperationLogger } from '../../../src/adapters/trae/operation-logger';

describe('AutoInput', () => {
  it('should open via hotkey, type prompt and submit', async () => {
    const nutjs: any = {
      keyboard: {
        pressKey: vi.fn().mockResolvedValue(undefined),
        releaseKey: vi.fn().mockResolvedValue(undefined),
        type: vi.fn().mockResolvedValue(undefined),
      },
      mouse: {
        setPosition: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
      },
      Button: { LEFT: 'LEFT' },
      Key: {
        LeftCmd: 'LeftCmd',
        LeftControl: 'LeftControl',
        L: 'L',
        A: 'A',
        Enter: 'Enter',
        Backspace: 'Backspace',
      },
      screen: {},
      imageResource: vi.fn(),
    };

    const finder: any = {
      findElement: vi.fn().mockResolvedValue({ found: false }),
    };

    const logger = new OperationLogger();
    const auto = new AutoInput(nutjs, finder, logger);
    const result = await auto.execute({ prompt: 'hello', screenshot: false });

    expect(result.success).toBe(true);
    expect(nutjs.keyboard.type).toHaveBeenCalledWith('hello');
    expect(result.operations.length).toBe(3);
    expect(logger.getOperations().length).toBe(3);
  });

  it('should fall back to visual click when hotkey fails', async () => {
    const nutjs: any = {
      keyboard: {
        pressKey: vi
          .fn()
          .mockRejectedValueOnce(new Error('fail'))
          .mockResolvedValue(undefined),
        releaseKey: vi.fn().mockResolvedValue(undefined),
        type: vi.fn().mockResolvedValue(undefined),
      },
      mouse: {
        setPosition: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
      },
      Button: { LEFT: 'LEFT' },
      Key: {
        LeftCmd: 'LeftCmd',
        LeftControl: 'LeftControl',
        L: 'L',
        A: 'A',
        Enter: 'Enter',
        Backspace: 'Backspace',
      },
      screen: {},
      imageResource: vi.fn(),
    };

    const finder: any = {
      findElement: vi.fn().mockImplementation(async (key: string) => {
        if (key === 'newTaskButton') {
          return { found: true, center: { x: 1, y: 2 } };
        }
        return { found: false };
      }),
    };

    const logger = new OperationLogger();
    const auto = new AutoInput(nutjs, finder, logger);
    const result = await auto.execute({ prompt: 'hello', screenshot: false });

    expect(result.success).toBe(true);
    expect(nutjs.mouse.setPosition).toHaveBeenCalled();
    expect(nutjs.mouse.click).toHaveBeenCalled();
  });
});
