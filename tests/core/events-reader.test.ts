import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { readEventsJsonl, toTimelineItems } from '../../src/core/events-reader';

describe('events-reader', () => {
  const testDir = path.join(process.cwd(), 'test-events-reader-workspace');
  const eventsFile = path.join(testDir, 'events.jsonl');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  it('should return empty result for missing file', async () => {
    await fs.rm(eventsFile, { force: true });
    const result = await readEventsJsonl({ workspacePath: testDir });
    expect(result.events).toEqual([]);
    expect(result.invalidLines).toBe(0);
  });

  it('should parse events, skip invalid lines and sort by ts', async () => {
    const e1 = {
      ts: '2026-03-01T00:00:02.000Z',
      step: { index: 1, id: 'b' },
      type: 'step.started',
      summary: 'b',
    };
    const e2 = {
      ts: '2026-03-01T00:00:01.000Z',
      step: { index: 0, id: 'a' },
      type: 'step.started',
      summary: 'a',
      data: { x: 1 },
    };

    await fs.writeFile(
      eventsFile,
      [JSON.stringify(e1), 'invalid json', JSON.stringify(e2), ''].join('\n'),
      'utf-8'
    );

    const result = await readEventsJsonl({ workspacePath: testDir });
    expect(result.invalidLines).toBe(1);
    expect(result.events).toHaveLength(2);
    expect(result.events[0].summary).toBe('a');
    expect(result.events[1].summary).toBe('b');
  });

  it('should apply limit after sorting', async () => {
    const e1 = {
      ts: '2026-03-01T00:00:01.000Z',
      step: { index: 0, id: 'a' },
      type: 'step.started',
      summary: 'a',
    };
    const e2 = {
      ts: '2026-03-01T00:00:02.000Z',
      step: { index: 1, id: 'b' },
      type: 'step.started',
      summary: 'b',
    };

    await fs.writeFile(eventsFile, [JSON.stringify(e2), JSON.stringify(e1)].join('\n'), 'utf-8');

    const result = await readEventsJsonl({ workspacePath: testDir, limit: 1 });
    expect(result.events).toHaveLength(1);
    expect(result.events[0].summary).toBe('b');
  });

  it('should map events to timeline items', async () => {
    const events: any[] = [
      {
        ts: '2026-03-01T00:00:01.000Z',
        step: { index: 2, id: 'x' },
        type: 'automation.session',
        summary: 'session',
        workItemId: 'w1',
        links: ['a.md'],
        data: { ok: true },
      },
    ];

    const items = toTimelineItems(events as any);
    expect(items).toHaveLength(1);
    expect(items[0].stepId).toBe('x');
    expect(items[0].stepIndex).toBe(2);
    expect(items[0].type).toBe('automation.session');
    expect(items[0].data).toEqual({ ok: true });
  });
});

