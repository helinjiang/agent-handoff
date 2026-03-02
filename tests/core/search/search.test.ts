import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { registerWorkspace, unregisterWorkspace } from '../../../src/core/index/registry';
import { search } from '../../../src/core/search/search';

describe('search', () => {
  const originalHome = process.env.HOME;
  const testHome = path.join(process.cwd(), 'test-search-home');
  const wsPath = path.resolve('examples/workspaces/demo-login');

  beforeEach(async () => {
    process.env.HOME = testHome;
    await fs.rm(testHome, { recursive: true, force: true });
    await unregisterWorkspace(wsPath);
  });

  afterEach(async () => {
    await fs.rm(testHome, { recursive: true, force: true });
    process.env.HOME = originalHome;
  });

  it('should search events in registry workspaces', async () => {
    await registerWorkspace(wsPath, 'demo-login');
    await fs.mkdir(path.join(wsPath, '.agenthandoff'), { recursive: true });

    const index = {
      version: 1,
      workspacePath: wsPath,
      workspaceName: 'demo-login',
      indexedAt: new Date().toISOString(),
      artifacts: [
        { path: 'brief.md', kind: 'brief', preview: 'hello world' },
      ],
      events: [
        {
          ts: '2026-03-02T00:00:00.000Z',
          stepId: 's1',
          stepIndex: 1,
          type: 'automation.session',
          summary: 'Start session',
          workItemId: 'w1',
        },
      ],
    };
    await fs.writeFile(
      path.join(wsPath, '.agenthandoff', 'index.json'),
      JSON.stringify(index, null, 2),
      'utf-8'
    );

    const hits = await search(
      { q: 'session' },
      { targets: 'events', registryOnly: true }
    );
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].kind).toBe('event');
  });

  it('should skip workspace when index is missing', async () => {
    await registerWorkspace(wsPath, 'demo-login');
    await fs.rm(path.join(wsPath, '.agenthandoff', 'index.json'), { force: true });

    const hits = await search(
      { q: 'anything' },
      { targets: 'all', registryOnly: true }
    );
    expect(hits).toEqual([]);
  });

  it('should filter by type and workItemId', async () => {
    await registerWorkspace(wsPath, 'demo-login');
    await fs.mkdir(path.join(wsPath, '.agenthandoff'), { recursive: true });

    const index = {
      version: 1,
      workspacePath: wsPath,
      workspaceName: 'demo-login',
      indexedAt: new Date().toISOString(),
      artifacts: [],
      events: [
        {
          ts: '2026-03-02T00:00:01.000Z',
          stepId: 's1',
          stepIndex: 1,
          type: 'automation.session',
          summary: 'hello',
          workItemId: 'w1',
        },
        {
          ts: '2026-03-02T00:00:02.000Z',
          stepId: 's2',
          stepIndex: 2,
          type: 'step.done',
          summary: 'hello',
          workItemId: 'w2',
        },
      ],
    };
    await fs.writeFile(
      path.join(wsPath, '.agenthandoff', 'index.json'),
      JSON.stringify(index, null, 2),
      'utf-8'
    );

    const hits = await search(
      { q: 'hello', type: ['automation.session'], workItemId: ['w1'] },
      { targets: 'events', registryOnly: true }
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].meta.type).toBe('automation.session');
  });
});

