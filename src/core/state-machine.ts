import { Workflow } from './models/workflow';
import { State, WorkflowStatus } from './models/state';

export interface StateMachineResult {
  currentIndex: number;
  status: WorkflowStatus;
  nextStepIndex: number | null;
  completedSteps: number[];
  pendingSteps: number[];
}

export function computeState(
  workflow: Workflow,
  stepOutputs: Map<string, boolean>
): StateMachineResult {
  if (!workflow.steps || workflow.steps.length === 0) {
    return {
      currentIndex: 0,
      status: 'done',
      nextStepIndex: null,
      completedSteps: [],
      pendingSteps: [],
    };
  }

  const completedSteps: number[] = [];
  const pendingSteps: number[] = [];
  let currentIndex = 0;
  let status: WorkflowStatus = 'running';

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const outputExists = stepOutputs.get(step.id) ?? false;

    if (outputExists) {
      completedSteps.push(i);
    } else {
      pendingSteps.push(i);
    }
  }

  const firstPendingIndex = pendingSteps[0];

  if (firstPendingIndex === undefined) {
    currentIndex = workflow.steps.length;
    status = 'done';
  } else {
    currentIndex = firstPendingIndex;
    status = 'running';
  }

  return {
    currentIndex,
    status,
    nextStepIndex: status === 'done' ? null : currentIndex,
    completedSteps,
    pendingSteps,
  };
}

export function advanceState(
  state: State,
  workflow: Workflow,
  stepOutputs: Map<string, boolean>
): State {
  const result = computeState(workflow, stepOutputs);

  return {
    ...state,
    currentIndex: result.currentIndex,
    status: result.status,
    updatedAt: new Date().toISOString(),
  };
}

export function isWorkflowComplete(
  workflow: Workflow,
  stepOutputs: Map<string, boolean>
): boolean {
  if (!workflow.steps || workflow.steps.length === 0) {
    return true;
  }

  return workflow.steps.every((step) => stepOutputs.get(step.id) === true);
}

export function getCurrentStep(
  workflow: Workflow,
  stepOutputs: Map<string, boolean>
): { index: number; step: typeof workflow.steps[0] } | null {
  const result = computeState(workflow, stepOutputs);

  if (result.status === 'done' || result.nextStepIndex === null) {
    return null;
  }

  return {
    index: result.nextStepIndex,
    step: workflow.steps[result.nextStepIndex],
  };
}
