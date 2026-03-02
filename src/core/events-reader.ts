import fs from 'fs/promises';
import path from 'path';
import { Event } from './models/event.js';

export interface ReadEventsOptions {
  workspacePath: string;
  limit?: number;
}

export interface ReadEventsResult {
  events: Event[];
  invalidLines: number;
}

export interface TimelineItem {
  ts: string;
  stepId: string;
  stepIndex: number;
  type: string;
  summary: string;
  workItemId?: string;
  links?: string[];
  data?: Record<string, unknown>;
}

export async function readEventsJsonl(options: ReadEventsOptions): Promise<ReadEventsResult> {
  const eventsPath = path.join(options.workspacePath, 'events.jsonl');

  try {
    const content = await fs.readFile(eventsPath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    const events: Event[] = [];
    let invalidLines = 0;

    for (const line of lines) {
      try {
        const event = JSON.parse(line) as Event;
        events.push(event);
      } catch {
        invalidLines += 1;
      }
    }

    events.sort((a, b) => {
      const ats = a.ts ?? '';
      const bts = b.ts ?? '';
      if (ats < bts) return -1;
      if (ats > bts) return 1;
      return 0;
    });

    const limited =
      typeof options.limit === 'number' && options.limit > 0 ? events.slice(-options.limit) : events;

    return { events: limited, invalidLines };
  } catch {
    return { events: [], invalidLines: 0 };
  }
}

export function toTimelineItems(events: Event[]): TimelineItem[] {
  return events.map((event) => ({
    ts: event.ts,
    stepId: event.step.id,
    stepIndex: event.step.index,
    type: event.type,
    summary: event.summary,
    ...(event.workItemId && { workItemId: event.workItemId }),
    ...(event.links && event.links.length > 0 && { links: event.links }),
    ...(event.data && { data: event.data }),
  }));
}

