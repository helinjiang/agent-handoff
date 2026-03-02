import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('next command', () => {
  it('should show completed message for demo-login', () => {
    const output = execSync(
      'node dist/index.js next examples/workspaces/demo-login',
      { encoding: 'utf-8' }
    );
    expect(output).toContain('已完成所有步骤');
  });

  it('should show error for nonexistent workspace', () => {
    try {
      execSync(
        'node dist/index.js next /nonexistent/workspace',
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      expect.fail('Should have thrown an error');
    } catch (error: unknown) {
      const err = error as { stderr?: string; message?: string };
      const output = err.stderr || err.message || '';
      expect(output).toContain('workspace not found');
    }
  });
});
