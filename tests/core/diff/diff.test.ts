import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { diffWorkspaces } from '../../../src/core/diff/diff';

describe('diff', () => {
  const leftWs = path.join(process.cwd(), 'test-diff-left');
  const rightWs = path.join(process.cwd(), 'test-diff-right');

  const writeIndex = async (ws: string, name: string, artifacts: string[]) => {
    await fs.mkdir(path.join(ws, '.agenthandoff'), { recursive: true });
    await fs.writeFile(
      path.join(ws, '.agenthandoff', 'index.json'),
      JSON.stringify(
        {
          version: 1,
          workspacePath: ws,
          workspaceName: name,
          indexedAt: new Date().toISOString(),
          steps: [
            { id: 'a', index: 1, outputPath: 'steps/01-a/output.md', outputExists: true },
          ],
          artifacts: artifacts.map((p) => ({ path: p, kind: p === 'brief.md' ? 'brief' : 'step.output' })),
          events: [{ ts: '2026-03-02T00:00:00.000Z', summary: 'left' }],
        },
        null,
        2
      ),
      'utf-8'
    );
  };

  beforeEach(async () => {
    await fs.rm(leftWs, { recursive: true, force: true });
    await fs.rm(rightWs, { recursive: true, force: true });
    await fs.mkdir(path.join(leftWs, 'steps/01-a'), { recursive: true });
    await fs.mkdir(path.join(rightWs, 'steps/01-a'), { recursive: true });
    await fs.writeFile(path.join(leftWs, 'brief.md'), 'hello\n', 'utf-8');
    await fs.writeFile(path.join(rightWs, 'brief.md'), 'hello world\n', 'utf-8');
    await fs.writeFile(path.join(leftWs, 'steps/01-a/output.md'), 'line1\nline2\n', 'utf-8');
    await fs.writeFile(path.join(rightWs, 'steps/01-a/output.md'), 'line1\nline2 changed\n', 'utf-8');
    await writeIndex(leftWs, 'left', ['brief.md', 'steps/01-a/output.md']);
    await writeIndex(rightWs, 'right', ['brief.md', 'steps/01-a/output.md']);
  });

  afterEach(async () => {
    await fs.rm(leftWs, { recursive: true, force: true });
    await fs.rm(rightWs, { recursive: true, force: true });
  });

  it('should diff changed artifacts and include unified diff', async () => {
    const result = await diffWorkspaces({ leftWorkspace: leftWs, rightWorkspace: rightWs, format: 'json' });
    expect(result.summary.changedArtifacts).toBe(2);
    const brief = result.artifacts.find((a) => a.path === 'brief.md');
    expect(brief?.status).toBe('changed');
    expect(brief?.diff).toContain('--- a/brief.md');
    expect(brief?.diff).toContain('+hello world');
  });

  it('should support paths filter', async () => {
    const result = await diffWorkspaces({
      leftWorkspace: leftWs,
      rightWorkspace: rightWs,
      format: 'json',
      paths: ['brief.md'],
    });
    expect(result.artifacts.some((a) => a.path === 'steps/01-a/output.md')).toBe(false);
    expect(result.artifacts.some((a) => a.path === 'brief.md')).toBe(true);
  });
});

