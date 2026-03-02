import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import {
  writeEvent,
  readEvents,
  getLatestEvent,
  getEventsByStep,
  getEventsByType,
  getEventsByWorkItem,
} from '../../src/core/events-writer';
import { EventType } from '../../src/core/models/event';

describe('events-writer', () => {
  const testDir = path.join(process.cwd(), 'test-events-workspace');
  const eventsFile = path.join(testDir, 'events.jsonl');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  describe('writeEvent', () => {
    it('should write event to file', async () => {
      const result = await writeEvent({
        workspacePath: testDir,
        step: { index: 1, id: 'test-step' },
        type: 'step.started',
        summary: 'Test event',
      });

      expect(result.success).toBe(true);
      expect(result.event.type).toBe('step.started');
      expect(result.event.ts).toBeDefined();

      const content = await fs.readFile(eventsFile, 'utf-8');
      expect(content).toContain('step.started');
      expect(content).toContain('Test event');
    });

    it('should write event with all fields', async () => {
      const result = await writeEvent({
        workspacePath: testDir,
        step: { index: 2, id: 'implement' },
        type: 'step.done',
        summary: 'Implementation complete',
        workItemId: 'auth',
        links: ['src/auth.ts', 'tests/auth.test.ts'],
      });

      expect(result.success).toBe(true);
      expect(result.event.workItemId).toBe('auth');
      expect(result.event.links).toEqual(['src/auth.ts', 'tests/auth.test.ts']);
    });

    it('should append multiple events', async () => {
      await writeEvent({
        workspacePath: testDir,
        step: { index: 1, id: 'step1' },
        type: 'step.started',
        summary: 'Event 1',
      });

      await writeEvent({
        workspacePath: testDir,
        step: { index: 1, id: 'step1' },
        type: 'step.done',
        summary: 'Event 2',
      });

      const content = await fs.readFile(eventsFile, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim());
      expect(lines).toHaveLength(2);
    });

    it('should generate valid ISO 8601 timestamp', async () => {
      const before = new Date().toISOString();
      const result = await writeEvent({
        workspacePath: testDir,
        step: { index: 1, id: 'test' },
        type: 'step.started',
        summary: 'Test',
      });
      const after = new Date().toISOString();

      expect(result.event.ts >= before).toBe(true);
      expect(result.event.ts <= after).toBe(true);
    });
  });

  describe('readEvents', () => {
    it('should read all events', async () => {
      await writeEvent({
        workspacePath: testDir,
        step: { index: 1, id: 'step1' },
        type: 'step.started',
        summary: 'Event 1',
      });
      await writeEvent({
        workspacePath: testDir,
        step: { index: 1, id: 'step1' },
        type: 'step.done',
        summary: 'Event 2',
      });

      const events = await readEvents(testDir);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('step.started');
      expect(events[1].type).toBe('step.done');
    });

    it('should return empty array for missing file', async () => {
      const events = await readEvents(testDir);
      expect(events).toHaveLength(0);
    });

    it('should skip invalid lines', async () => {
      await fs.appendFile(eventsFile, 'invalid json\n');
      await writeEvent({
        workspacePath: testDir,
        step: { index: 1, id: 'step1' },
        type: 'step.started',
        summary: 'Valid event',
      });
      await fs.appendFile(eventsFile, '\n');

      const events = await readEvents(testDir);
      expect(events).toHaveLength(1);
      expect(events[0].summary).toBe('Valid event');
    });
  });

  describe('getLatestEvent', () => {
    it('should get latest event', async () => {
      await writeEvent({
        workspacePath: testDir,
        step: { index: 1, id: 'step1' },
        type: 'step.started',
        summary: 'Event 1',
      });
      await writeEvent({
        workspacePath: testDir,
        step: { index: 1, id: 'step1' },
        type: 'step.done',
        summary: 'Event 2',
      });

      const latest = await getLatestEvent(testDir);
      expect(latest?.type).toBe('step.done');
    });

    it('should return null for no events', async () => {
      const latest = await getLatestEvent(testDir);
      expect(latest).toBeNull();
    });
  });

  describe('getEventsByStep', () => {
    it('should filter events by step id', async () => {
      await writeEvent({
        workspacePath: testDir,
        step: { index: 1, id: 'step1' },
        type: 'step.started',
        summary: 'Event 1',
      });
      await writeEvent({
        workspacePath: testDir,
        step: { index: 2, id: 'step2' },
        type: 'step.started',
        summary: 'Event 2',
      });
      await writeEvent({
        workspacePath: testDir,
        step: { index: 1, id: 'step1' },
        type: 'step.done',
        summary: 'Event 3',
      });

      const events = await getEventsByStep(testDir, 'step1');
      expect(events).toHaveLength(2);
      expect(events.every((e) => e.step.id === 'step1')).toBe(true);
    });
  });

  describe('getEventsByType', () => {
    it('should filter events by type', async () => {
      await writeEvent({
        workspacePath: testDir,
        step: { index: 1, id: 'step1' },
        type: 'step.started',
        summary: 'Event 1',
      });
      await writeEvent({
        workspacePath: testDir,
        step: { index: 1, id: 'step1' },
        type: 'step.done',
        summary: 'Event 2',
      });
      await writeEvent({
        workspacePath: testDir,
        step: { index: 2, id: 'step2' },
        type: 'step.started',
        summary: 'Event 3',
      });

      const events = await getEventsByType(testDir, 'step.started');
      expect(events).toHaveLength(2);
      expect(events.every((e) => e.type === 'step.started')).toBe(true);
    });
  });

  describe('getEventsByWorkItem', () => {
    it('should filter events by work item id', async () => {
      await writeEvent({
        workspacePath: testDir,
        step: { index: 1, id: 'implement' },
        type: 'step.started',
        summary: 'Event 1',
        workItemId: 'auth',
      });
      await writeEvent({
        workspacePath: testDir,
        step: { index: 2, id: 'test' },
        type: 'step.started',
        summary: 'Event 2',
        workItemId: 'auth',
      });
      await writeEvent({
        workspacePath: testDir,
        step: { index: 3, id: 'other' },
        type: 'step.started',
        summary: 'Event 3',
        workItemId: 'other',
      });

      const events = await getEventsByWorkItem(testDir, 'auth');
      expect(events).toHaveLength(2);
      expect(events.every((e) => e.workItemId === 'auth')).toBe(true);
    });
  });

  describe('all event types', () => {
    const eventTypes: EventType[] = [
      'step.started',
      'step.done',
      'artifact.updated',
      'workflow.updated',
      'verify.passed',
      'verify.failed',
      'accept.passed',
      'accept.failed',
      'issue.raised',
      'handoff.sent',
    ];

    it('should write all event types', async () => {
      for (const type of eventTypes) {
        const result = await writeEvent({
          workspacePath: testDir,
          step: { index: 1, id: 'test' },
          type,
          summary: `Test ${type}`,
        });
        expect(result.success).toBe(true);
        expect(result.event.type).toBe(type);
      }

      const events = await readEvents(testDir);
      expect(events).toHaveLength(eventTypes.length);
    });
  });
});
