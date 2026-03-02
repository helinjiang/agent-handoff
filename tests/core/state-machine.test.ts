import { describe, it, expect } from 'vitest';
import { computeState, advanceState, isWorkflowComplete, getCurrentStep } from '../../src/core/state-machine';
import { Workflow } from '../../src/core/models/workflow';
import { State } from '../../src/core/models/state';

describe('state-machine', () => {
  const workflow: Workflow = {
    name: 'test',
    steps: [
      { id: 'step1', executor: 'trae', input: 'brief.md', output: 'steps/01-step1/output.md' },
      { id: 'step2', executor: 'trae', input: 'steps/01-step1/output.md', output: 'steps/02-step2/output.md' },
      { id: 'step3', executor: 'trae', input: 'steps/02-step2/output.md', output: 'steps/03-step3/output.md' },
    ],
  };

  describe('computeState', () => {
    it('should return done when all steps complete', () => {
      const outputs = new Map([
        ['step1', true],
        ['step2', true],
        ['step3', true],
      ]);
      const result = computeState(workflow, outputs);
      expect(result.status).toBe('done');
      expect(result.nextStepIndex).toBeNull();
      expect(result.currentIndex).toBe(3);
      expect(result.completedSteps).toEqual([0, 1, 2]);
      expect(result.pendingSteps).toEqual([]);
    });

    it('should return running when first step incomplete', () => {
      const outputs = new Map([
        ['step1', false],
        ['step2', false],
        ['step3', false],
      ]);
      const result = computeState(workflow, outputs);
      expect(result.status).toBe('running');
      expect(result.currentIndex).toBe(0);
      expect(result.nextStepIndex).toBe(0);
      expect(result.completedSteps).toEqual([]);
      expect(result.pendingSteps).toEqual([0, 1, 2]);
    });

    it('should return running when middle step incomplete', () => {
      const outputs = new Map([
        ['step1', true],
        ['step2', false],
        ['step3', false],
      ]);
      const result = computeState(workflow, outputs);
      expect(result.status).toBe('running');
      expect(result.currentIndex).toBe(1);
      expect(result.nextStepIndex).toBe(1);
      expect(result.completedSteps).toEqual([0]);
      expect(result.pendingSteps).toEqual([1, 2]);
    });

    it('should handle empty workflow', () => {
      const emptyWorkflow: Workflow = { name: 'empty', steps: [] };
      const outputs = new Map();
      const result = computeState(emptyWorkflow, outputs);
      expect(result.status).toBe('done');
      expect(result.currentIndex).toBe(0);
    });

    it('should handle single step workflow complete', () => {
      const singleWorkflow: Workflow = {
        name: 'single',
        steps: [{ id: 'only', executor: 'trae', input: 'brief.md', output: 'steps/01-only/output.md' }],
      };
      const outputs = new Map([['only', true]]);
      const result = computeState(singleWorkflow, outputs);
      expect(result.status).toBe('done');
    });

    it('should handle single step workflow incomplete', () => {
      const singleWorkflow: Workflow = {
        name: 'single',
        steps: [{ id: 'only', executor: 'trae', input: 'brief.md', output: 'steps/01-only/output.md' }],
      };
      const outputs = new Map([['only', false]]);
      const result = computeState(singleWorkflow, outputs);
      expect(result.status).toBe('running');
      expect(result.currentIndex).toBe(0);
    });
  });

  describe('advanceState', () => {
    it('should advance state when step completes', () => {
      const state: State = {
        currentIndex: 0,
        status: 'running',
        updatedAt: '2026-03-01T00:00:00+08:00',
      };
      const outputs = new Map([
        ['step1', true],
        ['step2', false],
        ['step3', false],
      ]);
      const newState = advanceState(state, workflow, outputs);
      expect(newState.currentIndex).toBe(1);
      expect(newState.status).toBe('running');
      expect(newState.updatedAt).not.toBe('2026-03-01T00:00:00+08:00');
    });

    it('should mark done when all steps complete', () => {
      const state: State = {
        currentIndex: 2,
        status: 'running',
        updatedAt: '2026-03-01T00:00:00+08:00',
      };
      const outputs = new Map([
        ['step1', true],
        ['step2', true],
        ['step3', true],
      ]);
      const newState = advanceState(state, workflow, outputs);
      expect(newState.status).toBe('done');
    });
  });

  describe('isWorkflowComplete', () => {
    it('should return true when all steps complete', () => {
      const outputs = new Map([
        ['step1', true],
        ['step2', true],
        ['step3', true],
      ]);
      expect(isWorkflowComplete(workflow, outputs)).toBe(true);
    });

    it('should return false when some steps incomplete', () => {
      const outputs = new Map([
        ['step1', true],
        ['step2', false],
        ['step3', false],
      ]);
      expect(isWorkflowComplete(workflow, outputs)).toBe(false);
    });

    it('should return true for empty workflow', () => {
      const emptyWorkflow: Workflow = { name: 'empty', steps: [] };
      expect(isWorkflowComplete(emptyWorkflow, new Map())).toBe(true);
    });
  });

  describe('getCurrentStep', () => {
    it('should return current step when running', () => {
      const outputs = new Map([
        ['step1', true],
        ['step2', false],
        ['step3', false],
      ]);
      const current = getCurrentStep(workflow, outputs);
      expect(current).not.toBeNull();
      expect(current?.index).toBe(1);
      expect(current?.step.id).toBe('step2');
    });

    it('should return null when done', () => {
      const outputs = new Map([
        ['step1', true],
        ['step2', true],
        ['step3', true],
      ]);
      const current = getCurrentStep(workflow, outputs);
      expect(current).toBeNull();
    });
  });
});
