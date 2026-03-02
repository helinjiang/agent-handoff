import { Command } from 'commander';
import os from 'os';
import {
  loadConfig,
  findConfigFile,
  initConfigFile,
  DEFAULT_CONFIG,
} from '../../core/config.js';

export const configCommand = new Command('config')
  .description('查看或管理配置')
  .argument('[action]', '操作: show, init', 'show')
  .option('-g, --global', '操作全局配置')
  .option('--verbose', '显示详细信息')
  .action(async (action: string, options: { global: boolean; verbose: boolean }) => {
    try {
      if (action === 'show') {
        await showConfig(options);
      } else if (action === 'init') {
        await initConfig(options);
      } else if (action === 'list') {
        await listConfig();
      } else {
        console.error(`Unknown action: ${action}`);
        console.log('Available actions: show, init, list');
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

async function showConfig(options: { global: boolean; verbose: boolean }): Promise<void> {
  const targetPath = options.global ? os.homedir() : process.cwd();
  const config = await loadConfig(targetPath);

  if (options.verbose) {
    const configFile = await findConfigFile(targetPath);
    if (configFile) {
      console.log(`Config file: ${configFile}`);
      console.log('');
    } else {
      console.log('No config file found, using defaults');
      console.log('');
    }
  }

  console.log(JSON.stringify(config, null, 2));
}

async function initConfig(options: { global: boolean; verbose: boolean }): Promise<void> {
  const targetPath = options.global ? os.homedir() : process.cwd();
  const configPath = await initConfigFile(targetPath, options.global);

  console.log(`✅ Created config file: ${configPath}`);
  console.log('');
  console.log('Default configuration:');
  console.log(JSON.stringify(DEFAULT_CONFIG, null, 2));
}

async function listConfig(): Promise<void> {
  console.log('Configuration options:');
  console.log('');
  console.log('  defaultWorkspace     - 默认 workspace 路径');
  console.log('  events.enabled       - 是否启用事件日志 (default: true)');
  console.log('  events.logStepStarted - 是否记录 step.started (default: true)');
  console.log('  events.logStepDone   - 是否记录 step.done (default: true)');
  console.log('  clipboard.autoCopy   - 是否自动复制 prompt (default: false)');
  console.log('  prompt.templatePath  - 自定义 prompt 模板路径');
  console.log('  prompt.language      - prompt 语言 (default: zh)');
  console.log('  validation.strict    - 严格校验模式 (default: false)');
  console.log('  validation.warnOnShortContent - 内容过短时警告 (default: true)');
  console.log('');
  console.log('Config file locations (in order of priority):');
  console.log('  .agenthandoffrc');
  console.log('  .agenthandoffrc.json');
  console.log('  .agenthandoffrc.yaml');
  console.log('  package.json#agenthandoff');
  console.log(`  ~/.agenthandoffrc (global)`);
}
