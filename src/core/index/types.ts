export interface WorkspaceIndexStep {
  id: string;
  index: number;
  outputPath?: string;
  outputExists: boolean;
}

export type WorkspaceIndexArtifactKind = 'step.output' | 'brief' | 'other';

export interface WorkspaceIndexArtifact {
  path: string;
  kind: WorkspaceIndexArtifactKind;
  bytes?: number;
  updatedAt?: string;
  preview?: string;
}

export interface WorkspaceIndexEvent {
  ts: string;
  stepId: string;
  stepIndex: number;
  type: string;
  summary: string;
  workItemId?: string;
  links?: string[];
}

export interface WorkspaceIndex {
  version: 1;
  workspacePath: string;
  workspaceName: string;
  indexedAt: string;
  workflowName?: string;
  steps: WorkspaceIndexStep[];
  artifacts: WorkspaceIndexArtifact[];
  events: WorkspaceIndexEvent[];
}

