export type WorkflowStatus = 'running' | 'done' | 'blocked';

export interface State {
  currentIndex: number;
  status: WorkflowStatus;
  updatedAt: string;
  blockedReason?: string;
}

export function createInitialState(): State {
  return {
    currentIndex: 0,
    status: 'running',
    updatedAt: new Date().toISOString(),
  };
}
