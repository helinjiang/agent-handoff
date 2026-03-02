import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

describe('diff command', () => {
  it('should output json diff', async () => {
    const leftWs = path.join(process.cwd(), 'test-diff-cli-left');
    const rightWs = path.join(process.cwd(), 'test-diff-cli-right');

    await fs.rm(leftWs, { recursive: true, force: true });
    await fs.rm(rightWs, { recursive: true, force: true });
    await fs.mkdir(path.join(leftWs, 'steps/01-a'), { recursive: true });
    await fs.mkdir(path.join(rightWs, 'steps/01-a'), { recursive: true });

    await fs.writeFile(path.join(leftWs, 'brief.md'), 'x\n', 'utf-8');
    await fs.writeFile(path.join(rightWs, 'brief.md'), 'y\n', 'utf-8');
    await fs.writeFile(path.join(leftWs, 'steps/01-a/output.md'), 'a\n', 'utf-8');
    await fs.writeFile(path.join(rightWs, 'steps/01-a/output.md'), 'b\n', 'utf-8');

    const mkIndex = async (ws: string, name: string) => {
      await fs.mkdir(path.join(ws, '.agenthandoff'), { recursive: true });
      await fs.writeFile(
        path.join(ws, '.agenthandoff', 'index.json'),
        JSON.stringify(
          {
            version: 1,
            workspacePath: ws,
            workspaceName: name,
            indexedAt: new Date().toISOString(),
            steps: [{ id: 'a', index: 1, outputPath: 'steps/01-a/output.md', outputExists: true }],
            artifacts: [
              { path: 'brief.md', kind: 'brief' },
              { path: 'steps/01-a/output.md', kind: 'step.output' },
            ],
            events: [],
          },
          null,
          2
        ),
        'utf-8'
      );
    };

    await mkIndex(leftWs, 'left');
    await mkIndex(rightWs, 'right');

    const out = execSync(`node dist/index.js diff ${leftWs} ${rightWs} --format json`, { encoding: 'utf-8' });
    const parsed = JSON.parse(out);
    expect(parsed.summary.changedArtifacts).toBeGreaterThan(0);

    await fs.rm(leftWs, { recursive: true, force: true });
    await fs.rm(rightWs, { recursive: true, force: true });
  });
});

