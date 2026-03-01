import { Command } from 'commander';
import path from 'path';
import { loadWorkspace } from '../../core/workspace.js';
import { computeState } from '../../core/state-machine.js';

export const statusCommand = new Command('status')
  .description('显示 workspace 状态')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('-j, --json', 'JSON 格式输出')
  .action(async (workspace: string, options: { json: boolean }) => {
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

      if (options.json) {
        const jsonOutput = {
          name: info.workflow.name,
          path: workspacePath,
          status: stateResult.status,
          currentIndex: stateResult.currentIndex,
          totalSteps: info.workflow.steps.length,
          completedSteps: stateResult.completedSteps.length,
          steps: info.workflow.steps.map((step, index) => ({
            index,
            id: step.id,
            executor: step.executor,
            workItemId: step.workItemId,
            completed: info.stepOutputs.get(step.id) ?? false,
          })),
        };
        console.log(JSON.stringify(jsonOutput, null, 2));
      } else {
        console.log(`Workspace: ${info.workflow.name}`);
        console.log(`Status: ${stateResult.status}`);
        console.log('');
        console.log('Steps:');

        info.workflow.steps.forEach((step, index) => {
          const completed = info.stepOutputs.get(step.id) ?? false;
          const statusIcon = completed ? '✅' : '⬜';
          const stepNum = String(index + 1).padStart(2, '0');
          let line = `  ${statusIcon} ${stepNum}-${step.id} (${step.executor})`;
          if (step.workItemId) {
            line += ` [${step.workItemId}]`;
          }
          console.log(line);
        });

        console.log('');
        if (stateResult.status === 'done') {
          console.log('Current: completed');
        } else {
          const currentStep = info.workflow.steps[stateResult.currentIndex];
          console.log(`Current: step ${stateResult.currentIndex + 1} (${currentStep?.id})`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });
