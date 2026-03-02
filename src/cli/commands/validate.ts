import { Command } from 'commander';
import path from 'path';
import { loadWorkspace } from '../../core/workspace.js';
import { validateWorkspaceArtifacts } from '../../core/artifact-validator.js';

export const validateCommand = new Command('validate')
  .description('校验 workspace 产物结构')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('--strict', '严格模式（将警告视为错误）')
  .option('-j, --json', 'JSON 格式输出')
  .action(async (workspace: string, options: { strict: boolean; json: boolean }) => {
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

      const result = await validateWorkspaceArtifacts(workspacePath);

      if (options.json) {
        const jsonOutput = {
          valid: options.strict ? result.valid && result.warningCount === 0 : result.valid,
          workspace: workspacePath,
          totalSteps: result.totalSteps,
          validSteps: result.validSteps,
          errorCount: result.errorCount,
          warningCount: result.warningCount,
          steps: Array.from(result.stepResults.entries()).map(([stepId, stepResult]) => ({
            stepId,
            valid: options.strict ? stepResult.valid && stepResult.warnings.length === 0 : stepResult.valid,
            errors: stepResult.errors,
            warnings: stepResult.warnings,
          })),
        };
        console.log(JSON.stringify(jsonOutput, null, 2));
      } else {
        console.log(`Workspace: ${info.workflow.name}`);
        console.log('');

        for (const step of info.workflow.steps) {
          const stepResult = result.stepResults.get(step.id);
          if (!stepResult) continue;

          const icon = stepResult.valid ? '✅' : '❌';
          console.log(`${icon} ${step.output} - ${stepResult.valid ? 'Valid' : 'Invalid'}`);

          if (!stepResult.valid) {
            for (const error of stepResult.errors) {
              console.log(`   - ${error.message}`);
            }
          }

          if (stepResult.warnings.length > 0) {
            for (const warning of stepResult.warnings) {
              console.log(`   ⚠️  ${warning.message}`);
            }
          }
        }

        console.log('');

        const hasErrors = result.errorCount > 0;
        const hasWarnings = result.warningCount > 0;
        const strictFail = options.strict && hasWarnings;

        if (!hasErrors && !strictFail) {
          console.log('All artifacts validated successfully.');
          if (hasWarnings) {
            console.log(`⚠️  ${result.warningCount} warning(s) found.`);
          }
        } else {
          const totalErrors = result.errorCount + (strictFail ? result.warningCount : 0);
          console.log(`Validation failed with ${totalErrors} error(s).`);
        }

        if (hasErrors || strictFail) {
          process.exit(1);
        }
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });
