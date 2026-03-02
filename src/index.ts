#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './cli/commands/init.js';
import { statusCommand } from './cli/commands/status.js';
import { nextCommand } from './cli/commands/next.js';

const program = new Command();

program
  .name('agent-relay')
  .description('轻量级多 Agent 协作接力工具')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(nextCommand);

program.parse();
