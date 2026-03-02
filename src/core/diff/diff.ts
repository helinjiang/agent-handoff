import fs from 'fs/promises';
import path from 'path';
import { DiffOptions, DiffResult } from './types.js';

interface WorkspaceIndexFile {
  version: number;
  workspacePath: string;
  workspaceName: string;
  indexedAt: string;
  workflowName?: string;
  steps?: Array<{ id: string; index: number; outputPath?: string; outputExists?: boolean }>;
  artifacts?: Array<{ path: string; kind: string }>;
  events?: Array<{ ts: string; summary: string }>;
}

async function readIndex(workspacePath: string): Promise<WorkspaceIndexFile> {
  const abs = path.resolve(workspacePath);
  const indexPath = path.join(abs, '.agenthandoff', 'index.json');
  try {
    const raw = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(raw) as WorkspaceIndexFile;
  } catch {
    throw new Error(`index not found: ${indexPath}. 请先运行 agent-handoff index`);
  }
}

async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function defaultArtifactPaths(index: WorkspaceIndexFile): string[] {
  const artifacts = index.artifacts || [];
  const paths = artifacts.map((a) => a.path);
  return paths.filter((p) => p === 'brief.md' || /^steps\/[^/]+\/output\.md$/.test(p));
}

type Op = { t: 'equal' | 'add' | 'del'; line: string };

function buildLcsOps(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ t: 'equal', line: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ t: 'del', line: a[i] });
      i++;
    } else {
      ops.push({ t: 'add', line: b[j] });
      j++;
    }
  }
  while (i < n) {
    ops.push({ t: 'del', line: a[i] });
    i++;
  }
  while (j < m) {
    ops.push({ t: 'add', line: b[j] });
    j++;
  }
  return ops;
}

function formatUnifiedDiff(filePath: string, left: string | null, right: string | null, contextLines: number): string {
  const leftLines = (left ?? '').split('\n');
  const rightLines = (right ?? '').split('\n');
  const ops = buildLcsOps(leftLines, rightLines);

  const lines: string[] = [];
  lines.push(`--- a/${filePath}`);
  lines.push(`+++ b/${filePath}`);

  let aLine = 1;
  let bLine = 1;
  let i = 0;

  const consumeEqual = (count: number): void => {
    for (let k = 0; k < count && i < ops.length; k++) {
      const op = ops[i];
      if (op.t !== 'equal') break;
      aLine++;
      bLine++;
      i++;
    }
  };

  while (i < ops.length) {
    while (i < ops.length && ops[i].t === 'equal') {
      i++;
      aLine++;
      bLine++;
    }
    if (i >= ops.length) break;

    const hunkStart = Math.max(0, i - contextLines);
    let hunkEnd = i;
    let trailingContext = 0;
    while (hunkEnd < ops.length) {
      if (ops[hunkEnd].t === 'equal') {
        trailingContext++;
        if (trailingContext > contextLines) break;
      } else {
        trailingContext = 0;
      }
      hunkEnd++;
    }

    let aStart = aLine;
    let bStart = bLine;
    for (let k = i - 1; k >= hunkStart; k--) {
      const op = ops[k];
      if (op.t === 'equal' || op.t === 'del') aStart--;
      if (op.t === 'equal' || op.t === 'add') bStart--;
    }

    let aLen = 0;
    let bLen = 0;
    for (let k = hunkStart; k < hunkEnd; k++) {
      const op = ops[k];
      if (op.t === 'equal' || op.t === 'del') aLen++;
      if (op.t === 'equal' || op.t === 'add') bLen++;
    }

    lines.push(`@@ -${aStart},${aLen} +${bStart},${bLen} @@`);

    for (let k = hunkStart; k < hunkEnd; k++) {
      const op = ops[k];
      if (op.t === 'equal') lines.push(` ${op.line}`);
      if (op.t === 'del') lines.push(`-${op.line}`);
      if (op.t === 'add') lines.push(`+${op.line}`);
    }

    i = hunkEnd;
    consumeEqual(contextLines);
  }

  return lines.join('\n');
}

function diffWorkflow(left: WorkspaceIndexFile, right: WorkspaceIndexFile): { changed: boolean; details?: string; changedSteps: number } {
  const leftSteps = left.steps || [];
  const rightSteps = right.steps || [];
  const leftIds = leftSteps.map((s) => s.id);
  const rightIds = rightSteps.map((s) => s.id);

  const leftSet = new Set(leftIds);
  const rightSet = new Set(rightIds);

  const added = rightIds.filter((id) => !leftSet.has(id));
  const removed = leftIds.filter((id) => !rightSet.has(id));

  let changedSteps = 0;
  const maxLen = Math.max(leftIds.length, rightIds.length);
  for (let i = 0; i < maxLen; i++) {
    if (leftIds[i] !== rightIds[i]) changedSteps++;
  }

  const orderChanged = added.length === 0 && removed.length === 0 && leftIds.join('|') !== rightIds.join('|');
  const changed = added.length > 0 || removed.length > 0 || orderChanged;

  if (!changed) {
    return { changed: false, changedSteps: 0 };
  }

  const parts: string[] = [];
  if (added.length > 0) parts.push(`added: ${added.join(', ')}`);
  if (removed.length > 0) parts.push(`removed: ${removed.join(', ')}`);
  if (orderChanged) parts.push('order: changed');
  return { changed: true, details: parts.join('\n'), changedSteps };
}

