import { Command } from 'commander';
import path from 'path';
import { listWorkspaces } from '../../core/index/registry.js';
import { diffWorkspaces, formatDiffResult } from '../../core/diff/diff.js';

function collect(value: string, previous: string[] = []): string[] {
  return previous.concat([value]);
}

async function resolveWorkspaceToken(token: string): Promise<string> {
  const resolved = path.resolve(token);
  const items = await listWorkspaces().catch(() => []);
  const byName = items.find((i) => i.name === token);
  if (byName) return byName.path;
  return resolved;
}

export const diffCommand = new Command('diff')
  .description('对两个 workspace 进行 diff（基于 index.json）')
  .argument('<left>', '左侧 workspace（path 或 registry name）')
  .argument('<right>', '右侧 workspace（path 或 registry name）')
  .option('--format <format>', '输出格式：text|markdown|json', 'text')
  .option('--path <path>', '仅对指定文件做 diff（可重复）', collect, [])
  .option('--context <n>', 'diff context 行数', (v) => parseInt(v, 10))
  .action(
    async (
      left: string,
      right: string,
      options: { format: string; path?: string[]; context?: number }
    ) => {
      try {
        const leftPath = await resolveWorkspaceToken(left);
        const rightPath = await resolveWorkspaceToken(right);
        const format = options.format === 'markdown' || options.format === 'json' ? options.format : 'text';
        const paths = options.path && options.path.length > 0 ? options.path : undefined;

        const result = await diffWorkspaces({
          leftWorkspace: leftPath,
          rightWorkspace: rightPath,
          format,
          paths,
          contextLines: options.context,
        });

        if (format === 'json') {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(formatDiffResult(result, format));
      } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
    }
  );
