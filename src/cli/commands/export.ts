import { Command } from 'commander';
import path from 'path';
import { loadWorkspace } from '../../core/workspace.js';
import { exportWebTimeline } from '../../export/web/exporter.js';

export const exportCommand = new Command('export')
  .description('导出静态产物（例如 Web Timeline）')
  .argument('[workspace]', 'workspace 路径', '.')
  .requiredOption('--format <format>', '导出格式: web', 'web')
  .option('-o, --output <dir>', '导出目录（默认 <workspace>/timeline）')
  .option('--limit <n>', '只导出最近 n 条事件', (v) => parseInt(v, 10))
  .action(
    async (
      workspace: string,
      options: { format: string; output?: string; limit?: number }
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

        if (options.format !== 'web') {
          console.error(`Error: unsupported format: ${options.format}`);
          process.exit(1);
        }

        const outputDir = options.output
          ? path.resolve(options.output)
          : path.join(workspacePath, 'timeline');

        const result = await exportWebTimeline({
          workspacePath,
          outputDir,
          limit: options.limit,
        });

        console.log(`✅ Exported to: ${result.outputDir}`);
        console.log(`  index: ${result.indexPath}`);
        console.log(`  events: ${result.eventsCount} (invalid lines: ${result.invalidLines})`);
        console.log(`  artifacts: ${result.artifactsCount}`);
        console.log('');
        console.log(`打开方式（macOS）：open ${path.join(result.outputDir, 'index.html')}`);
      } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
    }
  );

