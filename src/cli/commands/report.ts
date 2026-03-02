import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { OperationReporter } from '../../adapters/trae/operation-reporter.js';

type ReportFormat = 'json' | 'markdown' | 'html';

export const reportCommand = new Command('report')
  .description('生成自动化操作报告')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('-f, --format <format>', '报告格式: json, markdown, html', 'markdown')
  .option('-s, --session <id>', '指定 session ID')
  .option('--screenshots', '包含截图', false)
  .option('-o, --output <path>', '输出路径')
  .action(
    async (
      workspace: string,
      options: { format: ReportFormat; session?: string; screenshots: boolean; output?: string }
    ) => {
      const workspacePath = path.resolve(workspace);
      const logDir = path.join(workspacePath, 'operations');

      try {
        let sessionFile: string;
        if (options.session) {
          sessionFile = path.join(logDir, `operations-${options.session}.jsonl`);
        } else {
          const files = await fs.readdir(logDir);
          const jsonlFiles = files
            .filter((f) => f.endsWith('.jsonl'))
            .sort()
            .reverse();
          if (jsonlFiles.length === 0) {
            console.error('Error: no operation logs found');
            process.exit(1);
          }
          sessionFile = path.join(logDir, jsonlFiles[0]);
        }

        const content = await fs.readFile(sessionFile, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim());
        const session = JSON.parse(lines[lines.length - 1]);

        const reporter = new OperationReporter(session);
        const report = reporter.generate({
          format: options.format,
          includeScreenshots: options.screenshots,
        });

        if (options.output) {
          await fs.writeFile(path.resolve(options.output), report, 'utf-8');
          console.log(`✅ Report saved to: ${options.output}`);
        } else {
          console.log(report);
        }
      } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
    }
  );

