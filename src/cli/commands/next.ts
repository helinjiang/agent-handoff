import { Command } from 'commander';
import path from 'path';
import { loadWorkspace } from '../../core/workspace.js';
import { computeState, getCurrentStep } from '../../core/state-machine.js';
import { generatePrompt } from '../../core/prompt-generator.js';

export const nextCommand = new Command('next')
  .description('输出下一步执行指令和 prompt')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('-c, --copy', '复制 prompt 到剪贴板（v0.2）')
  .action(async (workspace: string, options: { copy: boolean }) => {
    const workspacePath = path.resolve(workspace);

    try {
      const info = await loadWorkspace(workspacePath);

      if (!info.exists) {
        console.error(`Error: workspace not found: ${workspacePath}`);
        process.exit(1);
      }

      if (!info.hasWorkflow) {
        console.error(`Error: workflow.yaml not found in ${workspacePath}`);
        process.exit(1);
      }

      if (!info.workflow) {
        console.error(`Error: failed to parse workflow.yaml`);
        process.exit(1);
      }

      const stateResult = computeState(info.workflow, info.stepOutputs);

      if (stateResult.status === 'done') {
        console.log(`Workflow "${info.workflow.name}" 已完成所有步骤。`);
        console.log('无下一步操作。');
        return;
      }

      const currentStep = getCurrentStep(info.workflow, info.stepOutputs);

      if (!currentStep) {
        console.log(`Workflow "${info.workflow.name}" 已完成所有步骤。`);
        console.log('无下一步操作。');
        return;
      }

      const { step, index } = currentStep;

      console.log(`Step: ${step.id}`);
      console.log(`Executor: ${step.executor}`);
      if (step.workItemId) {
        console.log(`Work Item: ${step.workItemId}`);
      }
      console.log('');
      console.log('Input:');
      console.log(`  - ${step.input}`);
      console.log('');
      console.log('Output:');
      console.log(`  - ${step.output}`);
      console.log('');
      console.log('Prompt:');
      console.log('────────────────────────────────────────');

      const prompt = generatePrompt({
        workflow: info.workflow,
        step,
        stepIndex: index,
        workspacePath: info.path,
      });

      console.log(prompt);
      console.log('────────────────────────────────────────');
      console.log('');
      console.log('提示：将上述 Prompt 复制到 TRAE 新 Task 中执行');

      if (options.copy) {
        console.log('');
        console.log('注意：剪贴板功能将在 v0.2 版本实现');
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });
