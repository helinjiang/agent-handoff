export type EventType =
  | 'step.started'
  | 'step.done'
  | 'artifact.updated'
  | 'workflow.updated'
  | 'verify.passed'
  | 'verify.failed'
  | 'accept.passed'
  | 'accept.failed'
  | 'issue.raised'
  | 'handoff.sent'
  | 'automation.session';

export interface EventStep {
  index: number;
  id: string;
}

export interface Event {
  ts: string;
  step: EventStep;
  workItemId?: string;
  type: EventType;
  summary: string;
  links?: string[];
  data?: Record<string, unknown>;
}

export function createEvent(
  step: EventStep,
  type: EventType,
  summary: string,
  options?: { workItemId?: string; links?: string[]; data?: Record<string, unknown> }
): Event {
  return {
    ts: new Date().toISOString(),
    step,
    type,
    summary,
    ...options,
  };
}
