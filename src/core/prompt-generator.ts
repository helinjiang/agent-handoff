import { Workflow, Step } from './models/workflow.js';

export interface PromptContext {
  workflow: Workflow;
  step: Step;
  stepIndex: number;
  workspacePath: string;
}

export function generatePrompt(context: PromptContext): string {
  const { workflow, step, stepIndex } = context;
  const totalSteps = workflow.steps.length;
  const stepNum = stepIndex + 1;

  let prompt = `# 任务：${step.id}

## 上下文
- Workflow: ${workflow.name}
- Step: ${stepNum} / ${totalSteps}
- Executor: ${step.executor}`;

  if (step.workItemId) {
    prompt += `\n- Work Item: ${step.workItemId}`;
  }

  prompt += `

## 输入产物
请阅读以下输入产物：
- ${step.input}

## 输出产物
请将结果写入：
- ${step.output}`;

  if (step.acceptance && step.acceptance.length > 0) {
    prompt += `

## 验收标准`;
    for (const criteria of step.acceptance) {
      prompt += `\n- ${criteria}`;
    }
  }

  prompt += `

## 输出要求
完成后请在 output.md 中包含以下区块：
- 产物更新
- 关键决策
- 风险与待确认
- 下一步交接

---
AgentHandoff Step Prompt`;

  return prompt;
}
