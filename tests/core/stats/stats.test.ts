import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { buildStats } from '../../../src/core/stats/stats';

describe('stats', () => {
  const ws = path.join(process.cwd(), 'test-stats-ws');

  beforeEach(async () => {
    await fs.rm(ws, { recursive: true, force: true });
    await fs.mkdir(path.join(ws, '.agenthandoff'), { recursive: true });
    await fs.writeFile(
      path.join(ws, '.agenthandoff', 'index.json'),
      JSON.stringify(
        {
          version: 1,
          workspacePath: ws,
          workspaceName: 'stats-ws',
          indexedAt: new Date().toISOString(),
          steps: [
            { id: 's1', index: 1, outputExists: true },
            { id: 's2', index: 2, outputExists: false },
          ],
          events: [
            { ts: '2026-03-02T00:00:00.000Z', stepId: 's1', type: 'step.started' },
            { ts: '2026-03-02T00:00:10.000Z', stepId: 's1', type: 'step.done' },
            { ts: '2026-03-02T00:00:05.000Z', stepId: 's2', type: 'step.started' },
            { ts: '2026-03-02T00:00:20.000Z', stepId: 's2', type: 'automation.session' },
          ],
        },
        null,
        2
      ),
      'utf-8'
    );
  });

  afterEach(async () => {
    await fs.rm(ws, { recursive: true, force: true });
  });

  it('should build stats summary', async () => {
    const result = await buildStats({ workspaces: [ws], mode: 'summary' });
    expect(result.workspaces).toHaveLength(1);
    const stats = result.workspaces[0];
    expect(stats.stepsTotal).toBe(2);
    expect(stats.stepsDone).toBe(1);
    expect(stats.eventsTotal).toBe(4);
    expect(stats.eventsByType['automation.session']).toBe(1);
    expect(stats.durations).toBeUndefined();
  });

  it('should include durations in full mode', async () => {
    const result = await buildStats({ workspaces: [ws], mode: 'full' });
    const stats = result.workspaces[0];
    expect(stats.durations?.length).toBeGreaterThan(0);
    const s1 = stats.durations?.find((d) => d.stepId === 's1');
    expect(s1?.durationMs).toBe(10000);
  });
});

