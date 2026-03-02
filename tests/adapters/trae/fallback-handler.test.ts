import { describe, expect, it } from 'vitest';
import { AutomationError } from '../../../src/adapters/trae/error-recovery';
import { FallbackHandler } from '../../../src/adapters/trae/fallback-handler';

describe('FallbackHandler', () => {
  it('should generate fallback message', async () => {
    const handler = new FallbackHandler({ copyPrompt: false, showPrompt: true });
    const error = new AutomationError('image_not_found', 'not found');
    const result = await handler.handle(error, 'test prompt');

    expect(result.success).toBe(true);
    expect(result.message).toContain('自动化失败');
    expect(result.message).toContain('辅助模式');
    expect(result.message).toContain('test prompt');
  });

  it('should include tips for non-recoverable errors', async () => {
    const handler = new FallbackHandler({ copyPrompt: false, showPrompt: false });
    const error = new AutomationError('permission_denied', 'access denied', { recoverable: false });
    const result = await handler.handle(error, 'test prompt');

    expect(result.message).toContain('不可自动恢复');
    expect(result.message).toContain('权限');
  });
});

