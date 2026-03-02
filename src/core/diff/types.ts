export interface DiffOptions {
  leftWorkspace: string;
  rightWorkspace: string;
  format: 'text' | 'markdown' | 'json';
  paths?: string[];
  contextLines?: number;
}

export interface DiffResult {
  summary: {
    left: { name: string; path: string };
    right: { name: string; path: string };
    changedArtifacts: number;
    addedArtifacts: number;
    removedArtifacts: number;
    changedSteps: number;
  };
  artifacts: Array<{
    path: string;
    status: 'added' | 'removed' | 'changed' | 'unchanged';
    diff?: string;
  }>;
  workflow?: {
    changed: boolean;
    details?: string;
  };
  events?: {
    leftCount: number;
    rightCount: number;
    added: number;
    latestRight?: { ts: string; summary: string };
  };
}

