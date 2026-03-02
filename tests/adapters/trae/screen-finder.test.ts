import { describe, expect, it, vi } from 'vitest';
import { ScreenFinder } from '../../../src/adapters/trae/screen-finder';
import { DEFAULT_TRAE_CONFIG } from '../../../src/adapters/trae/config';

describe('ScreenFinder', () => {
  it('should find element via screen.find and return center', async () => {
    const region = { left: 1, top: 2, width: 3, height: 4 };
    const center = { x: 10, y: 20 };

    const nutjs: any = {
      screen: {
        find: vi.fn().mockResolvedValue(region),
      },
      imageResource: vi.fn().mockReturnValue({}),
      centerOf: vi.fn().mockResolvedValue(center),
    };

    const finder = new ScreenFinder(nutjs, DEFAULT_TRAE_CONFIG);
    const result = await finder.findElement('newTaskButton');

    expect(result.found).toBe(true);
    expect(result.region).toEqual(region);
    expect(result.center).toEqual(center);
  });

  it('should return not found when element missing', async () => {
    const nutjs: any = {
      screen: {
        find: vi.fn().mockRejectedValue(new Error('no match')),
      },
      imageResource: vi.fn().mockReturnValue({}),
      centerOf: vi.fn(),
    };

    const finder = new ScreenFinder(nutjs, DEFAULT_TRAE_CONFIG);
    const result = await finder.findElement('submitButton');

    expect(result.found).toBe(false);
    expect(result.error).toContain('Element not found');
  });

  it('should time out when waiting for element', async () => {
    const nutjs: any = {
      screen: {
        find: vi.fn().mockRejectedValue(new Error('no match')),
      },
      imageResource: vi.fn().mockReturnValue({}),
      centerOf: vi.fn(),
    };

    const finder = new ScreenFinder(nutjs, DEFAULT_TRAE_CONFIG);
    const start = Date.now();
    const result = await finder.waitForElement('chatInputArea', 20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(0);
    expect(result.found).toBe(false);
    expect(result.error).toContain('Timeout');
  });
});

