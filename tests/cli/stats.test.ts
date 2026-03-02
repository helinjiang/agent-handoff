import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

describe('stats command', () => {
  it('should output markdown table', async () => {
    const ws = path.join(process.cwd(), 'test-stats-cli-ws');
    await fs.rm(ws, { recursive: true, force: true });
    await fs.mkdir(path.join(ws, '.agenthandoff'), { recursive: true });
    await fs.writeFile(
      path.join(ws, '.agenthandoff', 'index.json'),
      JSON.stringify(
        {
          version: 1,
          workspacePath: ws,
          workspaceName: 'stats-cli',
          indexedAt: new Date().toISOString(),
          steps: [{ id: 's1', index: 1, outputExists: true }],
          events: [{ ts: '2026-03-02T00:00:00.000Z', stepId: 's1', type: 'step.done' }],
        },
        null,
        2
      ),
      'utf-8'
    );

    const out = execSync(`node dist/index.js stats ${ws} --format markdown`, { encoding: 'utf-8' });
    expect(out).toContain('| Workspace | Steps | Events | Automation |');
    expect(out).toContain('stats-cli');

    await fs.rm(ws, { recursive: true, force: true });
  });
});

