import { describe, it, expect } from 'vitest';
import { generatePrompt, PromptContext } from '../../src/core/prompt-generator';
import { Step, Workflow } from '../../src/core/models/workflow';

describe('prompt-generator', () => {
  it('should generate prompt with all sections', () => {
    const step: Step = {
      id: 'test-step',
      executor: 'trae',
      input: 'brief.md',
      output: 'steps/01-test-step/output.md',
      acceptance: ['验收点1', '验收点2'],
    };
    const workflow: Workflow = { name: 'test', steps: [step] };

    const prompt = generatePrompt({
      workflow,
      step,
      stepIndex: 0,
      workspacePath: '/test',
    });

    expect(prompt).toContain('# 任务：test-step');
    expect(prompt).toContain('Workflow: test');
    expect(prompt).toContain('Step: 1 / 1');
    expect(prompt).toContain('Executor: trae');
    expect(prompt).toContain('brief.md');
    expect(prompt).toContain('steps/01-test-step/output.md');
    expect(prompt).toContain('验收点1');
    expect(prompt).toContain('验收点2');
    expect(prompt).toContain('AgentRelay Step Prompt');
  });

  it('should include workItemId when present', () => {
    const step: Step = {
      id: 'login-implement',
      executor: 'trae',
      input: 'steps/02-b-plan/output.md',
      output: 'steps/03-login-implement/output.md',
      workItemId: 'login',
    };
    const workflow: Workflow = { name: 'demo', steps: [step] };

    const prompt = generatePrompt({
      workflow,
      step,
      stepIndex: 0,
      workspacePath: '/test',
    });

    expect(prompt).toContain('Work Item: login');
  });

  it('should handle step without acceptance criteria', () => {
    const step: Step = {
      id: 'simple-step',
      executor: 'trae',
      input: 'input.md',
      output: 'output.md',
    };
    const workflow: Workflow = { name: 'test', steps: [step] };

    const prompt = generatePrompt({
      workflow,
      step,
      stepIndex: 0,
      workspacePath: '/test',
    });

    expect(prompt).not.toContain('## 验收标准');
  });

  it('should show correct step number', () => {
    const step: Step = {
      id: 'third-step',
      executor: 'trae',
      input: 'input.md',
      output: 'output.md',
    };
    const workflow: Workflow = {
      name: 'test',
      steps: [
        { id: 'step1', executor: 'trae', input: 'a', output: 'b' },
        { id: 'step2', executor: 'trae', input: 'a', output: 'b' },
        step,
      ],
    };

    const prompt = generatePrompt({
      workflow,
      step,
      stepIndex: 2,
      workspacePath: '/test',
    });

    expect(prompt).toContain('Step: 3 / 3');
  });
});
