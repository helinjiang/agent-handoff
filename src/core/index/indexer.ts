import fs from 'fs/promises';
import path from 'path';
import { loadWorkspace, fileExists } from '../workspace.js';
import { readEventsJsonl, toTimelineItems } from '../events-reader.js';
import { WorkspaceIndex, WorkspaceIndexArtifact } from './types.js';

async function readPreview(filePath: string, maxChars: number): Promise<string | undefined> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const sliced = content.slice(0, maxChars);
    return sliced;
  } catch {
    return undefined;
  }
}

async function statInfo(filePath: string): Promise<{ bytes?: number; updatedAt?: string }> {
  try {
    const st = await fs.stat(filePath);
    return { bytes: st.size, updatedAt: st.mtime.toISOString() };
  } catch {
    return {};
  }
}

async function addArtifact(
  workspacePath: string,
  relPath: string,
  kind: WorkspaceIndexArtifact['kind']
): Promise<WorkspaceIndexArtifact> {
  const full = path.join(workspacePath, relPath);
  const exists = await fileExists(full);
  if (!exists) {
    return { path: relPath, kind };
  }

  const { bytes, updatedAt } = await statInfo(full);
  const preview = await readPreview(full, 2000);
  return { path: relPath, kind, bytes, updatedAt, ...(preview !== undefined && { preview }) };
}

export async function buildWorkspaceIndex(workspacePath: string): Promise<WorkspaceIndex> {
  const info = await loadWorkspace(workspacePath);
  if (!info.exists) {
    throw new Error(`workspace not found: ${path.resolve(workspacePath)}`);
  }
  if (!info.hasWorkflow || !info.workflow) {
    throw new Error(`workflow.yaml not found in ${path.resolve(workspacePath)}`);
  }

  const abs = info.path;
  const indexedAt = new Date().toISOString();
  const workspaceName = path.basename(abs);

  const steps = await Promise.all(
    info.workflow.steps.map(async (step, i) => {
      const outputRel = step.output;
      const outputFull = path.join(abs, outputRel);
      const outputExists = await fileExists(outputFull);
      return { id: step.id, index: i + 1, outputPath: outputRel, outputExists };
    })
  );

  const artifacts: WorkspaceIndexArtifact[] = [];

  const briefRel = 'brief.md';
  if (await fileExists(path.join(abs, briefRel))) {
    artifacts.push(await addArtifact(abs, briefRel, 'brief'));
  }

  for (const step of info.workflow.steps) {
    const rel = step.output;
    artifacts.push(await addArtifact(abs, rel, 'step.output'));
  }

  const { events } = await readEventsJsonl({ workspacePath: abs });
  const items = toTimelineItems(events);
  const indexedEvents = items.map((item) => ({
    ts: item.ts,
    stepId: item.stepId,
    stepIndex: item.stepIndex,
    type: item.type,
    summary: item.summary,
    ...(item.workItemId && { workItemId: item.workItemId }),
    ...(item.links && item.links.length > 0 && { links: item.links }),
  }));

  return {
    version: 1,
    workspacePath: abs,
    workspaceName,
    indexedAt,
    workflowName: info.workflow.name,
    steps,
    artifacts,
    events: indexedEvents,
  };
}

