#!/usr/bin/env node
import { createRequire } from 'module';
import { Command } from 'commander';
import { initCommand } from './cli/commands/init.js';
import { statusCommand } from './cli/commands/status.js';
import { nextCommand } from './cli/commands/next.js';
import { validateCommand } from './cli/commands/validate.js';
import { advanceCommand } from './cli/commands/advance.js';
import { configCommand } from './cli/commands/config.js';
import { reportCommand } from './cli/commands/report.js';
import { exportCommand } from './cli/commands/export.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new Command();

program
  .name('agent-handoff')
  .description('轻量级多 Agent 协作接力工具')
  .version(version);

program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(nextCommand);
program.addCommand(validateCommand);
program.addCommand(advanceCommand);
program.addCommand(configCommand);
program.addCommand(reportCommand);
program.addCommand(exportCommand);

program.parse();
