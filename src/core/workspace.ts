import fs from 'fs/promises';
import path from 'path';
import { Workflow } from './models/workflow.js';
import { State } from './models/state.js';
import { parseWorkflow } from './workflow-parser.js';

export interface WorkspaceInfo {
  path: string;
  exists: boolean;
  hasWorkflow: boolean;
  hasState: boolean;
  workflow?: Workflow;
  state?: State;
  stepOutputs: Map<string, boolean>;
}

export async function loadWorkspace(workspacePath: string): Promise<WorkspaceInfo> {
  const absolutePath = path.resolve(workspacePath);
  const workflowPath = path.join(absolutePath, 'workflow.yaml');
  const statePath = path.join(absolutePath, 'state.json');

  let exists = false;
  let hasWorkflow = false;
  let hasState = false;
  let workflow: Workflow | undefined;
  let state: State | undefined;
  let stepOutputs = new Map<string, boolean>();

  try {
    await fs.access(absolutePath);
    exists = true;
  } catch {
    return {
      path: absolutePath,
      exists: false,
      hasWorkflow: false,
      hasState: false,
      stepOutputs,
    };
  }

  try {
    await fs.access(workflowPath);
    hasWorkflow = true;
    workflow = await parseWorkflow(workflowPath);
  } catch {
    hasWorkflow = false;
  }

  try {
    const stateContent = await fs.readFile(statePath, 'utf-8');
    hasState = true;
    state = JSON.parse(stateContent) as State;
  } catch {
    hasState = false;
  }

  if (workflow) {
    stepOutputs = await detectStepOutputs(absolutePath, workflow);
  }

  return {
    path: absolutePath,
    exists,
    hasWorkflow,
    hasState,
    workflow,
    state,
    stepOutputs,
  };
}

export async function detectStepOutputs(
  workspacePath: string,
  workflow: Workflow
): Promise<Map<string, boolean>> {
  const outputs = new Map<string, boolean>();

  for (const step of workflow.steps) {
    const outputPath = path.join(workspacePath, step.output);
    try {
      const content = await fs.readFile(outputPath, 'utf-8');
      outputs.set(step.id, content.trim().length > 0);
    } catch {
      outputs.set(step.id, false);
    }
  }

  return outputs;
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function fileNotEmpty(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.trim().length > 0;
  } catch {
    return false;
  }
}
