import fs from 'fs/promises';
import path from 'path';
import { listWorkspaces } from '../index/registry.js';
import { SearchHit, SearchOptions, SearchQuery } from './types.js';

interface IndexEvent {
  ts: string;
  stepId: string;
  stepIndex: number;
  type: string;
  summary: string;
  workItemId?: string;
  links?: string[];
}

interface IndexArtifact {
  path: string;
  kind: string;
  preview?: string;
}

interface WorkspaceIndexFile {
  version: number;
  workspacePath: string;
  workspaceName: string;
  indexedAt: string;
  workflowName?: string;
  steps?: Array<{ id: string; index: number }>;
  artifacts?: IndexArtifact[];
  events?: IndexEvent[];
}

interface WorkspaceTarget {
  name: string;
  path: string;
}

async function readIndexFile(workspacePath: string, indexDir?: string): Promise<WorkspaceIndexFile | null> {
  const indexFile = indexDir
    ? path.join(indexDir, 'index.json')
    : path.join(workspacePath, '.agenthandoff', 'index.json');
  try {
    const raw = await fs.readFile(indexFile, 'utf-8');
    return JSON.parse(raw) as WorkspaceIndexFile;
  } catch {
    return null;
  }
}

function toLower(input: string): string {
  return input.toLowerCase();
}

function normalizeList(values?: string[]): string[] | undefined {
  if (!values || values.length === 0) return undefined;
  return values.map((v) => v.trim()).filter((v) => v.length > 0);
}

function textIncludes(haystack: string, needle: string): boolean {
  return toLower(haystack).includes(needle);
}

function matchOptional(value: string | undefined, filter?: string[]): boolean {
  if (!filter || filter.length === 0) return true;
  if (!value) return false;
  return filter.includes(value);
}

function makeSnippet(text: string, q: string): string {
  const lower = toLower(text);
  const idx = lower.indexOf(q);
  if (idx < 0) {
    return text.length > 160 ? text.slice(0, 160) : text;
  }
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + q.length + 80);
  return text.slice(start, end);
}

function scoreHit(hit: SearchHit): number {
  return hit.score;
}

async function resolveTargets(query: SearchQuery, options: SearchOptions): Promise<WorkspaceTarget[]> {
  const workspaceFilters = normalizeList(query.workspace);
  const registryItems = options.registryOnly ? await listWorkspaces() : [];
  const targets: WorkspaceTarget[] = [];

  if (registryItems.length > 0) {
    for (const item of registryItems) {
      if (!workspaceFilters || workspaceFilters.includes(item.name) || workspaceFilters.includes(item.path)) {
        targets.push({ name: item.name, path: item.path });
      }
    }
  }

  if (!options.registryOnly && workspaceFilters && workspaceFilters.length > 0) {
    for (const token of workspaceFilters) {
      const exists = targets.some((t) => t.path === token || t.name === token);
      if (!exists) {
        targets.push({ name: path.basename(token), path: token });
      }
    }
  }

  return targets;
}

export async function search(query: SearchQuery, options: SearchOptions): Promise<SearchHit[]> {
  const q = query.q.trim();
  const qLower = toLower(q);
  const stepFilter = normalizeList(query.stepId);
  const typeFilter = normalizeList(query.type);
  const workItemFilter = normalizeList(query.workItemId);
  const limit = query.limit && query.limit > 0 ? query.limit : undefined;

  const targets = await resolveTargets(query, options);
  const hits: SearchHit[] = [];

  for (const target of targets) {
    const index = await readIndexFile(target.path, options.indexDir);
    if (!index) {
      continue;
    }
    const workspaceName = index.workspaceName || target.name;
    const workspacePath = index.workspacePath || target.path;

    if (options.targets === 'events' || options.targets === 'all') {
      const events = index.events || [];
      for (const event of events) {
        if (!matchOptional(event.stepId, stepFilter)) continue;
        if (!matchOptional(event.type, typeFilter)) continue;
        if (!matchOptional(event.workItemId, workItemFilter)) continue;
        if (!textIncludes(event.summary || '', qLower)) continue;

        hits.push({
          workspaceName,
          workspacePath,
          kind: 'event',
          score: 1,
          title: `${event.type} · ${event.stepId}`,
          snippet: makeSnippet(event.summary || '', qLower),
          meta: {
            ts: event.ts,
            stepId: event.stepId,
            stepIndex: event.stepIndex,
            type: event.type,
            workItemId: event.workItemId,
          },
        });
      }
    }

    if (options.targets === 'artifacts' || options.targets === 'all') {
      const artifacts = index.artifacts || [];
      for (const artifact of artifacts) {
        const preview = artifact.preview || '';
        if (!textIncludes(preview, qLower)) continue;
        hits.push({
          workspaceName,
          workspacePath,
          kind: 'artifact',
          score: 1,
          title: artifact.path,
          snippet: makeSnippet(preview, qLower),
          link: artifact.path,
          meta: {
            path: artifact.path,
            kind: artifact.kind,
          },
        });
      }
    }
  }

  hits.sort((a, b) => {
    const scoreDiff = scoreHit(b) - scoreHit(a);
    if (scoreDiff !== 0) return scoreDiff;
    const aTs = typeof a.meta.ts === 'string' ? a.meta.ts : '';
    const bTs = typeof b.meta.ts === 'string' ? b.meta.ts : '';
    return bTs.localeCompare(aTs);
  });

  return limit ? hits.slice(0, limit) : hits;
}
