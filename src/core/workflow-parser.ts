import fs from 'fs/promises';
import YAML from 'yaml';
import { Workflow, Step, Executor } from './models/workflow';

export async function parseWorkflow(filePath: string): Promise<Workflow> {
  const content = await fs.readFile(filePath, 'utf-8');
  const parsed = YAML.parse(content);
  
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Invalid workflow.yaml: ${filePath}`);
  }
  
  if (!parsed.name || typeof parsed.name !== 'string') {
    throw new Error('workflow.yaml missing required field: name');
  }
  
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error('workflow.yaml missing required field: steps (non-empty array)');
  }
  
  const steps: Step[] = parsed.steps.map((step: Record<string, unknown>, index: number) => {
    if (!step.id || typeof step.id !== 'string') {
      throw new Error(`Step ${index} missing required field: id`);
    }
    if (!step.executor || typeof step.executor !== 'string') {
      throw new Error(`Step ${index} missing required field: executor`);
    }
    if (!step.input || typeof step.input !== 'string') {
      throw new Error(`Step ${index} missing required field: input`);
    }
    if (!step.output || typeof step.output !== 'string') {
      throw new Error(`Step ${index} missing required field: output`);
    }
    
    return {
      id: step.id,
      executor: step.executor as Executor,
      input: step.input,
      output: step.output,
      workItemId: step.workItemId as string | undefined,
      acceptance: step.acceptance as string[] | undefined,
    };
  });
  
  return {
    name: parsed.name,
    steps,
  };
}

export function validateWorkflow(workflow: Workflow): string[] {
  const errors: string[] = [];
  
  if (!workflow.name || workflow.name.trim() === '') {
    errors.push('workflow.name is required');
  }
  
  if (!workflow.steps || workflow.steps.length === 0) {
    errors.push('workflow.steps is required and must be non-empty');
    return errors;
  }
  
  workflow.steps.forEach((step, index) => {
    if (!step.id || step.id.trim() === '') {
      errors.push(`steps[${index}].id is required`);
    }
    if (!step.executor) {
      errors.push(`steps[${index}].executor is required`);
    }
    if (!step.input || step.input.trim() === '') {
      errors.push(`steps[${index}].input is required`);
    }
    if (!step.output || step.output.trim() === '') {
      errors.push(`steps[${index}].output is required`);
    }
    if (!step.output.startsWith('steps/')) {
      errors.push(`steps[${index}].output should start with 'steps/'`);
    }
  });
  
  return errors;
}
