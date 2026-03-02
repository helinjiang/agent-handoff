export type Executor = 'trae' | 'shell' | 'manual' | 'api';

export interface Step {
  id: string;
  executor: Executor;
  input: string;
  output: string;
  workItemId?: string;
  acceptance?: string[];
}

export interface Workflow {
  name: string;
  steps: Step[];
}
