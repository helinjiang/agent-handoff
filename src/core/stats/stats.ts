import fs from 'fs/promises';
import path from 'path';
import { StatsQuery, StatsResult, WorkspaceStats } from './types.js';

interface IndexEvent {
  ts: string;
  stepId?: string;
  type?: string;
  summary?: string;
}

interface WorkspaceIndexFile {
  version: number;
  workspacePath: string;
  workspaceName: string;
  indexedAt: string;
  steps?: Array<{ id: string; index: number; outputExists?: boolean }>;
  events?: IndexEvent[];
}

async function readIndex(workspacePath: string): Promise<WorkspaceIndexFile | null> {
  const abs = path.resolve(workspacePath);
  const indexPath = path.join(abs, '.agenthandoff', 'index.json');
  try {
    const raw = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(raw) as WorkspaceIndexFile;
  } catch {
    return null;
  }
}

function countEventsByType(events: IndexEvent[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ev of events) {
    const type = ev.type || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

function buildDurations(events: IndexEvent[]): Array<{
  stepId: string;
  startedAt?: string;
  doneAt?: string;
  durationMs?: number;
}> {
  const map = new Map<string, { startedAt?: string; doneAt?: string }>();
  for (const ev of events) {
    if (!ev.stepId || !ev.type || !ev.ts) continue;
    const key = ev.stepId;
    const current = map.get(key) || {};
    if (ev.type === 'step.started') {
      if (!current.startedAt || ev.ts < current.startedAt) current.startedAt = ev.ts;
    }
    if (ev.type === 'step.done') {
      if (!current.doneAt || ev.ts > current.doneAt) current.doneAt = ev.ts;
    }
    map.set(key, current);
  }

  const items: Array<{ stepId: string; startedAt?: string; doneAt?: string; durationMs?: number }> = [];
  for (const [stepId, v] of map.entries()) {
    let durationMs: number | undefined;
    if (v.startedAt && v.doneAt) {
      const start = new Date(v.startedAt).getTime();
      const end = new Date(v.doneAt).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
        durationMs = end - start;
      }
    }
    items.push({ stepId, startedAt: v.startedAt, doneAt: v.doneAt, ...(durationMs !== undefined && { durationMs }) });
  }

  return items.sort((a, b) => a.stepId.localeCompare(b.stepId));
}

function buildWorkspaceStats(index: WorkspaceIndexFile, mode: 'summary' | 'full'): WorkspaceStats {
  const steps = index.steps || [];
  const stepsTotal = steps.length;
  const stepsDone = steps.filter((s) => Boolean(s.outputExists)).length;
  const events = index.events || [];
  const eventsTotal = events.length;
  const eventsByType = countEventsByType(events);
  const automationSessions = events.filter((e) => e.type === 'automation.session').length;

  const stats: WorkspaceStats = {
    workspaceName: index.workspaceName,
    workspacePath: index.workspacePath,
    indexedAt: index.indexedAt,
    stepsTotal,
    stepsDone,
    eventsTotal,
    eventsByType,
    automation: {
      sessions: automationSessions,
      summary: {},
    },
  };

  if (mode === 'full') {
    stats.durations = buildDurations(events);
  }

  return stats;
}

export async function buildStats(query: StatsQuery): Promise<StatsResult> {
  const workspaces = query.workspaces || [];
  const results: WorkspaceStats[] = [];

  for (const ws of workspaces) {
    const index = await readIndex(ws);
    if (!index) continue;
    results.push(buildWorkspaceStats(index, query.mode));
  }

  return {
    generatedAt: new Date().toISOString(),
    workspaces: results,
  };
}
