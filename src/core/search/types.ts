export interface SearchQuery {
  q: string;
  workspace?: string[];
  stepId?: string[];
  type?: string[];
  workItemId?: string[];
  limit?: number;
}

export type SearchTarget = 'events' | 'artifacts' | 'all';

export interface SearchOptions {
  targets: SearchTarget;
  registryOnly: boolean;
  indexDir?: string;
}

export interface SearchHit {
  workspaceName: string;
  workspacePath: string;
  kind: 'event' | 'artifact';
  score: number;
  title: string;
  snippet: string;
  link?: string;
  meta: Record<string, unknown>;
}

