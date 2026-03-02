import { Command } from 'commander';
import { listWorkspaces } from '../../core/index/registry.js';
import { search } from '../../core/search/search.js';

function collect(value: string, previous: string[] = []): string[] {
  return previous.concat([value]);
}

export const searchCommand = new Command('search')
  .description('在 workspace 索引上执行搜索')
  .argument('<query>', '搜索关键词')
  .option('--workspace <pathOrName>', '指定 workspace（可重复）', collect, [])
  .option('--step <id>', '筛选 stepId（可重复）', collect, [])
  .option('--type <type>', '筛选事件类型（可重复）', collect, [])
  .option('--work-item <id>', '筛选 workItemId（可重复）', collect, [])
  .option('--limit <n>', '限制结果数量', (v) => parseInt(v, 10))
  .option('--json', '以 JSON 输出结果')
  .action(
    async (
      query: string,
      options: {
        workspace?: string[];
        step?: string[];
        type?: string[];
        workItem?: string[];
        limit?: number;
        json?: boolean;
      }
    ) => {
      try {
        const registryItems = await listWorkspaces();
        const workspaces = options.workspace || [];
        const registryOnly = workspaces.length === 0;
        const results = await search(
          {
            q: query,
            workspace: workspaces,
            stepId: options.step,
            type: options.type,
            workItemId: options.workItem,
            limit: options.limit,
          },
          { targets: 'all', registryOnly }
        );

        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        if (!registryOnly && registryItems.length === 0) {
          console.log('⚠️  registry 为空，使用命令行指定的 workspace');
        }

        if (results.length === 0) {
          console.log('未找到匹配结果');
          if (registryItems.length === 0 && registryOnly) {
            console.log('提示：请先运行 agent-handoff index --add 注册 workspace');
          }
          return;
        }

        for (const hit of results) {
          console.log(`${hit.workspaceName}\t${hit.kind}\t${hit.title}`);
          if (hit.snippet) {
            console.log(`  ${hit.snippet}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
    }
  );
