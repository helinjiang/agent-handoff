import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { AutomationError, ErrorRecovery } from '../../../src/adapters/trae/error-recovery';

describe('ErrorRecovery', () => {
  const testDir = path.join(process.cwd(), 'test-diagnostics');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  it('should not recover from permission_denied and save diagnostics', async () => {
    const deps: any = {
      nutjs: {},
      appManager: { activateApp: async () => true },
      screenFinder: { waitForElement: async () => ({ found: false }) },
    };
    const recovery = new ErrorRecovery(deps, {
      maxRetries: 2,
      retryDelay: 1,
      saveDiagnostics: true,
      diagnosticsDir: testDir,
    });

    const error = new AutomationError('permission_denied', 'access denied', { recoverable: false });
    const result = await recovery.handle(error);
    expect(result.recovered).toBe(false);
    expect(result.fallbackUsed).toBe(true);
    expect(result.diagnosticsPath).toBeDefined();
    const content = await fs.readFile(result.diagnosticsPath!, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.error.type).toBe('permission_denied');
  });

  it('should recover from image_not_found when element appears', async () => {
    const deps: any = {
      nutjs: {},
      appManager: { activateApp: async () => true },
      screenFinder: { waitForElement: async () => ({ found: true }) },
    };
    const recovery = new ErrorRecovery(deps, { maxRetries: 1, retryDelay: 1, saveDiagnostics: false });

    const error = new AutomationError('image_not_found', 'no match', {
      context: { elementKey: 'newTaskButton', timestamp: Date.now() },
    });
    const result = await recovery.handle(error);
    expect(result.recovered).toBe(true);
  });
});

