import { Command } from 'commander';
import path from 'path';
import { loadWorkspace } from '../../core/workspace.js';
import { computeState, getCurrentStep } from '../../core/state-machine.js';
import { generatePrompt } from '../../core/prompt-generator.js';
import { copyToClipboard, isClipboardSupported } from '../../core/clipboard.js';
import { writeEvent } from '../../core/events-writer.js';

export const nextCommand = new Command('next')
  .description('输出下一步执行指令和 prompt')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('-c, --copy', '复制 prompt 到剪贴板')
  .option('--no-event', '不写入事件日志')
  .action(async (workspace: string, options: { copy: boolean; event: boolean }) => {
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

      if (options.event) {
        await writeEvent({
          workspacePath,
          step: { index: index + 1, id: step.id },
          type: 'step.started',
          summary: `开始执行步骤: ${step.id}`,
          workItemId: step.workItemId,
          links: [step.input],
        });
      }

      if (options.copy) {
        if (!isClipboardSupported()) {
          console.log('⚠️  剪贴板功能在当前环境不可用');
          console.log('请手动复制上面的 Prompt');
        } else {
          const result = await copyToClipboard(prompt);
          if (result.success) {
            console.log('✅ Prompt 已复制到剪贴板');
          } else {
            console.log(`❌ 复制失败: ${result.error}`);
            console.log('请手动复制上面的 Prompt');
          }
        }
      } else {
        console.log('提示：将上述 Prompt 复制到 TRAE 新 Task 中执行');
        console.log('      使用 --copy 选项可自动复制到剪贴板');
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });
