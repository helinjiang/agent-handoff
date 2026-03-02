import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { loadWorkspace } from '../../core/workspace.js';
import { buildWorkspaceIndex } from '../../core/index/indexer.js';
import { listWorkspaces, registerWorkspace, unregisterWorkspace } from '../../core/index/registry.js';

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export const indexCommand = new Command('index')
  .description('生成 workspace 索引，并支持 registry 管理')
  .argument('[workspace]', 'workspace 路径', '.')
  .option('--add', '将 workspace 加入 registry')
  .option('--list', '列出 registry 中的 workspaces')
  .option('--remove <pathOrName>', '从 registry 删除 workspace（path 或 name）')
  .option('--output <file>', '输出索引文件路径（默认 <workspace>/.agenthandoff/index.json）')
  .option('--json', '以 JSON 输出结果到 stdout')
  .action(
    async (
      workspace: string,
      options: { add?: boolean; list?: boolean; remove?: string; output?: string; json?: boolean }
    ) => {
      try {
        if (options.list) {
          const items = await listWorkspaces();
          if (options.json) {
            console.log(JSON.stringify(items, null, 2));
            return;
          }
          if (items.length === 0) {
            console.log('Registry is empty');
            return;
          }
          for (const item of items) {
            console.log(`${item.name}\t${item.path}`);
          }
          return;
        }

        if (options.remove) {
          await unregisterWorkspace(options.remove);
          console.log(`✅ Removed from registry: ${options.remove}`);
          return;
        }

        const workspacePath = path.resolve(workspace);
        const info = await loadWorkspace(workspacePath);
        if (!info.exists) {
          console.error(`Error: workspace not found: ${workspacePath}`);
          process.exit(1);
        }
        if (!info.hasWorkflow || !info.workflow) {
          console.error(`Error: workflow.yaml not found in ${workspacePath}`);
          process.exit(1);
        }

        if (options.add) {
          await registerWorkspace(workspacePath, info.workflow.name);
        }

        const index = await buildWorkspaceIndex(workspacePath);
        const outputFile = options.output
          ? path.resolve(options.output)
          : path.join(workspacePath, '.agenthandoff', 'index.json');

        await ensureDir(path.dirname(outputFile));
        await fs.writeFile(outputFile, JSON.stringify(index, null, 2) + '\n', 'utf-8');

        if (options.json) {
          console.log(JSON.stringify(index, null, 2));
          return;
        }

        console.log(`✅ Indexed: ${workspacePath}`);
        console.log(`  output: ${outputFile}`);
        console.log(`  steps: ${index.steps.length}`);
        console.log(`  artifacts: ${index.artifacts.length}`);
        console.log(`  events: ${index.events.length}`);
      } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
    }
  );

