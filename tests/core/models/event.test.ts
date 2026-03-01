import { describe, it, expect } from 'vitest';
import { Event, EventType, createEvent } from '../../../src/core/models/event';

describe('Event types', () => {
  it('should define Event type correctly', () => {
    const event: Event = {
      ts: '2026-03-01T09:00:00+08:00',
      step: { index: 1, id: 'a-clarify' },
      type: 'step.started',
      summary: '开始需求澄清',
      links: ['brief.md'],
    };
    expect(event.ts).toBe('2026-03-01T09:00:00+08:00');
    expect(event.step.id).toBe('a-clarify');
    expect(event.type).toBe('step.started');
  });

  it('should define Event with workItemId', () => {
    const event: Event = {
      ts: '2026-03-01T12:25:00+08:00',
      step: { index: 4, id: 'login-test' },
      workItemId: 'login',
      type: 'verify.passed',
      summary: '测试通过',
    };
    expect(event.workItemId).toBe('login');
  });

  it('should create event with helper function', () => {
    const event = createEvent(
      { index: 1, id: 'test' },
      'step.started',
      '开始测试',
      { links: ['input.md'] }
    );
    expect(event.step.id).toBe('test');
    expect(event.type).toBe('step.started');
    expect(event.summary).toBe('开始测试');
    expect(event.ts).toBeDefined();
    expect(event.links).toEqual(['input.md']);
  });
});
