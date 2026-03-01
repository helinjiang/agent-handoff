import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';

export const initCommand = new Command('init')
  .description('创建新的 workspace')
  .argument('<name>', 'workspace 名称')
  .option('-p, --path <path>', '父目录路径', process.cwd())
  .action(async (name: string, options: { path: string }) => {
    const workspacePath = path.resolve(options.path, name);

    try {
      await fs.access(workspacePath);
      console.error(`Error: workspace "${name}" already exists at ${workspacePath}`);
      process.exit(1);
    } catch {
      // 目录不存在，继续创建
    }

    try {
      await fs.mkdir(workspacePath, { recursive: true });
      await fs.mkdir(path.join(workspacePath, 'steps'), { recursive: true });

      const workflowTemplate = `name: ${name}
steps:
  - id: clarify
    executor: trae
    input: brief.md
    output: steps/01-clarify/output.md
    acceptance:
      - 澄清需求范围与非目标
      - 产出结构化需求文档
`;

      const stateTemplate = JSON.stringify({
        currentIndex: 0,
        status: 'running',
        updatedAt: new Date().toISOString(),
      }, null, 2);

      const briefTemplate = `# brief：需求描述

## 背景
（请描述项目背景）

## 目标
（请描述本轮目标）

## 非目标
（请描述本轮不做的事情）

## 验收标准
（请描述验收标准）
`;

      await fs.writeFile(path.join(workspacePath, 'workflow.yaml'), workflowTemplate);
      await fs.writeFile(path.join(workspacePath, 'state.json'), stateTemplate);
      await fs.writeFile(path.join(workspacePath, 'brief.md'), briefTemplate);

      console.log(`✅ Created workspace "${name}" at ${workspacePath}`);
      console.log(`
Next steps:
  1. Edit brief.md to describe your requirements
  2. Run "agent-relay status ${name}" to check workspace status
  3. Run "agent-relay next ${name}" to get the first step prompt
`);
    } catch (error) {
      console.error(`Error creating workspace: ${error}`);
      process.exit(1);
    }
  });
