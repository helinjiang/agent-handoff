import fs from 'fs/promises';
import path from 'path';
import { Event, EventType, EventStep } from './models/event.js';

export interface WriteEventOptions {
  workspacePath: string;
  step: EventStep;
  type: EventType;
  summary: string;
  workItemId?: string;
  links?: string[];
}

export interface EventsWriterResult {
  success: boolean;
  event: Event;
  error?: string;
}

export async function writeEvent(options: WriteEventOptions): Promise<EventsWriterResult> {
  const { workspacePath, step, type, summary, workItemId, links } = options;

  const event: Event = {
    ts: new Date().toISOString(),
    step,
    type,
    summary,
    ...(workItemId && { workItemId }),
    ...(links && links.length > 0 && { links }),
  };

  try {
    const eventsPath = path.join(workspacePath, 'events.jsonl');
    const line = JSON.stringify(event) + '\n';
    await fs.appendFile(eventsPath, line, 'utf-8');

    return {
      success: true,
      event,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      event,
      error: errorMessage,
    };
  }
}

export async function readEvents(workspacePath: string): Promise<Event[]> {
  const eventsPath = path.join(workspacePath, 'events.jsonl');

  try {
    const content = await fs.readFile(eventsPath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    const events: Event[] = [];
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as Event;
        events.push(event);
      } catch {
        // Skip invalid lines
      }
    }

    return events;
  } catch {
    return [];
  }
}

export async function getLatestEvent(workspacePath: string): Promise<Event | null> {
  const events = await readEvents(workspacePath);
  if (events.length === 0) {
    return null;
  }
  return events[events.length - 1];
}

export async function getEventsByStep(workspacePath: string, stepId: string): Promise<Event[]> {
  const events = await readEvents(workspacePath);
  return events.filter((event) => event.step.id === stepId);
}

export async function getEventsByType(workspacePath: string, type: EventType): Promise<Event[]> {
  const events = await readEvents(workspacePath);
  return events.filter((event) => event.type === type);
}

export async function getEventsByWorkItem(
  workspacePath: string,
  workItemId: string
): Promise<Event[]> {
  const events = await readEvents(workspacePath);
  return events.filter((event) => event.workItemId === workItemId);
}