function diffEvents(left: WorkspaceIndexFile, right: WorkspaceIndexFile): DiffResult['events'] {
  const leftEvents = left.events || [];
  const rightEvents = right.events || [];
  const leftCount = leftEvents.length;
  const rightCount = rightEvents.length;
  const added = rightCount > leftCount ? rightCount - leftCount : 0;
  const latest = rightEvents[rightEvents.length - 1];
  return {
    leftCount,
    rightCount,
    added,
    ...(latest ? { latestRight: { ts: latest.ts, summary: latest.summary } } : {}),
  };
}

export async function diffWorkspaces(options: DiffOptions): Promise<DiffResult> {
  const leftWs = path.resolve(options.leftWorkspace);
  const rightWs = path.resolve(options.rightWorkspace);

  const leftIndex = await readIndex(leftWs);
  const rightIndex = await readIndex(rightWs);

  const contextLines = typeof options.contextLines === 'number' && options.contextLines >= 0 ? options.contextLines : 3;

  const requestedPaths = options.paths && options.paths.length > 0 ? options.paths : undefined;
  const leftPaths = requestedPaths ? requestedPaths : defaultArtifactPaths(leftIndex);
  const rightPaths = requestedPaths ? requestedPaths : defaultArtifactPaths(rightIndex);
  const paths = uniqueSorted([...leftPaths, ...rightPaths]);

  const results: DiffResult['artifacts'] = [];
  let addedArtifacts = 0;
  let removedArtifacts = 0;
  let changedArtifacts = 0;

  for (const rel of paths) {
    const leftText = await readTextFile(path.join(leftWs, rel));
    const rightText = await readTextFile(path.join(rightWs, rel));
    if (leftText === null && rightText === null) {
      continue;
    }

    if (leftText === null && rightText !== null) {
      addedArtifacts++;
      const diff = formatUnifiedDiff(rel, '', rightText, contextLines);
      results.push({ path: rel, status: 'added', diff });
      continue;
    }

    if (leftText !== null && rightText === null) {
      removedArtifacts++;
      const diff = formatUnifiedDiff(rel, leftText, '', contextLines);
      results.push({ path: rel, status: 'removed', diff });
      continue;
    }

    if (leftText !== rightText) {
      changedArtifacts++;
      const diff = formatUnifiedDiff(rel, leftText, rightText, contextLines);
      results.push({ path: rel, status: 'changed', diff });
      continue;
    }

    results.push({ path: rel, status: 'unchanged' });
  }

  const wf = diffWorkflow(leftIndex, rightIndex);
  const summary = {
    left: { name: leftIndex.workspaceName, path: leftWs },
    right: { name: rightIndex.workspaceName, path: rightWs },
    changedArtifacts,
    addedArtifacts,
    removedArtifacts,
    changedSteps: wf.changedSteps,
  };

  return {
    summary,
    artifacts: results.sort((a, b) => a.path.localeCompare(b.path)),
    workflow: wf.changed ? { changed: true, details: wf.details } : { changed: false },
    events: diffEvents(leftIndex, rightIndex),
  };
}

export function formatDiffResult(result: DiffResult, format: 'text' | 'markdown'): string {
  const lines: string[] = [];
  const s = result.summary;
  lines.push(`left:  ${s.left.name}\t${s.left.path}`);
  lines.push(`right: ${s.right.name}\t${s.right.path}`);
  lines.push(
    `artifacts: changed=${s.changedArtifacts} added=${s.addedArtifacts} removed=${s.removedArtifacts} stepsChanged=${s.changedSteps}`
  );

  if (result.workflow?.changed) {
    lines.push('');
    lines.push('workflow: changed');
    if (result.workflow.details) lines.push(result.workflow.details);
  }

  if (result.events) {
    lines.push('');
    lines.push(`events: left=${result.events.leftCount} right=${result.events.rightCount} added=${result.events.added}`);
    if (result.events.latestRight) {
      lines.push(`latest: ${result.events.latestRight.ts}\t${result.events.latestRight.summary}`);
    }
  }

  for (const a of result.artifacts) {
    if (a.status === 'unchanged') continue;
    lines.push('');
    lines.push(`${a.status}: ${a.path}`);
    if (a.diff) {
      if (format === 'markdown') {
        lines.push('```diff');
        lines.push(a.diff);
        lines.push('```');
      } else {
        lines.push(a.diff);
      }
    }
  }

  return lines.join('\n');
}

