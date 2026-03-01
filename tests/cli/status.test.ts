import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('status command', () => {
  it('should show demo-login as done', () => {
    const output = execSync(
      'node dist/index.js status examples/workspaces/demo-login',
      { encoding: 'utf-8' }
    );
    expect(output).toContain('Status: done');
    expect(output).toContain('✅');
  });

  it('should output valid JSON', () => {
    const output = execSync(
      'node dist/index.js status examples/workspaces/demo-login --json',
      { encoding: 'utf-8' }
    );
    const json = JSON.parse(output);
    expect(json.name).toBe('demo-login');
    expect(json.status).toBe('done');
    expect(json.totalSteps).toBe(6);
    expect(json.completedSteps).toBe(6);
  });

  it('should show error for nonexistent workspace', () => {
    try {
      execSync(
        'node dist/index.js status /nonexistent/workspace',
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
