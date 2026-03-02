import { describe, expect, it } from 'vitest';
import { TraeAdapter } from '../../../src/adapters/trae/trae-adapter';

describe('TraeAdapter', () => {
  it('should no-op initialize when disabled', async () => {
    const adapter = new TraeAdapter({ enabled: false });
    await adapter.initialize();
    expect(await adapter.isReady()).toBe(false);
    const result = await adapter.execute('test');
    expect(result.success).toBe(false);
    expect(result.error).toContain('disabled');
  });

  it('should initialize via injected Nut.js importer', async () => {
    const nutjs: any = {
      mouse: {},
      keyboard: { config: {} },
      screen: { config: {} },
      imageResource: () => ({}),
    };
    const adapter = new TraeAdapter(
      { enabled: true, confidence: 0.55, typingDelay: 42 },
      async () => nutjs
    );

    await adapter.initialize();
    expect(await adapter.isReady()).toBe(true);
    expect(nutjs.screen.config.confidence).toBe(0.55);
    expect(nutjs.keyboard.config.autoDelayMs).toBe(42);
  });

  it('should report not initialized when enabled but not initialized', async () => {
    const adapter = new TraeAdapter({ enabled: true }, async () => {
      throw new Error('should not import');
    });
    const result = await adapter.execute('test');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not initialized');
  });
});

