import { describe, it, expect } from 'vitest';
import { Step, Workflow } from '../../../src/core/models/workflow';

describe('Workflow types', () => {
  it('should define Step type correctly', () => {
    const step: Step = {
      id: 'test-step',
      executor: 'trae',
      input: 'brief.md',
      output: 'steps/01-test-step/output.md',
    };
    expect(step.id).toBe('test-step');
    expect(step.executor).toBe('trae');
  });

  it('should define Step with optional fields', () => {
    const step: Step = {
      id: 'login-implement',
      executor: 'trae',
      input: 'steps/02-b-plan/output.md',
      output: 'steps/03-login-implement/output.md',
      workItemId: 'login',
      acceptance: ['实现注册/登录/登出/受保护接口'],
    };
    expect(step.workItemId).toBe('login');
    expect(step.acceptance).toHaveLength(1);
  });

  it('should define Workflow type correctly', () => {
    const workflow: Workflow = {
      name: 'demo-login',
      steps: [
        { id: 'clarify', executor: 'trae', input: 'brief.md', output: 'steps/01-clarify/output.md' },
        { id: 'implement', executor: 'trae', input: 'steps/01-clarify/output.md', output: 'steps/02-implement/output.md' },
      ],
    };
    expect(workflow.name).toBe('demo-login');
    expect(workflow.steps).toHaveLength(2);
  });
});
