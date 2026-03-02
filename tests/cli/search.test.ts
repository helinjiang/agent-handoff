import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

describe('search command', () => {
  it('should output json results', async () => {
    const wsPath = path.resolve('examples/workspaces/demo-login');
    const indexDir = path.join(wsPath, '.agenthandoff');
    await fs.mkdir(indexDir, { recursive: true });
    await fs.writeFile(
      path.join(indexDir, 'index.json'),
      JSON.stringify({
        version: 1,
        workspacePath: wsPath,
        workspaceName: 'demo-login',
        indexedAt: new Date().toISOString(),
        artifacts: [{ path: 'brief.md', kind: 'brief', preview: 'hello world' }],
        events: [],
      }),
      'utf-8'
    );

    const out = execSync(
      `node dist/index.js search world --workspace ${wsPath} --json`,
      { encoding: 'utf-8' }
    );
    const parsed = JSON.parse(out);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0].kind).toBe('artifact');
  });
});

