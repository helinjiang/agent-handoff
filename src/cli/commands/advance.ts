import { Command } from 'commander';
import path from 'path';
import fs from 'fs/promises';
import { loadWorkspace } from '../../core/workspace.js';
import { computeState, getCurrentStep } from '../../core/state-machine.js';
import { writeEvent } from '../../core/events-writer.js';
import { EventType } from '../../core/models/event.js';

export const advanceCommand = new Command('advance')
  .description('推进 workspace 状态')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('-e, --event <type>', '事件类型', 'step.done')
  .option('-s, --summary <text>', '事件摘要')
  .option('--no-state', '不更新 state.json')
  .option('--skip-event', '不写入事件日志')
  .action(
    async (
      workspace: string,
      options: { event: string; summary?: string; state: boolean; skipEvent: boolean }
    ) => {
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

        console.log(`Workspace: ${info.workflow.name}`);

        if (stateResult.status === 'done') {
          console.log('Status: done');
          console.log('');
          console.log('⚠️  Workflow already completed. No steps to advance.');
          return;
        }

        const currentStep = getCurrentStep(info.workflow, info.stepOutputs);

        if (!currentStep) {
          console.log('Status: done');
          console.log('');
          console.log('⚠️  Workflow already completed. No steps to advance.');
          return;
        }

        const { step, index } = currentStep;

        console.log(`Current step: ${step.id} (index: ${index})`);
        console.log('');

        const eventType = options.event as EventType;
        const eventSummary = options.summary || getDefaultSummary(eventType, step.id);

        if (!options.skipEvent) {
          const result = await writeEvent({
            workspacePath,
            step: { index: index + 1, id: step.id },
            type: eventType,
            summary: eventSummary,
            workItemId: step.workItemId,
            links: [step.output],
          });

          if (result.success) {
            console.log(`✅ Event written: ${eventType}`);
            console.log(`  Summary: ${eventSummary}`);
            if (step.workItemId) {
              console.log(`  Work Item: ${step.workItemId}`);
            }
            if (step.output) {
              console.log(`  Links: ${step.output}`);
            }
          } else {
            console.log(`❌ Failed to write event: ${result.error}`);
          }
        }

        if (options.state) {
          const statePath = path.join(workspacePath, 'state.json');
          const newIndex = index + 1;
          const isDone = newIndex >= info.workflow.steps.length;

          const newState = {
            currentIndex: newIndex,
            status: isDone ? 'done' : 'running',
            updatedAt: new Date().toISOString(),
          };

          await fs.writeFile(statePath, JSON.stringify(newState, null, 2));
          console.log('');
          console.log(`✅ State updated: ${statePath}`);
          console.log(`  Current index: ${newState.currentIndex}`);
          console.log(`  Status: ${newState.status}`);

          if (isDone) {
            console.log('');
            console.log('🎉 Workflow completed!');
          } else {
            const nextStep = info.workflow.steps[newIndex];
            console.log(`  Next step: ${nextStep.id}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
    }
  );

function getDefaultSummary(eventType: EventType, stepId: string): string {
  const summaries: Record<EventType, string> = {
    'step.started': `开始执行步骤: ${stepId}`,
    'step.done': `步骤完成: ${stepId}`,
    'artifact.updated': '产物已更新',
    'workflow.updated': '工作流已更新',
    'verify.passed': '验证通过',
    'verify.failed': '验证失败',
    'accept.passed': '验收通过',
    'accept.failed': '验收失败',
    'issue.raised': '发现问题',
    'handoff.sent': '已交接给下一步',
    'automation.session': '自动化会话已记录',
  };
  return summaries[eventType] || `事件: ${eventType}`;
}
