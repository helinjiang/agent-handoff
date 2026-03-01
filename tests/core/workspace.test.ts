import { describe, it, expect } from 'vitest';
import { loadWorkspace, detectStepOutputs, fileExists, fileNotEmpty } from '../../src/core/workspace';
import { parseWorkflow, validateWorkflow } from '../../src/core/workflow-parser';
import path from 'path';

const demoLoginPath = path.resolve('examples/workspaces/demo-login');

describe('parseWorkflow', () => {
  it('should parse demo-login workflow.yaml', async () => {
    const workflow = await parseWorkflow(path.join(demoLoginPath, 'workflow.yaml'));
    expect(workflow.name).toBe('demo-login');
    expect(workflow.steps.length).toBe(6);
  });

  it('should parse step with all fields', async () => {
    const workflow = await parseWorkflow(path.join(demoLoginPath, 'workflow.yaml'));
    const loginImplement = workflow.steps.find(s => s.id === 'login-implement');
    expect(loginImplement).toBeDefined();
    expect(loginImplement?.executor).toBe('trae');
    expect(loginImplement?.workItemId).toBe('login');
    expect(loginImplement?.acceptance).toBeDefined();
    expect(loginImplement?.acceptance?.length).toBeGreaterThan(0);
  });

  it('should throw error for missing file', async () => {
    await expect(parseWorkflow('/nonexistent/workflow.yaml')).rejects.toThrow();
  });
});

describe('validateWorkflow', () => {
  it('should return empty errors for valid workflow', () => {
    const workflow = {
      name: 'test',
      steps: [
        { id: 'step1', executor: 'trae' as const, input: 'brief.md', output: 'steps/01-step1/output.md' },
      ],
    };
    const errors = validateWorkflow(workflow);
    expect(errors).toHaveLength(0);
  });

  it('should return error for missing name', () => {
    const workflow = {
      name: '',
      steps: [
        { id: 'step1', executor: 'trae' as const, input: 'brief.md', output: 'steps/01-step1/output.md' },
      ],
    };
    const errors = validateWorkflow(workflow);
    expect(errors.some(e => e.includes('name'))).toBe(true);
  });

  it('should return error for output not starting with steps/', () => {
    const workflow = {
      name: 'test',
      steps: [
        { id: 'step1', executor: 'trae' as const, input: 'brief.md', output: 'output.md' },
      ],
    };
    const errors = validateWorkflow(workflow);
    expect(errors.some(e => e.includes("should start with 'steps/'"))).toBe(true);
  });
});

describe('loadWorkspace', () => {
  it('should load demo-login workspace', async () => {
    const info = await loadWorkspace(demoLoginPath);
    expect(info.exists).toBe(true);
    expect(info.hasWorkflow).toBe(true);
    expect(info.hasState).toBe(true);
    expect(info.workflow?.name).toBe('demo-login');
    expect(info.workflow?.steps.length).toBe(6);
  });

  it('should detect step outputs', async () => {
    const info = await loadWorkspace(demoLoginPath);
    expect(info.stepOutputs.size).toBe(6);
    for (const [stepId, exists] of info.stepOutputs) {
      expect(exists).toBe(true);
    }
  });

  it('should return exists=false for nonexistent workspace', async () => {
    const info = await loadWorkspace('/nonexistent/workspace');
    expect(info.exists).toBe(false);
    expect(info.hasWorkflow).toBe(false);
    expect(info.hasState).toBe(false);
  });
});

describe('detectStepOutputs', () => {
  it('should detect all outputs for demo-login', async () => {
    const workflow = await parseWorkflow(path.join(demoLoginPath, 'workflow.yaml'));
    const outputs = await detectStepOutputs(demoLoginPath, workflow);
    expect(outputs.size).toBe(6);
    outputs.forEach((exists) => {
      expect(exists).toBe(true);
    });
  });
});

describe('fileExists and fileNotEmpty', () => {
  it('should return true for existing file', async () => {
    const exists = await fileExists(path.join(demoLoginPath, 'workflow.yaml'));
    expect(exists).toBe(true);
  });

  it('should return false for nonexistent file', async () => {
    const exists = await fileExists('/nonexistent/file.txt');
    expect(exists).toBe(false);
  });

  it('should return true for non-empty file', async () => {
    const notEmpty = await fileNotEmpty(path.join(demoLoginPath, 'workflow.yaml'));
    expect(notEmpty).toBe(true);
  });
});
