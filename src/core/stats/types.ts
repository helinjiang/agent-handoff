export interface StatsQuery {
  workspaces: string[];
  mode: 'summary' | 'full';
}

export interface WorkspaceStats {
  workspaceName: string;
  workspacePath: string;
  indexedAt: string;
  stepsTotal: number;
  stepsDone: number;
  eventsTotal: number;
  eventsByType: Record<string, number>;
  durations?: Array<{
    stepId: string;
    startedAt?: string;
    doneAt?: string;
    durationMs?: number;
  }>;
  automation?: {
    sessions: number;
    summary: Record<string, unknown>;
  };
}

export interface StatsResult {
  generatedAt: string;
  workspaces: WorkspaceStats[];
}

