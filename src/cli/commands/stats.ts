import { Command } from 'commander';
import path from 'path';
import { listWorkspaces } from '../../core/index/registry.js';
import { buildStats } from '../../core/stats/stats.js';

function isValidFormat(value: string): value is 'json' | 'markdown' {
  return value === 'json' || value === 'markdown';
}

async function resolveWorkspaceToken(token: string): Promise<string> {
  const resolved = path.resolve(token);
  const items = await listWorkspaces().catch(() => []);
  const byName = items.find((i) => i.name === token);
  return byName ? byName.path : resolved;
}

function formatMarkdown(result: Awaited<ReturnType<typeof buildStats>>): string {
  const lines: string[] = [];
  lines.push('| Workspace | Steps | Events | Automation |');
  lines.push('|---|---|---|---|');
  for (const ws of result.workspaces) {
    const steps = `${ws.stepsDone}/${ws.stepsTotal}`;
    const events = `${ws.eventsTotal}`;
    const automation = `${ws.automation?.sessions ?? 0}`;
    lines.push(`| ${ws.workspaceName} | ${steps} | ${events} | ${automation} |`);
  }
  if (result.workspaces.length === 0) {
    lines.push('| - | - | - | - |');
  }
  return lines.join('\n');
}

export const statsCommand = new Command('stats')
  .description('输出 workspace 统计信息')
  .argument('[workspaces...]', 'workspace 路径或 registry name')
  .option('--registry', '统计 registry 中所有 workspace')
  .option('--mode <mode>', 'summary|full', 'summary')
  .option('--format <format>', 'json|markdown', 'markdown')
  .action(
    async (
      workspaces: string[],
      options: { registry?: boolean; mode: string; format: string }
    ) => {
      try {
        const mode = options.mode === 'full' ? 'full' : 'summary';
        const format = isValidFormat(options.format) ? options.format : 'markdown';
        let targets: string[] = [];

        if (options.registry) {
          const items = await listWorkspaces();
          targets = items.map((i) => i.path);
        } else if (workspaces.length > 0) {
          targets = await Promise.all(workspaces.map(resolveWorkspaceToken));
        }

        if (targets.length === 0) {
          console.log('未找到可统计的 workspace');
          return;
        }

        const result = await buildStats({ workspaces: targets, mode });

        if (format === 'json') {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(formatMarkdown(result));
      } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
    }
  );

